import type { JsonSchemaGeneratorOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type JsonSchemaNode = Record<string, unknown>;

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
    $schema: "http://json-schema.org/draft-07/schema#",
    ...inferSchema(parsed, options),
  };

  return { output: JSON.stringify(schema, null, 2), error: null };
}

function inferSchema(value: unknown, options: JsonSchemaGeneratorOptions): JsonSchemaNode {
  if (value === null) return { type: "null" };

  if (Array.isArray(value)) {
    const node: JsonSchemaNode = { type: "array" };
    if (value.length > 0) {
      node.items = inferSchema(value[0], options);
    }
    return node;
  }

  switch (typeof value) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
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
      return node;
    }
    default:
      return {};
  }
}
