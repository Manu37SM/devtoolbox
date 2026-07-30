import { parseXml, serializeXml, xmlToJsonValue, jsonValueToXml } from "../xml-core";
import type { JsonXmlOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function convertJsonXml(input: string, options: JsonXmlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "json-to-xml") {
      const parsed: unknown = JSON.parse(input);
      const element = jsonValueToXml(options.rootName, parsed);
      return { output: serializeXml(element, options.indent), error: null };
    }

    const element = parseXml(input);
    const value = xmlToJsonValue(element);
    return { output: JSON.stringify(value, null, options.indent), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Conversion failed" } };
  }
}
