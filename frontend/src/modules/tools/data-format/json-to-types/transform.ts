import type { JsonToTypesOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type FieldType =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "integer" }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "any" }
  | { kind: "array"; of: FieldType }
  | { kind: "ref"; name: string };

interface ObjectType {
  name: string;
  fields: { key: string; type: FieldType }[];
}

/** Hand-rolled JSON -> type-definition generator supporting TypeScript,
 * Go, and Python. Pure and DOM-free, so it's safe for Workers/SSR/tests. */
export function generateTypes(input: string, options: JsonToTypesOptions): TransformResult {
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

  const registry: ObjectType[] = [];
  const usedNames = new Set<string>();
  const rootName = sanitizeIdentifier(options.rootName || "Root");

  const rootType = inferType(parsed, rootName, registry, usedNames);

  switch (options.language) {
    case "typescript":
      return { output: renderTypeScript(rootType, rootName, registry), error: null };
    case "go":
      return { output: renderGo(rootType, rootName, registry), error: null };
    case "python":
      return { output: renderPython(rootType, rootName, registry), error: null };
    default:
      return { output: "", error: { message: "Unsupported language" } };
  }
}

function inferType(
  value: unknown,
  keyHint: string,
  registry: ObjectType[],
  usedNames: Set<string>,
): FieldType {
  if (value === null) return { kind: "null" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: "array", of: { kind: "any" } };
    const elementHint = singularize(keyHint);
    return { kind: "array", of: inferType(value[0], elementHint, registry, usedNames) };
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const typeName = uniqueName(toPascalCase(keyHint) || "Item", usedNames);
    const fields = Object.keys(obj).map((key) => ({
      key,
      type: inferType(obj[key], key, registry, usedNames),
    }));
    registry.push({ name: typeName, fields });
    return { kind: "ref", name: typeName };
  }

  switch (typeof value) {
    case "string":
      return { kind: "string" };
    case "number":
      return Number.isInteger(value) ? { kind: "integer" } : { kind: "number" };
    case "boolean":
      return { kind: "boolean" };
    default:
      return { kind: "any" };
  }
}

function uniqueName(base: string, usedNames: Set<string>): string {
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let i = 2;
  while (usedNames.has(`${base}${i}`)) i++;
  const name = `${base}${i}`;
  usedNames.add(name);
  return name;
}

function singularize(key: string): string {
  if (key.length > 1 && key.toLowerCase().endsWith("s") && !key.toLowerCase().endsWith("ss")) {
    return key.slice(0, -1);
  }
  return key;
}

function toPascalCase(input: string): string {
  const cleaned = input
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
  const withCap = cleaned.length > 0 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
  return /^[0-9]/.test(withCap) ? `T${withCap}` : withCap;
}

function sanitizeIdentifier(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.length > 0 ? pascal : "Root";
}

// ---------- TypeScript ----------

function tsType(type: FieldType): string {
  switch (type.kind) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "any":
      return "unknown";
    case "array":
      return `${tsType(type.of)}[]`;
    case "ref":
      return type.name;
  }
}

function tsFieldName(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function renderTypeScript(rootType: FieldType, rootName: string, registry: ObjectType[]): string {
  const blocks: string[] = [];
  for (const obj of registry) {
    const fields = obj.fields
      .map((f) => `  ${tsFieldName(f.key)}: ${tsType(f.type)};`)
      .join("\n");
    blocks.push(`interface ${obj.name} {\n${fields}\n}`);
  }
  if (rootType.kind !== "ref") {
    blocks.push(`type ${rootName} = ${tsType(rootType)};`);
  }
  return blocks.join("\n\n");
}

// ---------- Go ----------

function goType(type: FieldType): string {
  switch (type.kind) {
    case "string":
      return "string";
    case "number":
      return "float64";
    case "integer":
      return "int";
    case "boolean":
      return "bool";
    case "null":
    case "any":
      return "interface{}";
    case "array":
      return `[]${goType(type.of)}`;
    case "ref":
      return type.name;
  }
}

function goFieldName(key: string): string {
  const pascal = toPascalCase(key);
  return pascal.length > 0 ? pascal : "Field";
}

function renderGo(rootType: FieldType, rootName: string, registry: ObjectType[]): string {
  const blocks: string[] = ["package main"];
  for (const obj of registry) {
    const fields = obj.fields
      .map((f) => `\t${goFieldName(f.key)} ${goType(f.type)} \`json:"${f.key}"\``)
      .join("\n");
    blocks.push(`type ${obj.name} struct {\n${fields}\n}`);
  }
  if (rootType.kind !== "ref") {
    blocks.push(`type ${rootName} ${goType(rootType)}`);
  }
  return blocks.join("\n\n");
}

// ---------- Python ----------

function pythonType(type: FieldType, imports: Set<string>): string {
  switch (type.kind) {
    case "string":
      return "str";
    case "number":
      return "float";
    case "integer":
      return "int";
    case "boolean":
      return "bool";
    case "null":
      imports.add("Optional");
      imports.add("Any");
      return "Optional[Any]";
    case "any":
      imports.add("Any");
      return "Any";
    case "array":
      imports.add("List");
      return `List[${pythonType(type.of, imports)}]`;
    case "ref":
      return type.name;
  }
}

function pythonFieldName(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || "_field";
}

function renderPython(rootType: FieldType, rootName: string, registry: ObjectType[]): string {
  const imports = new Set<string>();
  const blocks: string[] = [];

  for (const obj of registry) {
    const fields = obj.fields
      .map((f) => `    ${pythonFieldName(f.key)}: ${pythonType(f.type, imports)}`)
      .join("\n");
    blocks.push(`@dataclass\nclass ${obj.name}:\n${fields || "    pass"}`);
  }

  let aliasBlock = "";
  if (rootType.kind !== "ref") {
    aliasBlock = `${rootName} = ${pythonType(rootType, imports)}`;
  }

  const header: string[] = ["from dataclasses import dataclass"];
  if (imports.size > 0) {
    header.push(`from typing import ${Array.from(imports).sort().join(", ")}`);
  }

  const body = [...blocks, ...(aliasBlock ? [aliasBlock] : [])].join("\n\n");
  return [header.join("\n"), body].filter(Boolean).join("\n\n");
}
