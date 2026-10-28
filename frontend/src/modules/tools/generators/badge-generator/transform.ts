import type { TransformResult } from "@/lib/tool-transform";
import type { BadgeGeneratorOptions } from "./schema";

/** shields.io static badge path segment: `-` -> `--`, `_` -> `__`, space -> `_`, then percent-encode. */
export function esc(s: string): string {
  return encodeURIComponent(s.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_")).replace(/%5F/gi, "_").replace(/%2D/gi, "-");
}

interface Badge { alt: string; url: string; link?: string }

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

const q = (o: BadgeGeneratorOptions, extra: string[] = []) => {
  const p = [...extra]; if (o.style !== "flat") p.push(`style=${o.style}`);
  return p.length ? `?${p.join("&")}` : "";
};

export function buildBadges(input: string, o: BadgeGeneratorOptions): Badge[] | string {
  const f = fields(input);
  const S = "https://img.shields.io";
  switch (o.kind) {
    case "static": {
      if (!f.label && !f.message) return "Add at least a label: or message: line";
      const color = (f.color ?? "blue").replace(/^#/, "");
      if (!/^[A-Za-z]+$|^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(color)) return `color "${color}" must be a name (brightgreen) or hex (ff8800)`;
      const extra = [f.logo ? `logo=${encodeURIComponent(f.logo)}` : "", f.logocolor ? `logoColor=${encodeURIComponent(f.logocolor)}` : ""].filter(Boolean);
      const path = f.label ? `${esc(f.label)}-${esc(f.message ?? "")}-${color}` : `${esc(f.message ?? "")}-${color}`;
      return [{ alt: f.label ?? f.message ?? "badge", url: `${S}/badge/${path}${q(o, extra)}`, link: f.link }];
    }
    case "github": {
      const repo = f.repo;
      if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return "Add a repo: owner/name line";
      const out: Badge[] = [
        { alt: "Release", url: `${S}/github/v/release/${repo}${q(o)}`, link: `https://github.com/${repo}/releases` },
        { alt: "License", url: `${S}/github/license/${repo}${q(o)}`, link: `https://github.com/${repo}/blob/${f.branch ?? "main"}/LICENSE` },
        { alt: "Stars", url: `${S}/github/stars/${repo}${q(o)}`, link: `https://github.com/${repo}/stargazers` },
        { alt: "Issues", url: `${S}/github/issues/${repo}${q(o)}`, link: `https://github.com/${repo}/issues` },
        { alt: "Last commit", url: `${S}/github/last-commit/${repo}${q(o)}`, link: `https://github.com/${repo}/commits` },
      ];
      if (f.workflow) out.unshift({ alt: "Build", url: `${S}/github/actions/workflow/status/${repo}/${f.workflow}${q(o, [`branch=${f.branch ?? "main"}`])}`, link: `https://github.com/${repo}/actions/workflows/${f.workflow}` });
      return out;
    }
    case "npm": {
      const p = f.package;
      if (!p || !/^(@[\w.-]+\/)?[\w.-]+$/.test(p)) return "Add a package: name line";
      return [
        { alt: "npm version", url: `${S}/npm/v/${p}${q(o)}`, link: `https://www.npmjs.com/package/${p}` },
        { alt: "npm downloads", url: `${S}/npm/dm/${p}${q(o)}`, link: `https://www.npmjs.com/package/${p}` },
        { alt: "npm license", url: `${S}/npm/l/${p}${q(o)}`, link: `https://www.npmjs.com/package/${p}` },
        { alt: "bundle size", url: `${S}/bundlephobia/minzip/${p}${q(o)}`, link: `https://bundlephobia.com/package/${p}` },
      ];
    }
    case "pypi": {
      const p = f.package;
      if (!p || !/^[\w.-]+$/.test(p)) return "Add a package: name line";
      return [
        { alt: "PyPI version", url: `${S}/pypi/v/${p}${q(o)}`, link: `https://pypi.org/project/${p}/` },
        { alt: "Python versions", url: `${S}/pypi/pyversions/${p}${q(o)}`, link: `https://pypi.org/project/${p}/` },
        { alt: "PyPI downloads", url: `${S}/pypi/dm/${p}${q(o)}`, link: `https://pypi.org/project/${p}/` },
        { alt: "License", url: `${S}/pypi/l/${p}${q(o)}`, link: `https://pypi.org/project/${p}/` },
      ];
    }
    case "maven-central": {
      const g = f.group, a = f.artifact;
      if (!g || !a) return "Add group: and artifact: lines";
      return [{ alt: "Maven Central", url: `${S}/maven-central/v/${g}/${a}${q(o)}`, link: `https://central.sonatype.com/artifact/${g}/${a}` }];
    }
  }
}

export function renderBadges(badges: Badge[], format: BadgeGeneratorOptions["format"]): string {
  return badges.map((b) => {
    switch (format) {
      case "url": return b.url;
      case "html": return b.link ? `<a href="${b.link}"><img src="${b.url.replace(/&/g, "&amp;")}" alt="${b.alt}"></a>` : `<img src="${b.url.replace(/&/g, "&amp;")}" alt="${b.alt}">`;
      case "rst": return `.. image:: ${b.url}\n   :alt: ${b.alt}${b.link ? `\n   :target: ${b.link}` : ""}`;
      default: return b.link ? `[![${b.alt}](${b.url})](${b.link})` : `![${b.alt}](${b.url})`;
    }
  }).join(format === "rst" ? "\n\n" : "\n") + "\n";
}

export function generateBadges(input: string, o: BadgeGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const b = buildBadges(input, o);
  if (typeof b === "string") return { output: "", error: { message: b } };
  return { output: renderBadges(b, o.format), error: null };
}
