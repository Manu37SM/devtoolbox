import type { TransformResult } from "@/lib/tool-transform";
import type { LogrotateConfigGeneratorOptions } from "./schema";

const SIZE = /^\d+[kKmMgG]?$/;
const NAME = /^[a-z_][a-z0-9_.-]*\$?$/i;
const MODE = /^[0-7]{3,4}$/;

export function logrotateConfigGenerator(input: string, options: Partial<LogrotateConfigGeneratorOptions>): TransformResult {
  const o: LogrotateConfigGeneratorOptions = {
    frequency: options.frequency ?? "daily", rotate: options.rotate ?? 14, compress: options.compress ?? "gzip", delayCompress: options.delayCompress ?? true,
    missingOk: options.missingOk ?? true, notIfEmpty: options.notIfEmpty ?? true, method: options.method ?? "create", createMode: options.createMode ?? "0640",
    createUser: options.createUser ?? "", createGroup: options.createGroup ?? "", dateExt: options.dateExt ?? false, dateFormat: options.dateFormat ?? "-%Y%m%d",
    maxSize: options.maxSize ?? "", minSize: options.minSize ?? "", maxAge: options.maxAge ?? 0, suUser: options.suUser ?? "", suGroup: options.suGroup ?? "",
    shared: options.shared ?? false, postrotate: options.postrotate ?? "", prerotate: options.prerotate ?? "", olddir: options.olddir ?? "",
  };
  const paths = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (paths.length === 0) return { output: "", error: null };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });

  for (const p of paths) {
    if (!p.startsWith("/") && !p.startsWith("*")) return fail(`"${p}" must be an absolute path (logrotate ignores relative paths).`);
    if (/[\s"'{}]/.test(p)) return fail(`"${p}" contains whitespace, quotes or braces; list one plain path or glob per line.`);
  }
  if (o.maxSize && !SIZE.test(o.maxSize)) return fail(`Max size "${o.maxSize}" is not a size such as 100M, 512k or 1G.`);
  if (o.minSize && !SIZE.test(o.minSize)) return fail(`Min size "${o.minSize}" is not a size such as 100M, 512k or 1G.`);
  if (o.method === "create" && !MODE.test(o.createMode)) return fail(`Mode "${o.createMode}" must be 3–4 octal digits, e.g. 0640.`);
  for (const [label, v] of [["create user", o.createUser], ["create group", o.createGroup], ["su user", o.suUser], ["su group", o.suGroup]] as const)
    if (v && !NAME.test(v)) return fail(`The ${label} "${v}" is not a valid user/group name.`);
  if (o.createGroup && !o.createUser) return fail("A create group needs a create user (logrotate takes mode owner group in that order).");
  if (o.suGroup && !o.suUser) return fail("An su group needs an su user.");
  if (o.dateExt && !/^[-._A-Za-z0-9%]+$/.test(o.dateFormat)) return fail("Date format may only contain letters, digits, - . _ and % codes.");
  if (o.olddir && !o.olddir.startsWith("/")) return fail("olddir must be an absolute path.");

  const warnings: string[] = [];
  if (o.rotate === 0) warnings.push("rotate 0 deletes old logs immediately instead of keeping any.");
  if (o.method === "copytruncate") warnings.push("copytruncate can lose lines written between the copy and the truncate; prefer create + a postrotate reload when the service supports it.");
  if (o.method === "none" && !o.postrotate) warnings.push("Without create/copytruncate or a postrotate hook the service may keep writing to the rotated file.");
  if (o.maxSize && o.frequency !== "daily") warnings.push("maxsize is checked only when logrotate runs (daily by default); a weekly/monthly schedule with maxsize still rotates early only on a run.");
  if (o.delayCompress && o.compress === "none") warnings.push("delaycompress has no effect without compression.");

  const L: string[] = [];
  L.push(...(warnings.length ? warnings.map((w) => `# NOTE: ${w}`) : []));
  L.push(`${paths.join(" ")} {`);
  const add = (s: string) => L.push(`    ${s}`);
  add(o.frequency);
  add(`rotate ${o.rotate}`);
  if (o.maxAge) add(`maxage ${o.maxAge}`);
  if (o.maxSize) add(`maxsize ${o.maxSize}`);
  if (o.minSize) add(`minsize ${o.minSize}`);
  if (o.compress !== "none") {
    add("compress");
    if (o.compress !== "gzip") {
      const bin = o.compress;
      const un = o.compress === "bzip2" ? "bunzip2" : o.compress === "xz" ? "unxz" : "unzstd";
      const ext = o.compress === "bzip2" ? "bz2" : o.compress === "zstd" ? "zst" : "xz";
      add(`compresscmd /usr/bin/${bin}`);
      add(`uncompresscmd /usr/bin/${un}`);
      add(`compressext .${ext}`);
    }
    if (o.delayCompress) add("delaycompress");
  } else add("nocompress");
  add(o.missingOk ? "missingok" : "nomissingok");
  add(o.notIfEmpty ? "notifempty" : "ifempty");
  if (o.method === "copytruncate") add("copytruncate");
  else if (o.method === "create") add(`create ${o.createMode}${o.createUser ? ` ${o.createUser}` : ""}${o.createGroup ? ` ${o.createGroup}` : ""}`);
  else add("nocreate");
  if (o.dateExt) { add("dateext"); add(`dateformat ${o.dateFormat}`); }
  if (o.suUser) add(`su ${o.suUser}${o.suGroup ? ` ${o.suGroup}` : ""}`);
  if (o.olddir) add(`olddir ${o.olddir}`);
  if (o.shared || o.postrotate || o.prerotate) add(o.shared ? "sharedscripts" : "nosharedscripts");
  const script = (kw: string, body: string) => {
    const lines = body.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) return;
    add(kw);
    lines.forEach((l) => add(`    ${l.trim()}`));
    add("endscript");
  };
  script("prerotate", o.prerotate);
  script("postrotate", o.postrotate);
  L.push("}");
  return { output: L.join("\n") + "\n", error: null };
}
