import type { TransformResult } from "@/lib/tool-transform";
import type { AsciiTreeGeneratorOptions } from "./schema";

interface TreeNode {
  name: string;
  dir: boolean;
  children: TreeNode[];
}

type Format = "paths" | "indent" | "tree";

const CONNECTOR = /(├──|└──|├─|└─|\|--|`--|\+--|\\--)\s?/;
const SUMMARY_LINE = /^\d+ director(?:y|ies)(?:, \d+ files?)?$/;

function child(parent: TreeNode[], name: string): TreeNode {
  let n = parent.find((c) => c.name === name);
  if (!n) {
    n = { name, dir: false, children: [] };
    parent.push(n);
  }
  return n;
}

function parsePaths(lines: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const raw of lines) {
    let p = raw.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
    if (!p) continue;
    const trailing = p.endsWith("/");
    p = p.replace(/\/+$/, "");
    const parts = p.split("/").filter((x) => x && x !== ".");
    let level = root;
    parts.forEach((part, i) => {
      const n = child(level, part);
      if (i < parts.length - 1 || trailing) n.dir = true;
      level = n.children;
    });
  }
  return root;
}

function parseIndent(lines: string[]): TreeNode[] {
  const rows: { indent: number; text: string }[] = [];
  let unit = 0;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const m = /^([ \t]*)(.*)$/.exec(raw.replace(/\r$/, ""))!;
    const lead = m[1] ?? "";
    const tabs = (lead.match(/\t/g) ?? []).length;
    const spaces = lead.length - tabs;
    const text = (m[2] ?? "").replace(/^[-*+]\s+/, "").trim();
    rows.push({ indent: tabs * 1000 + spaces, text });
    if (spaces > 0 && (unit === 0 || spaces < unit)) unit = spaces;
  }
  const root: TreeNode[] = [];
  const stack: TreeNode[][] = [root];
  let prevLevel = 0;
  for (const r of rows) {
    const tabs = Math.floor(r.indent / 1000);
    const spaces = r.indent % 1000;
    let level = tabs + (unit ? Math.round(spaces / unit) : 0);
    level = Math.max(0, Math.min(level, prevLevel + 1, stack.length));
    const slash = r.text.endsWith("/");
    const name = r.text.replace(/\/+$/, "");
    if (!name) continue;
    const siblings = stack[level] ?? root;
    const n = child(siblings, name);
    if (slash) n.dir = true;
    if (level > 0) {
      // a parent that has children is a directory
      const parent = stack[level - 1];
      const owner = parent?.[parent.length - 1];
      if (owner) owner.dir = true;
    }
    stack.length = level + 1;
    stack[level + 1] = n.children;
    prevLevel = level;
  }
  return root;
}

function parseTree(lines: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: TreeNode[][] = [root];
  for (const raw of lines) {
    const line = raw.replace(/ /g, " ").replace(/\r$/, "");
    if (!line.trim() || SUMMARY_LINE.test(line.trim())) continue;
    const m = CONNECTOR.exec(line);
    let level = 0;
    let text = line.trim();
    if (m) {
      level = Math.floor(m.index / 4) + 1;
      text = line.slice(m.index + m[0].length).trim();
    }
    const slash = text.endsWith("/");
    const name = text.replace(/\/+$/, "").replace(/ -> .*$/, "");
    if (!name) continue;
    level = Math.min(level, stack.length - 1);
    const n: TreeNode = { name, dir: slash, children: [] };
    stack[level]!.push(n);
    if (level > 0) {
      const parent = stack[level - 1] ?? [];
      const owner = parent[parent.length - 1];
      if (owner) owner.dir = true;
    }
    stack.length = level + 1;
    stack[level + 1] = n.children;
  }
  return root;
}

function detect(lines: string[]): Format {
  const used = lines.filter((l) => l.trim());
  if (used.some((l) => CONNECTOR.test(l.replace(/ /g, " ")))) return "tree";
  if (used.some((l) => /^[ \t]+\S/.test(l))) return "indent";
  return "paths";
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function arrange(nodes: TreeNode[], sort: AsciiTreeGeneratorOptions["sort"]): TreeNode[] {
  let out = nodes.slice();
  if (sort === "alpha") out.sort((a, b) => collator.compare(a.name, b.name));
  if (sort === "folders-first") {
    out.sort((a, b) => Number(isDir(b)) - Number(isDir(a)) || collator.compare(a.name, b.name));
  }
  out = out.map((n) => ({ ...n, children: arrange(n.children, sort) }));
  return out;
}

const isDir = (n: TreeNode) => n.dir || n.children.length > 0;

function prune(nodes: TreeNode[], depth: number, max: number): TreeNode[] {
  if (max > 0 && depth >= max) return [];
  return nodes.map((n) => ({ ...n, dir: isDir(n), children: prune(n.children, depth + 1, max) }));
}

function label(n: TreeNode, slash: boolean): string {
  return isDir(n) && slash ? `${n.name}/` : n.name;
}

function count(nodes: TreeNode[]): { dirs: number; files: number } {
  let dirs = 0;
  let files = 0;
  for (const n of nodes) {
    if (isDir(n)) dirs++;
    else files++;
    const c = count(n.children);
    dirs += c.dirs;
    files += c.files;
  }
  return { dirs, files };
}

function renderChildren(nodes: TreeNode[], prefix: string, o: Required<AsciiTreeGeneratorOptions>, out: string[]): void {
  const u = o.charset === "unicode";
  const tee = u ? "├── " : "|-- ";
  const last = u ? "└── " : "`-- ";
  const bar = u ? "│   " : "|   ";
  nodes.forEach((n, i) => {
    const isLast = i === nodes.length - 1;
    out.push(prefix + (isLast ? last : tee) + label(n, o.trailingSlash));
    renderChildren(n.children, prefix + (isLast ? "    " : bar), o, out);
  });
}

