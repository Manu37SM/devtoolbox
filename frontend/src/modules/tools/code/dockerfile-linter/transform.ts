import type { TransformResult } from "@/lib/tool-transform";
import type { DockerfileLinterOptions } from "./schema";

export type Severity = "info" | "warning" | "error";
export interface Finding { line: number; rule: string; severity: Severity; message: string }
interface Instruction { line: number; cmd: string; args: string }

/** Joins backslash continuations, drops comments and returns instructions with their starting line. */
export function parseDockerfile(text: string): Instruction[] {
  const out: Instruction[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t || t.startsWith("#")) continue;
    let full = t;
    const start = i + 1;
    let cont = full.endsWith("\\");
    if (cont) full = full.slice(0, -1).trimEnd() + " ";
    while (cont && i + 1 < lines.length) {
      i++;
      const next = lines[i]!.trim();
      if (next.startsWith("#")) continue;
      cont = next.endsWith("\\");
      full += cont ? next.slice(0, -1).trimEnd() + " " : next;
    }
    const m = /^(\w+)\s*(.*)$/.exec(full);
    if (m) out.push({ line: start, cmd: m[1]!.toUpperCase(), args: m[2]!.trim() });
  }
  return out;
}

const RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };

export function lintDockerfile(text: string): Finding[] {
  const ins = parseDockerfile(text);
  const f: Finding[] = [];
  const add = (line: number, rule: string, severity: Severity, message: string) => f.push({ line, rule, severity, message });
  if (!ins.length) return f;
  if (ins[0]!.cmd !== "FROM" && ins[0]!.cmd !== "ARG") add(ins[0]!.line, "DF001", "error", "A Dockerfile must start with FROM (only ARG may precede it).");
  let lastUser = null as Instruction | null;
  let cmdCount = 0, entryCount = 0, hasHealth = false, prevRun = false;
  const stageNames = new Set<string>();
  ins.forEach((x) => {
    const a = x.args;
    switch (x.cmd) {
      case "FROM": {
        const m = /^(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i.exec(a);
        if (m?.[2]) stageNames.add(m[2].toLowerCase());
        const image = m?.[1] ?? "";
        if (image && image !== "scratch" && !stageNames.has(image.toLowerCase()) && !image.includes("$")) {
          const tag = image.includes("@sha256:") ? "digest" : /:[^/]+$/.test(image) ? image.split(":").pop()! : "";
          if (!tag) add(x.line, "DL3006", "warning", `Image "${image}" has no tag — it defaults to :latest. Pin a version.`);
          else if (tag === "latest") add(x.line, "DL3007", "warning", `Image "${image}" uses :latest. Pin a specific version.`);
        }
        lastUser = null; cmdCount = 0; entryCount = 0;
        break;
      }
      case "MAINTAINER": add(x.line, "DL4000", "warning", "MAINTAINER is deprecated. Use LABEL org.opencontainers.image.authors instead."); break;
      case "ADD":
        if (!/^(--\S+\s+)*https?:\/\//.test(a) && !/\.(tar|tgz|tar\.gz|tar\.bz2|tar\.xz|txz)(\s|$)/.test(a.split(/\s+/).slice(0, -1).join(" ") + " ")) add(x.line, "DL3020", "warning", "Use COPY instead of ADD for plain files and folders.");
        break;
      case "CMD":
      case "ENTRYPOINT":
        if (x.cmd === "CMD") cmdCount++; else entryCount++;
        if (a && !a.startsWith("[")) add(x.line, "DL3025", "warning", `Use the JSON (exec) form for ${x.cmd} so signals reach your process: ${x.cmd} ["executable", "arg"].`);
        break;
      case "USER": lastUser = x; break;
      case "WORKDIR": if (a && !a.startsWith("/") && !/^["']?\//.test(a) && !a.startsWith("$") && !/^[A-Za-z]:/.test(a)) add(x.line, "DL3000", "error", `Use an absolute path for WORKDIR (got "${a}").`); break;
      case "HEALTHCHECK": hasHealth = true; break;
      case "EXPOSE":
        for (const p of a.split(/\s+/)) { const n = /^(\d+)(?:-(\d+))?(?:\/(tcp|udp))?$/i.exec(p); if (p.startsWith("$")) continue; if (!n || Number(n[1]) > 65535 || (n[2] && Number(n[2]) > 65535)) add(x.line, "DL3011", "error", `Invalid EXPOSE port "${p}" (valid range is 0–65535).`); }
        break;
      case "ENV":
      case "ARG":
        if (/(PASSWORD|PASSWD|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY)\w*\s*[= ]\s*[^$\s]/i.test(a)) add(x.line, "DF002", "warning", `${x.cmd} appears to hold a secret. Values are visible in image history — use BuildKit secrets or runtime env vars.`);
        break;
      case "RUN": {
        if (/\bsudo\b/.test(a)) add(x.line, "DL3004", "error", "Do not use sudo in a Dockerfile; run as the right USER instead.");
        if (/(^|[;&|]\s*)cd\s/.test(a)) add(x.line, "DL3003", "warning", "Use WORKDIR instead of `cd` in RUN.");
        if (/\bapt\s+(-\S+\s+)*(install|update|upgrade|remove)\b/.test(a)) add(x.line, "DL3027", "warning", "Use apt-get (stable CLI) rather than apt in scripts.");
        if (/\bapt-get\s+(-\S+\s+)*install\b/.test(a)) {
          if (!/--no-install-recommends|-o\s+APT::Install-Recommends=false/.test(a)) add(x.line, "DL3015", "info", "Add --no-install-recommends to apt-get install to keep the image small.");
          if (!/\bapt-get\s+(-\S+\s+)*update\b/.test(a)) add(x.line, "DF003", "warning", "apt-get install without apt-get update in the same RUN can use a stale package cache.");
          if (!/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(a)) add(x.line, "DL3009", "info", "Delete /var/lib/apt/lists/* in the same RUN layer to shrink the image.");
          if (!/\s-y\b|--yes|--assume-yes|-qq?y/.test(a)) add(x.line, "DF004", "error", "apt-get install needs -y (builds are non-interactive).");
        }
        if (/\bpip3?\s+install\b/.test(a) && !/--no-cache-dir/.test(a) && !/PIP_NO_CACHE_DIR/.test(text)) add(x.line, "DL3042", "info", "Use pip install --no-cache-dir to avoid storing the wheel cache in the layer.");
        if (/\bnpm\s+install\b/.test(a) && !/\bnpm\s+install\s+(-g|--global)\b/.test(a)) add(x.line, "DF005", "info", "Prefer `npm ci` for reproducible installs from package-lock.json.");
        if (/(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba)?sh\b/.test(a)) add(x.line, "DF006", "warning", "Piping a download into a shell runs unverified code. Download, verify a checksum, then execute.");
        if (/\b(curl|wget)\b/.test(a) && /\bchmod\s+(-R\s+)?(0?777|a\+rwx)\b/.test(a)) add(x.line, "DF007", "warning", "World-writable permissions on downloaded files; use the least privilege needed.");
        if (prevRun) add(x.line, "DL3059", "info", "Consecutive RUN instructions — consider combining them to reduce layers.");
        break;
      }
    }
    prevRun = x.cmd === "RUN";
  });
  if (cmdCount > 1) add(ins.filter((x) => x.cmd === "CMD").slice(-1)[0]!.line, "DL4003", "warning", "Multiple CMD instructions — only the last one takes effect.");
  if (entryCount > 1) add(ins.filter((x) => x.cmd === "ENTRYPOINT").slice(-1)[0]!.line, "DL4004", "warning", "Multiple ENTRYPOINT instructions — only the last one takes effect.");
  const lastFrom = [...ins].reverse().find((x) => x.cmd === "FROM");
  if (lastFrom) {
    if (!lastUser) add(lastFrom.line, "DL3002", "warning", "No USER set: the container runs as root. Add a non-root USER.");
    else if (/^root(:|$)/i.test(lastUser.args) || lastUser.args === "0") add(lastUser.line, "DL3002", "warning", "The last USER is root. Switch to a non-root user before CMD/ENTRYPOINT.");
  }
  if (!hasHealth && ins.some((x) => x.cmd === "EXPOSE")) f.push({ line: 0, rule: "DF008", severity: "info", message: "Service exposes ports but defines no HEALTHCHECK." });
  return f.sort((x, y) => x.line - y.line);
}

export function runDockerfileLinter(input: string, options: DockerfileLinterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const all = lintDockerfile(input);
  const shown = all.filter((x) => RANK[x.severity] >= RANK[options.minSeverity]);
  const count = (s: Severity) => all.filter((x) => x.severity === s).length;
  const head = `${count("error")} error(s), ${count("warning")} warning(s), ${count("info")} suggestion(s)`;
  if (!shown.length) return { output: `${head}\n\nNo findings at this severity — looks good.`, error: null };
  const rows = shown.map((x) => `${x.line ? `Line ${String(x.line).padEnd(4)}` : "General  "} ${x.severity.toUpperCase().padEnd(7)} ${x.rule.padEnd(7)} ${x.message}`);
  return { output: `${head}\n\n${rows.join("\n")}`, error: count("error") ? { message: `${count("error")} error(s) found` } : null };
}
