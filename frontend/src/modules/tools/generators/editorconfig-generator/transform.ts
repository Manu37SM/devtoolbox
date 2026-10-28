import type { TransformResult } from "@/lib/tool-transform";
import type { EditorconfigGeneratorOptions } from "./schema";

const GLOBS: Record<string, string> = {
  java: "*.java", js: "*.{js,jsx,ts,tsx,mjs,cjs}", py: "*.py", go: "*.go", rs: "*.rs", md: "*.md", yaml: "*.{yml,yaml}", json: "*.json", make: "Makefile", bat: "*.{bat,cmd}", sh: "*.sh",
};
const OVERRIDES: Record<string, string[]> = {
  java: ["indent_size = 4"], py: ["indent_size = 4"], go: ["indent_style = tab"], rs: ["indent_size = 4"], md: ["trim_trailing_whitespace = false"], make: ["indent_style = tab"], bat: ["end_of_line = crlf"], sh: ["end_of_line = lf"],
};

/** Input: comma/space/newline separated language keys (java js py go rs md yaml json make bat sh). Empty input is fine. */
export function generateEditorconfig(input: string, o: EditorconfigGeneratorOptions): TransformResult {
  const langs = input.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const unknown = langs.find((l) => !GLOBS[l]);
  if (unknown) return { output: "", error: { message: `Unknown language "${unknown}". Available: ${Object.keys(GLOBS).join(", ")}` } };
  const base = [
    `indent_style = ${o.indentStyle}`,
    ...(o.indentStyle === "space" ? [`indent_size = ${o.indentSize}`] : [`tab_width = ${o.indentSize}`]),
    `end_of_line = ${o.endOfLine}`,
    `charset = ${o.charset}`,
    `trim_trailing_whitespace = ${o.trimTrailing}`,
    `insert_final_newline = ${o.finalNewline}`,
    ...(o.maxLineLength > 0 ? [`max_line_length = ${o.maxLineLength}`] : []),
  ];
  const out = ["root = true", "", "[*]", ...base];
  if (o.perLanguage) {
    for (const l of [...new Set(langs)]) {
      const ov = OVERRIDES[l];
      if (!ov) continue;
      out.push("", `[${GLOBS[l]}]`, ...ov.map((x) => (o.indentStyle === "tab" && x.startsWith("indent_size") ? x.replace("indent_size", "tab_width") : x)));
    }
  }
  return { output: out.join("\n") + "\n", error: null };
}