function flatPaths(nodes: TreeNode[], base: string, out: string[]): void {
  for (const n of nodes) {
    const p = base ? `${base}/${n.name}` : n.name;
    if (n.children.length) flatPaths(n.children, p, out);
    else out.push(isDir(n) ? `${p}/` : p);
  }
}

function markdown(nodes: TreeNode[], depth: number, slash: boolean, out: string[]): void {
  for (const n of nodes) {
    out.push(`${"  ".repeat(depth)}- ${label(n, slash)}`);
    markdown(n.children, depth + 1, slash, out);
  }
}

function toJson(nodes: TreeNode[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const n of nodes) o[n.name] = isDir(n) ? toJson(n.children) : null;
  return o;
}

export function buildAsciiTree(input: string, options: Partial<AsciiTreeGeneratorOptions>): TransformResult {
  const o: Required<AsciiTreeGeneratorOptions> = {
    inputFormat: options.inputFormat ?? "auto",
    output: options.output ?? "tree",
    charset: options.charset ?? "unicode",
    sort: options.sort ?? "none",
    trailingSlash: options.trailingSlash ?? true,
    rootName: options.rootName ?? "",
    maxDepth: options.maxDepth ?? 0,
    summary: options.summary ?? false,
  };
  if (!input.trim()) return { output: "", error: null };
  const lines = input.split("\n");
  const format: Format = o.inputFormat === "auto" ? detect(lines) : o.inputFormat;
  let nodes = format === "tree" ? parseTree(lines) : format === "indent" ? parseIndent(lines) : parsePaths(lines);
  if (!nodes.length) return { output: "", error: { message: "No entries found in the input." } };

  // "tree" prints "." as the root; drop it so it is not part of every path.
  let implicitRoot = "";
  const only = nodes[0];
  if (nodes.length === 1 && only && only.name === "." && only.children.length) {
    implicitRoot = ".";
    nodes = only.children;
  }
  nodes = arrange(nodes, o.sort);

  let root = o.rootName.trim();
  if (!root) root = implicitRoot;
  let top = nodes;
  if (!root) {
    const solo = nodes[0];
    if (nodes.length === 1 && solo && isDir(solo)) {
      root = solo.name;
      top = solo.children;
    } else root = ".";
  }
  const limited = prune(top, 0, o.maxDepth);
  const out: string[] = [];

  if (o.output === "tree") {
    out.push(root);
    renderChildren(limited, "", o, out);
    if (o.summary) {
      const c = count(limited);
      out.push("", `${c.dirs} ${c.dirs === 1 ? "directory" : "directories"}, ${c.files} ${c.files === 1 ? "file" : "files"}`);
    }
  } else if (o.output === "paths") {
    flatPaths(limited, root === "." ? "" : root, out);
  } else if (o.output === "markdown") {
    out.push(`- ${o.trailingSlash && root !== "." ? `${root}/` : root}`);
    markdown(limited, 1, o.trailingSlash, out);
  } else {
    return { output: JSON.stringify(root === "." ? toJson(limited) : { [root]: toJson(limited) }, null, 2), error: null };
  }
  return { output: out.join("\n"), error: null };
}
