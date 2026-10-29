import type { TransformResult } from "@/lib/tool-transform";
import type { MarkdownJiraConverterOptions } from "./schema";

const P = "\u0000";
/** Replace code spans with placeholders so inline rules never touch code. */
function protect(s: string, re: RegExp, render: (m: string) => string): { text: string; restore: (t: string) => string } {
  const saved: string[] = [];
  const text = s.replace(re, (_all, inner: string) => { saved.push(render(inner)); return `${P}${saved.length - 1}${P}`; });
  return { text, restore: (t) => t.replace(new RegExp(`${P}(\\d+)${P}`, "g"), (_m, i: string) => saved[Number(i)]!) };
}

export function mdInlineToJira(s: string): string {
  const { text, restore } = protect(s, /`([^`]+)`/g, (c) => `{{${c}}}`);
  let t = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt: string, url: string) => (alt ? `!${url}|alt=${alt}!` : `!${url}!`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, "[$1|$2]")
    .replace(/<(https?:\/\/[^>]+)>/g, "[$1]");
  t = t.replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, "\u0001$2\u0001");
  t = t.replace(/(^|[^\w*])\*(?=\S)([^*]+?)(?<=\S)\*(?!\w)/g, "$1_$2_").replace(/(^|[^\w])_(?=\S)([^_]+?)(?<=\S)_(?!\w)/g, "$1_$2_");
  t = t.replace(/~~(?=\S)(.+?)(?<=\S)~~/g, "-$1-").replace(/\u0001/g, "*");
  return restore(t);
}

export function mdInlineToSlack(s: string): string {
  const { text, restore } = protect(s, /`([^`]+)`/g, (c) => `\`${c}\``);
  let t = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => `<${url}|${alt || "image"}>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "<$2|$1>");
  t = t.replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, "\u0001$2\u0001");
  t = t.replace(/(^|[^\w*])\*(?=\S)([^*]+?)(?<=\S)\*(?!\w)/g, "$1_$2_");
  t = t.replace(/~~(?=\S)(.+?)(?<=\S)~~/g, "~$1~").replace(/\u0001/g, "*");
  return restore(t);
}

export function jiraInlineToMd(s: string): string {
  const { text, restore } = protect(s, /\{\{(.+?)\}\}/g, (c) => `\`${c}\``);
  let t = text
    .replace(/\{color(?::[^}]*)?\}/g, "")
    .replace(/!([^!\s|]+)(?:\|[^!]*)?!/g, "![]($1)")
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "[$1]($2)")
    .replace(/\[((?:https?|mailto):[^\]]+)\]/g, "<$1>");
  t = t.replace(/(^|[^\w*])\*(?=\S)([^*]+?)(?<=\S)\*(?!\w)/g, "$1\u0001$2\u0001");
  t = t.replace(/(^|[^\w])_(?=\S)([^_]+?)(?<=\S)_(?!\w)/g, "$1*$2*");
  t = t.replace(/(^|\s)-(?=\S)([^-\n]+?)(?<=\S)-(?=\s|$|[.,;:!?])/g, "$1~~$2~~").replace(/(^|\s)\+(?=\S)([^+\n]+?)(?<=\S)\+(?=\s|$)/g, "$1<ins>$2</ins>");
  return restore(t.replace(/\u0001/g, "**"));
}

function tableRow(line: string): string[] | null {
  const t = line.trim();
  if (!/^\|.*\|$/.test(t)) return null;
  return t.slice(1, -1).split("|").map((c) => c.trim());
}

