import type { TransformResult } from "@/lib/tool-transform";
import type { ListConverterOptions } from "./schema";

const DELIMITERS: Record<ListConverterOptions["delimiter"], string> = {
  comma: ",",
  "comma-space": ", ",
  semicolon: ";",
  pipe: "|",
  tab: "\t",
  space: " ",
  newline: "\n",
};

const ORACLE_IN_LIMIT = 1000;

function quoteItem(item: string, quote: ListConverterOptions["quote"]): string {
  switch (quote) {
    case "single":
      return `'${item.replace(/'/g, "''")}'`; // SQL-style doubling
    case "double":
      return JSON.stringify(item);
    case "backtick":
      return `\`${item.replace(/`/g, "\\`")}\``;
    default:
      return item;
  }
}

function unquoteItem(item: string): string {
  const m = /^(['"`])([\s\S]*)\1$/.exec(item);
  if (!m) return item;
  return m[1] === "'" ? m[2]!.replace(/''/g, "'") : m[2]!;
}

export function toItems(input: string, options: ListConverterOptions): string[] {
  let items: string[];
  if (options.mode === "lines-to-list") {
    items = input.split(/\r?\n/);
  } else {
    const stripped = input.trim().replace(/^(?:IN\s*)?[[(]/i, "").replace(/[\])]$/, "");
    items = stripped.split(/\s*[,;|\t\n]\s*/);
    items = items.map(unquoteItem);
  }
  if (options.trim) items = items.map((s) => s.trim());
  if (options.skipEmpty) items = items.filter((s) => s.length > 0);
  if (options.dedupe) items = Array.from(new Set(items));
  if (options.sort !== "none") {
    const numeric = items.every((s) => s !== "" && Number.isFinite(Number(s)));
    items = [...items].sort((x, y) => (numeric ? Number(x) - Number(y) : x.localeCompare(y)));
    if (options.sort === "desc") items.reverse();
  }
  return items;
}

export function convertList(input: string, options: ListConverterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  const items = toItems(input, options);

  if (options.mode === "list-to-lines") return { output: items.join("\n"), error: null };

  const quoted = items.map((s) => quoteItem(s, options.quote));
  const delimiter = DELIMITERS[options.delimiter];

  switch (options.wrapper) {
    case "json-array":
      return { output: JSON.stringify(items), error: null };
    case "brackets":
      return { output: `[${quoted.join(delimiter)}]`, error: null };
    case "parens":
      return { output: `(${quoted.join(delimiter)})`, error: null };
    case "sql-in": {
      const chunks: string[] = [];
      for (let i = 0; i < quoted.length; i += ORACLE_IN_LIMIT) {
        chunks.push(`(${quoted.slice(i, i + ORACLE_IN_LIMIT).join(delimiter)})`);
      }
      if (chunks.length <= 1) return { output: chunks[0] ?? "()", error: null };
      const note = `-- ${quoted.length} values split into ${chunks.length} lists: Oracle rejects IN lists over ${ORACLE_IN_LIMIT} (ORA-01795).\n-- Use: col IN <list 1> OR col IN <list 2> ...\n`;
      return { output: note + chunks.join("\n"), error: null };
    }
    default:
      return { output: quoted.join(delimiter), error: null };
  }
}
