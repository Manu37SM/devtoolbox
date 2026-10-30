import { parseXml, serializeXml, xmlToJsonValue, jsonValueToXml } from "../xml-core";
import type { JsonXmlOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

const DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

export function convertJsonXml(input: string, options: JsonXmlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  const prefix = options.attributePrefix ?? "@_";

  try {
    if (options.mode === "json-to-xml") {
      let parsed: unknown = JSON.parse(input);
      // A top-level array has no key to repeat, so its items become <item> elements.
      if (Array.isArray(parsed)) parsed = { item: parsed };
      const element = jsonValueToXml(options.rootName, renameAttributes(parsed, prefix, "@_"));
      const xml = serializeXml(element, options.indent);
      return { output: options.xmlDeclaration ? `${DECLARATION}\n${xml}` : xml, error: null };
    }

    const element = parseXml(input);
    let value = renameAttributes(xmlToJsonValue(element), "@_", prefix);
    if (options.coerceTypes) value = coerce(value);
    return { output: JSON.stringify(value, null, options.indent), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Conversion failed" } };
  }
}

function renameAttributes(value: unknown, from: string, to: string): unknown {
  if (from === to) return value;
  if (Array.isArray(value)) return value.map((v) => renameAttributes(v, from, to));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k.startsWith(from) && k !== "#text" ? to + k.slice(from.length) : k,
        renameAttributes(v, from, to),
      ]),
    );
  }
  return value;
}

/** Numbers keep leading-zero codes ("007", PINs) and unsafe integers as strings. */
function coerce(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerce);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, coerce(v)]));
  }
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (Number.isInteger(n) && !Number.isSafeInteger(n)) return value;
    if (String(n) === value) return n;
  }
  return value;
}
