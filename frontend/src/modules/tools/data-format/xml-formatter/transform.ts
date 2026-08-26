import { parseXml, serializeXml } from "../xml-core";
import type { XmlFormatterOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function formatXml(input: string, options: XmlFormatterOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    const element = parseXml(input);
    return { output: serializeXml(element, options.indent), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Invalid XML" } };
  }
}