export function mdToJira(md: string, slack = false): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const listStack: { indent: number; marker: string }[] = [];
  let inQuote = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fence = /^\s*(```|~~~)\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      for (i++; i < lines.length && !new RegExp(`^\\s*${fence[1]}\\s*$`).test(lines[i]!); i++) body.push(lines[i]!);
      out.push(slack ? "```" : fence[2] ? `{code:${fence[2]}}` : "{code}", ...body, slack ? "```" : "{code}");
      listStack.length = 0;
      continue;
    }
    const cells = tableRow(line);
    if (cells && tableRow(lines[i + 1] ?? "")?.every((c) => /^:?-{3,}:?$/.test(c))) {
      const rows = [cells];
      for (i += 2; i < lines.length && tableRow(lines[i]!); i++) rows.push(tableRow(lines[i]!)!);
      i--;
      if (slack) out.push("```", ...rows.map((r) => r.join(" | ")), "```");
      else out.push(`||${rows[0]!.map(mdInlineToJira).join("||")}||`, ...rows.slice(1).map((r) => `|${r.map(mdInlineToJira).join("|")}|`));
      continue;
    }
    const inline = slack ? mdInlineToSlack : mdInlineToJira;
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      if (slack) { out.push(`> ${inline(quote[1]!)}`); continue; }
      if (!inQuote) { out.push("{quote}"); inQuote = true; }
      out.push(inline(quote[1]!));
      if (!/^\s*>/.test(lines[i + 1] ?? "")) { out.push("{quote}"); inQuote = false; }
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { out.push(slack ? `*${mdInlineToSlack(h[2]!).replace(/\*/g, "")}*` : `h${h[1]!.length}. ${inline(h[2]!)}`); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push(slack ? "────────" : "----"); continue; }
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const indent = li[1]!.replace(/\t/g, "    ").length;
      while (listStack.length && listStack[listStack.length - 1]!.indent > indent) listStack.pop();
      const ordered = /\d/.test(li[2]!);
      const marker = ordered ? "#" : "*";
      if (!listStack.length || listStack[listStack.length - 1]!.indent < indent) listStack.push({ indent, marker });
      else listStack[listStack.length - 1]!.marker = marker;
      const text = inline(li[3]!.replace(/^\[( |x)\]\s+/i, (_m, c: string) => (c.trim() ? "(/) " : "(x) ")));
      if (slack) out.push(`${"    ".repeat(listStack.length - 1)}${ordered ? `${li[2]} ` : "• "}${text}`);
      else out.push(`${listStack.map((l) => l.marker).join("")} ${text}`);
      continue;
    }
    if (line.trim() === "") listStack.length = 0;
    out.push(inline(line));
  }
  return out.join("\n");
}

export function jiraToMd(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const code = /^\s*\{(code|noformat)(?::([^}|]*))?[^}]*\}\s*$/.exec(line);
    if (code) {
      const tag = code[1]!;
      const lang = tag === "code" && code[2] && !code[2].includes("=") ? code[2] : "";
      const body: string[] = [];
      for (i++; i < lines.length && !new RegExp(`^\\s*\\{${tag}\\}\\s*$`).test(lines[i]!); i++) body.push(lines[i]!);
      out.push(`\`\`\`${lang}`, ...body, "```");
      continue;
    }
    if (/^\s*\{quote\}\s*$/.test(line)) {
      for (i++; i < lines.length && !/^\s*\{quote\}\s*$/.test(lines[i]!); i++) out.push(`> ${jiraInlineToMd(lines[i]!)}`);
      continue;
    }
    const h = /^h([1-6])\.\s+(.*)$/.exec(line);
    if (h) { out.push(`${"#".repeat(Number(h[1]))} ${jiraInlineToMd(h[2]!)}`); continue; }
    const bq = /^bq\.\s+(.*)$/.exec(line);
    if (bq) { out.push(`> ${jiraInlineToMd(bq[1]!)}`); continue; }
    if (/^-{4,}\s*$/.test(line)) { out.push("---"); continue; }
    if (/^\|\|.*\|\|\s*$/.test(line)) {
      const head = line.trim().replace(/^\|\||\|\|$/g, "").split("||").map((c) => jiraInlineToMd(c.trim()));
      out.push(`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`);
      continue;
    }
    if (/^\|.*\|\s*$/.test(line)) { out.push(`| ${line.trim().slice(1, -1).split("|").map((c) => jiraInlineToMd(c.trim())).join(" | ")} |`); continue; }
    const li = /^([*#-]+)\s+(.*)$/.exec(line);
    if (li) {
      const markers = li[1]!;
      const ordered = markers.endsWith("#");
      const parentIndent = [...markers.slice(0, -1)].reduce((n, m) => n + (m === "#" ? 3 : 2), 0);
      out.push(`${" ".repeat(parentIndent)}${ordered ? "1." : "-"} ${jiraInlineToMd(li[2]!)}`);
      continue;
    }
    out.push(jiraInlineToMd(line));
  }
  return out.join("\n");
}

export function runMarkdownJiraConverter(input: string, options: MarkdownJiraConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const output = options.direction === "jira-to-md" ? jiraToMd(input) : mdToJira(input, options.direction === "md-to-slack");
  return { output, error: null };
}
