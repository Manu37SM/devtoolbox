import { dump } from "js-yaml";
import { parseJsonLossless, type JNode } from "@/lib/json-lossless";

/** Output preferences shared by the tools that write YAML. */
export interface YamlDumpPrefs {
  indent: number;
  sortKeys?: boolean;
  /** "auto" quotes only where YAML needs it. */
  quoteStyle?: "auto" | "single" | "double";
  /** Indent list items under their parent key (default true; false gives the compact "key:\n- a" style). */
  indentSequences?: boolean;
}

export function dumpYaml(value: unknown, prefs: YamlDumpPrefs): string {
  const quote = prefs.quoteStyle ?? "auto";
  return dump(value, {
    indent: prefs.indent,
    lineWidth: -1,
    noRefs: true,
    sortKeys: prefs.sortKeys ?? false,
    // js-yaml 5 option names (v4 called these noArrayIndent and quotingType).
    seqNoIndent: prefs.indentSequences === false,
    forceQuotes: quote !== "auto",
    quoteStyle: quote === "double" ? "double" : "single",
  });
}

const TOKEN = "__dtb_raw_number_";

/**
 * Converts JSON text to YAML without rounding numbers: values that a JS number
 * cannot hold exactly travel through js-yaml as placeholder strings and are
 * written back verbatim.
 */
export function jsonToYaml(json: string, prefs: YamlDumpPrefs): string {
  const raws: string[] = [];
  const toValue = (n: JNode): unknown => {
    switch (n.kind) {
      case "object":
        return Object.fromEntries(n.entries.map(([k, v]) => [k, toValue(v)]));
      case "array":
        return n.items.map(toValue);
      case "string":
        return n.value;
      case "number": {
        const num = Number(n.raw);
        if (Number.isFinite(num) && String(num) === n.raw) return num;
        raws.push(n.raw);
        return `${TOKEN}${raws.length - 1}__`;
      }
      default:
        return n.value;
    }
  };
  const text = dumpYaml(toValue(parseJsonLossless(json)), prefs);
  if (raws.length === 0) return text;
  return text.replace(new RegExp(`(['"]?)${TOKEN}(\\d+)__\\1`, "g"), (_, _q, i: string) => raws[Number(i)]!);
}
