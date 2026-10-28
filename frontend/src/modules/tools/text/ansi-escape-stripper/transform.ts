import type { TransformResult } from "@/lib/tool-transform";
import type { AnsiEscapeStripperOptions } from "./schema";

// CSI (ESC [ ... final), OSC (ESC ] ... BEL|ST), and two-char escapes
const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]|${ESC}\\][^\\x07${ESC}]*(?:\\x07|${ESC}\\\\)|${ESC}[@-Z\\\\-_]`, "g");

// A "literal ^[" or \e / \x1b / \033 as copied from terminals and logs
const LITERAL = /(?:\\x1[bB]|\\033|\\e|\\u001[bB]|\^\[)(?=\[|\])/g;

export const stripAnsi = (s: string) => s.replace(ANSI, "");

const COLORS = ["#000", "#c33", "#2a2", "#aa2", "#33c", "#a3a", "#2aa", "#ccc"];
const BRIGHT = ["#555", "#f55", "#5f5", "#ff5", "#55f", "#f5f", "#5ff", "#fff"];
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toHtml(s: string): string {
  let out = "";
  let last = 0;
  const st = { b: false, i: false, u: false, fg: "", bg: "" };
  let open = false;
  const emit = () => {
    if (open) out += "</span>";
    const css = [st.b && "font-weight:bold", st.i && "font-style:italic", st.u && "text-decoration:underline", st.fg && `color:${st.fg}`, st.bg && `background:${st.bg}`].filter(Boolean).join(";");
    open = !!css;
    if (open) out += `<span style="${css}">`;
  };
  for (const m of s.matchAll(new RegExp(`${ESC}\\[([0-9;]*)m`, "g"))) {
    out += esc(stripAnsi(s.slice(last, m.index)));
    last = m.index! + m[0].length;
    const codes = (m[1] || "0").split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i]!;
      if (c === 0) Object.assign(st, { b: false, i: false, u: false, fg: "", bg: "" });
      else if (c === 1) st.b = true; else if (c === 3) st.i = true; else if (c === 4) st.u = true;
      else if (c === 22) st.b = false; else if (c === 23) st.i = false; else if (c === 24) st.u = false;
      else if (c >= 30 && c <= 37) st.fg = COLORS[c - 30]!;
      else if (c >= 90 && c <= 97) st.fg = BRIGHT[c - 90]!;
      else if (c >= 40 && c <= 47) st.bg = COLORS[c - 40]!;
      else if (c >= 100 && c <= 107) st.bg = BRIGHT[c - 100]!;
      else if (c === 39) st.fg = ""; else if (c === 49) st.bg = "";
      else if ((c === 38 || c === 48) && codes[i + 1] === 2) { const col = `rgb(${codes[i + 2] ?? 0},${codes[i + 3] ?? 0},${codes[i + 4] ?? 0})`; if (c === 38) st.fg = col; else st.bg = col; i += 4; }
      else if ((c === 38 || c === 48) && codes[i + 1] === 5) { const n = codes[i + 2] ?? 0; const col = n < 8 ? COLORS[n]! : n < 16 ? BRIGHT[n - 8]! : n < 232 ? `rgb(${[Math.floor((n - 16) / 36), Math.floor(((n - 16) % 36) / 6), (n - 16) % 6].map((v) => (v ? 55 + v * 40 : 0)).join(",")})` : `rgb(${8 + (n - 232) * 10},${8 + (n - 232) * 10},${8 + (n - 232) * 10})`; if (c === 38) st.fg = col; else st.bg = col; i += 2; }
    }
    emit();
  }
  out += esc(stripAnsi(s.slice(last)));
  if (open) out += "</span>";
  return out;
}

export function inspect(s: string): string {
  const seqs = new Map<string, number>();
  for (const m of s.matchAll(ANSI)) seqs.set(m[0], (seqs.get(m[0]) ?? 0) + 1);
  if (!seqs.size) return "No ANSI escape sequences found.";
  return [`${[...seqs.values()].reduce((a, b) => a + b, 0)} escape sequence(s), ${seqs.size} distinct:`, ...[...seqs.entries()].map(([k, n]) => `  ${String(n).padStart(4)}×  ESC${JSON.stringify(k.slice(1)).slice(1, -1)}   ${describe(k)}`)].join("\n");
}

function describe(seq: string): string {
  const m = new RegExp(`^${ESC}\\[([0-9;]*)([A-Za-z])$`).exec(seq);
  if (!m) return seq.startsWith(`${ESC}]`) ? "OSC (title / hyperlink)" : "escape";
  const [, p, f] = m;
  if (f === "m") return "SGR: " + (p || "0").split(";").map((c) => ({ "0": "reset", "1": "bold", "3": "italic", "4": "underline", "22": "normal intensity", "39": "default fg", "49": "default bg" } as Record<string, string>)[c] ?? (+c >= 30 && +c <= 37 ? `fg ${c}` : +c >= 40 && +c <= 47 ? `bg ${c}` : +c >= 90 && +c <= 97 ? `bright fg ${c}` : c)).join(", ");
  return ({ A: "cursor up", B: "cursor down", C: "cursor forward", D: "cursor back", H: "cursor position", J: "erase display", K: "erase line", l: "reset mode", h: "set mode" } as Record<string, string>)[f!] ?? `CSI ${f}`;
}

export function runAnsi(input: string, o: AnsiEscapeStripperOptions): TransformResult {
  if (!input) return { output: "", error: null };
  const s = input.replace(LITERAL, ESC);
  if (o.mode === "inspect") return { output: inspect(s), error: null };
  let out = o.mode === "html" ? toHtml(s) : stripAnsi(s);
  if (o.stripCarriageReturns) out = out.replace(/\r\n/g, "\n");
  return { output: o.mode === "html" ? `<pre style="background:#111;color:#ddd;padding:8px">${out}</pre>` : out, error: null };
}
