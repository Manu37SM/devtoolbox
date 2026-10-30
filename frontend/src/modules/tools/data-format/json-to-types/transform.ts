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
  | { kind: "ref"; name: string }
  | { kind: "nullable"; of: FieldType };

interface Field {
  key: string;
  type: FieldType;
  /** Missing from some of the array elements this type was merged from. */
  optional: boolean;
}

interface ObjectType {
  name: string;
  fields: Field[];
}

interface Ctx {
  registry: ObjectType[];
  usedNames: Set<string>;
}

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

  const ctx: Ctx = { registry: [], usedNames: new Set<string>() };
  const rootName = sanitizeIdentifier(options.rootName || "Root");

  const rootType = inferType(parsed, rootName, ctx);

  switch (options.language) {
    case "typescript":
      return { output: renderTypeScript(rootType, rootName, ctx.registry, options), error: null };
    case "go":
      return { output: renderGo(rootType, rootName, ctx.registry, options), error: null };
    case "python":
      return { output: renderPython(rootType, rootName, ctx.registry, options), error: null };
    default:
      return { output: "", error: { message: "Unsupported language" } };
  }
}

function inferType(value: unknown, keyHint: string, ctx: Ctx): FieldType {
  if (value === null) return { kind: "null" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: "array", of: { kind: "any" } };
    const elementHint = singularize(keyHint);
    // Every element contributes, so keys present in only some items become optional.
    const types = value.map((v) => inferType(v, elementHint, ctx));
    return { kind: "array", of: types.reduce((a, b) => mergeTypes(a, b, ctx)) };
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const typeName = uniqueName(toPascalCase(keyHint) || "Item", ctx.usedNames);
    const fields = Object.keys(obj).map((key) => ({
      key,
      type: inferType(obj[key], key, ctx),
      optional: false,
    }));
    ctx.registry.push({ name: typeName, fields });
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

function mergeTypes(a: FieldType, b: FieldType, ctx: Ctx): FieldType {
  if (a.kind === "nullable" || b.kind === "nullable") {
    const inner = mergeTypes(a.kind === "nullable" ? a.of : a, b.kind === "nullable" ? b.of : b, ctx);
    return inner.kind === "null" || inner.kind === "nullable" ? inner : { kind: "nullable", of: inner };
  }
  if (a.kind === "null" && b.kind === "null") return a;
  if (a.kind === "null") return { kind: "nullable", of: b };
  if (b.kind === "null") return { kind: "nullable", of: a };
  if (a.kind === "ref" && b.kind === "ref") return mergeObjects(a, b, ctx);
  if (a.kind === "array" && b.kind === "array") {
    if (a.of.kind === "any") return b;
    if (b.of.kind === "any") return a;
    return { kind: "array", of: mergeTypes(a.of, b.of, ctx) };
  }
  if (a.kind === b.kind) return a;
  if ((a.kind === "integer" && b.kind === "number") || (a.kind === "number" && b.kind === "integer")) return { kind: "number" };
  return { kind: "any" };
}

function mergeObjects(a: { kind: "ref"; name: string }, b: { kind: "ref"; name: string }, ctx: Ctx): FieldType {
  if (a.name === b.name) return a;
  const ta = ctx.registry.find((t) => t.name === a.name)!;
  const tb = ctx.registry.find((t) => t.name === b.name)!;
  const fields: Field[] = ta.fields.map((f) => {
    const other = tb.fields.find((g) => g.key === f.key);
    return other ? { key: f.key, type: mergeTypes(f.type, other.type, ctx), optional: f.optional || other.optional } : { ...f, optional: true };
  });
  for (const g of tb.fields) if (!ta.fields.some((f) => f.key === g.key)) fields.push({ ...g, optional: true });
  ta.fields = fields;
  // b was folded into a; drop it and free its name.
  ctx.registry.splice(ctx.registry.indexOf(tb), 1);
  ctx.usedNames.delete(tb.name);
  return a;
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

// ---------------------------------------------------------------- TypeScript

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
    case "array": {
      const inner = tsType(type.of);
      return type.of.kind === "nullable" ? `(${inner})[]` : `${inner}[]`;
    }
    case "ref":
      return type.name;
    case "nullable":
      return `${tsType(type.of)} | null`;
  }
}

