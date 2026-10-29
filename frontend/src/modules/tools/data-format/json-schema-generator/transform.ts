import type { JsonSchemaGeneratorOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type JsonSchemaNode = Record<string, unknown>;

const SCHEMA_URI: Record<JsonSchemaGeneratorOptions["draft"], string> = {
  "draft-07": "http://json-schema.org/draft-07/schema#",
  "2019-09": "https://json-schema.org/draft/2019-09/schema",
  "2020-12": "https://json-schema.org/draft/2020-12/schema",
};

export function generateJsonSchema(input: string, options: JsonSchemaGeneratorOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid JSON" },
    };
  }

  const schema: JsonSchemaNode = {
    $schema: SCHEMA_URI[options.draft ?? "draft-07"],
    ...inferSchema(parsed, options),
  };

  return { output: JSON.stringify(schema, null, 2), error: null };
}

const FORMATS: Array<[string, RegExp]> = [
  ["date-time", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/],
  ["date", /^\d{4}-\d{2}-\d{2}$/],
  ["time", /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/],
  ["email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  ["uri", /^[a-z][a-z0-9+.-]*:\/\/\S+$/i],
  ["ipv4", /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/],
  ["ipv6", /^[0-9a-f]*:[0-9a-f:]+$/i],
];

function inferSchema(value: unknown, options: JsonSchemaGeneratorOptions): JsonSchemaNode {
  if (value === null) return { type: "null" };

  if (Array.isArray(value)) {
    const node: JsonSchemaNode = { type: "array" };
    if (value.length > 0) {
      // Merge every element so optional fields and mixed types are not lost.
      node.items = value.map((v) => inferSchema(v, options)).reduce((a, b) => mergeSchemas(a, b, options));
    }
    return node;
  }

  switch (typeof value) {
    case "string": {
      const node: JsonSchemaNode = { type: "string" };
      if (options.detectFormats) {
        const format = FORMATS.find(([, re]) => re.test(value))?.[0];
        if (format) node.format = format;
      }
      if (options.includeExamples) node.examples = [value];
      return node;
    }
    case "number": {
      const node: JsonSchemaNode = { type: Number.isInteger(value) ? "integer" : "number" };
      if (options.includeExamples) node.examples = [value];
      return node;
    }
    case "boolean":
      return options.includeExamples ? { type: "boolean", examples: [value] } : { type: "boolean" };
    case "object": {
      const obj = value as Record<string, unknown>;
      const properties: JsonSchemaNode = {};
      const keys = Object.keys(obj);
      for (const key of keys) {
        properties[key] = inferSchema(obj[key], options);
      }
      const node: JsonSchemaNode = { type: "object", properties };
      if (options.allRequired && keys.length > 0) {
        node.required = keys;
      }
      if (options.forbidAdditional) node.additionalProperties = false;
      return node;
    }
    default:
      return {};
  }
}

function typesOf(node: JsonSchemaNode): string[] {
  const t = node.type;
  return Array.isArray(t) ? (t as string[]) : typeof t === "string" ? [t] : [];
}

/** Combines the schemas of two samples of the same position (array elements). */
function mergeSchemas(a: JsonSchemaNode, b: JsonSchemaNode, options: JsonSchemaGeneratorOptions): JsonSchemaNode {
  const ta = typesOf(a);
  const tb = typesOf(b);
  if (ta.length === 1 && tb.length === 1 && ta[0] === "object" && tb[0] === "object") {
    const pa = a.properties as JsonSchemaNode;
    const pb = b.properties as JsonSchemaNode;
    const properties: JsonSchemaNode = { ...pa };
    for (const [k, v] of Object.entries(pb)) {
      properties[k] = k in pa ? mergeSchemas(pa[k] as JsonSchemaNode, v as JsonSchemaNode, options) : v;
    }
    const node: JsonSchemaNode = { type: "object", properties };
    const ra = (a.required as string[] | undefined) ?? [];
    const rb = new Set((b.required as string[] | undefined) ?? []);
    const required = ra.filter((k) => rb.has(k));
    if (options.allRequired && required.length > 0) node.required = required;
    if (options.forbidAdditional) node.additionalProperties = false;
    return node;
  }
  if (ta.length === 1 && tb.length === 1 && ta[0] === "array" && tb[0] === "array") {
    if (a.items && b.items) return { type: "array", items: mergeSchemas(a.items as JsonSchemaNode, b.items as JsonSchemaNode, options) };
    return { type: "array", ...(a.items || b.items ? { items: a.items ?? b.items } : {}) };
  }
  // integer + number -> number; anything else becomes a type union.
  let types = [...new Set([...ta, ...tb])];
  if (types.includes("number")) types = types.filter((t) => t !== "integer");
  const structured = types.some((t) => t === "object" || t === "array");
  if (structured && types.length > 1) return { anyOf: dedupe([a, b]) };
  const node: JsonSchemaNode = { type: types.length === 1 ? types[0] : types };
  if (a.format && a.format === b.format) node.format = a.format;
  if (options.includeExamples && a.examples) node.examples = a.examples;
  return node;
}

function dedupe(nodes: JsonSchemaNode[]): JsonSchemaNode[] {
  const seen = new Set<string>();
  return nodes.flatMap((n) => (Array.isArray(n.anyOf) ? (n.anyOf as JsonSchemaNode[]) : [n])).filter((n) => {
    const key = JSON.stringify(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