function tsFieldName(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function renderTypeScript(rootType: FieldType, rootName: string, registry: ObjectType[], o: JsonToTypesOptions): string {
  const exp = o.exportTypes ? "export " : "";
  const ro = o.readonlyFields ? "readonly " : "";
  const asType = o.tsDeclaration === "type";
  const blocks: string[] = [];
  for (const obj of registry) {
    const fields = obj.fields.map((f) => `  ${ro}${tsFieldName(f.key)}${f.optional ? "?" : ""}: ${tsType(f.type)};`).join("\n");
    blocks.push(asType ? `${exp}type ${obj.name} = {\n${fields}\n};` : `${exp}interface ${obj.name} {\n${fields}\n}`);
  }
  if (rootType.kind !== "ref") {
    blocks.push(`${exp}type ${rootName} = ${tsType(rootType)};`);
  }
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------- Go

function goType(type: FieldType, pointer = false): string {
  switch (type.kind) {
    case "string":
      return pointer ? "*string" : "string";
    case "number":
      return pointer ? "*float64" : "float64";
    case "integer":
      return pointer ? "*int" : "int";
    case "boolean":
      return pointer ? "*bool" : "bool";
    case "null":
    case "any":
      return "interface{}";
    case "array":
      return `[]${goType(type.of)}`;
    case "ref":
      return pointer ? `*${type.name}` : type.name;
    case "nullable":
      return goType(type.of, true);
  }
}

function goFieldName(key: string): string {
  const pascal = toPascalCase(key);
  return pascal.length > 0 ? pascal : "Field";
}

function renderGo(rootType: FieldType, rootName: string, registry: ObjectType[], o: JsonToTypesOptions): string {
  const blocks: string[] = [`package ${o.goPackage?.trim() || "main"}`];
  for (const obj of registry) {
    const fields = obj.fields
      .map((f) => {
        // Optional fields become pointers so "absent" and "zero value" stay distinguishable.
        const type = goType(f.type, f.optional && f.type.kind !== "array" && f.type.kind !== "any" && f.type.kind !== "null");
        const omit = o.goOmitEmpty || f.optional ? ",omitempty" : "";
        return `\t${goFieldName(f.key)} ${type} \`json:"${f.key}${omit}"\``;
      })
      .join("\n");
    blocks.push(`type ${obj.name} struct {\n${fields}\n}`);
  }
  if (rootType.kind !== "ref") {
    blocks.push(`type ${rootName} ${goType(rootType)}`);
  }
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------- Python

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
    case "nullable":
      imports.add("Optional");
      return `Optional[${pythonType(type.of, imports)}]`;
  }
}

function pythonFieldName(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || "_field";
}

function renderPython(rootType: FieldType, rootName: string, registry: ObjectType[], o: JsonToTypesOptions): string {
  const style = o.pythonStyle ?? "dataclass";
  const imports = new Set<string>();
  const blocks: string[] = [];

  for (const obj of registry) {
    // Dataclasses and Pydantic need defaulted (optional) fields after the required ones.
    const ordered = style === "typeddict" ? obj.fields : [...obj.fields.filter((f) => !f.optional), ...obj.fields.filter((f) => f.optional)];
    const lines = ordered.map((f) => {
      const name = pythonFieldName(f.key);
      let type = pythonType(f.type, imports);
      if (style === "typeddict") {
        if (f.optional) {
          imports.add("NotRequired");
          type = `NotRequired[${type}]`;
        }
        return `    ${name}: ${type}`;
      }
      if (!f.optional) return `    ${name}: ${type}`;
      if (!type.startsWith("Optional[")) {
        imports.add("Optional");
        type = `Optional[${type}]`;
      }
      return `    ${name}: ${type} = None`;
    });
    const body = lines.join("\n") || "    pass";
    if (style === "pydantic") blocks.push(`class ${obj.name}(BaseModel):\n${body}`);
    else if (style === "typeddict") blocks.push(`class ${obj.name}(TypedDict):\n${body}`);
    else blocks.push(`@dataclass\nclass ${obj.name}:\n${body}`);
  }

  // Pydantic and TypedDict resolve forward references; dataclasses need nested classes first, which registry order gives.
  let aliasBlock = "";
  if (rootType.kind !== "ref") {
    aliasBlock = `${rootName} = ${pythonType(rootType, imports)}`;
  }

  const header: string[] = [];
  if (style === "dataclass") header.push("from dataclasses import dataclass");
  if (style === "pydantic") header.push("from pydantic import BaseModel");
  if (style === "typeddict") imports.add("TypedDict");
  if (imports.size > 0) {
    header.push(`from typing import ${Array.from(imports).sort().join(", ")}`);
  }

  const body = [...blocks, ...(aliasBlock ? [aliasBlock] : [])].join("\n\n");
  return [header.join("\n"), body].filter(Boolean).join("\n\n");
}
