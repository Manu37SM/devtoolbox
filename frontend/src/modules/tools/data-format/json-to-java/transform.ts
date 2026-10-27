import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToJavaOptions } from "./schema";

type JType =
  | { k: "null" | "boolean" | "int" | "long" | "double" | "string" | "unknown" }
  | { k: "array"; item: JType }
  | { k: "object"; fields: Map<string, JType> };

const NULL: JType = { k: "null" };

export function inferType(value: unknown): JType {
  if (value === null || value === undefined) return NULL;
  if (typeof value === "boolean") return { k: "boolean" };
  if (typeof value === "string") return { k: "string" };
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return { k: "double" };
    return Math.abs(value) <= 2_147_483_647 ? { k: "int" } : { k: "long" };
  }
  if (Array.isArray(value)) return { k: "array", item: value.map(inferType).reduce(mergeTypes, NULL) };
  const fields = new Map<string, JType>();
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) fields.set(k, inferType(v));
  return { k: "object", fields };
}

export function mergeTypes(a: JType, b: JType): JType {
  if (a.k === "null") return b;
  if (b.k === "null") return a;
  if (a.k === "object" && b.k === "object") {
    const fields = new Map(a.fields);
    for (const [k, t] of b.fields) fields.set(k, fields.has(k) ? mergeTypes(fields.get(k)!, t) : t);
    return { k: "object", fields };
  }
  if (a.k === "array" && b.k === "array") return { k: "array", item: mergeTypes(a.item, b.item) };
  if (a.k === b.k && a.k !== "array" && a.k !== "object") return a;
  const numeric = ["int", "long", "double"];
  if (numeric.includes(a.k) && numeric.includes(b.k)) {
    return a.k === "double" || b.k === "double" ? { k: "double" } : { k: "long" };
  }
  return { k: "unknown" };
}

const RESERVED = new Set(
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null record var".split(" "),
);

function words(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function toPascal(key: string): string {
  const w = words(key).map((p) => p[0]!.toUpperCase() + p.slice(1));
  const joined = w.join("") || "Field";
  return /^\d/.test(joined) ? `N${joined}` : joined;
}

export function toFieldName(key: string): string {
  const pascal = toPascal(key);
  let name = pascal[0]!.toLowerCase() + pascal.slice(1);
  if (RESERVED.has(name)) name += "_";
  return name;
}

export function singular(name: string): string {
  if (/ies$/.test(name) && name.length > 3) return name.slice(0, -3) + "y";
  if (/(ses|xes|ches|shes)$/.test(name)) return name.slice(0, -2);
  if (/(ss|us|is)$/.test(name)) return name;
  if (/s$/.test(name) && name.length > 1) return name.slice(0, -1);
  return name;
}

interface ClassDef {
  name: string;
  fields: { javaName: string; jsonName: string; type: string }[];
}

class Builder {
  classes: ClassDef[] = [];
  private used = new Set<string>();
  imports = new Set<string>();

  uniqueName(base: string): string {
    let name = base;
    for (let i = 2; this.used.has(name); i++) name = `${base}${i}`;
    this.used.add(name);
    return name;
  }

  javaType(t: JType, hint: string): string {
    switch (t.k) {
      case "boolean": return "Boolean";
      case "int": return "Integer";
      case "long": return "Long";
      case "double": return "Double";
      case "string": return "String";
      case "null":
      case "unknown": return "Object";
      case "array":
        this.imports.add("java.util.List");
        return `List<${this.javaType(t.item, singular(hint))}>`;
      case "object": {
        const name = this.uniqueName(toPascal(hint));
        const def: ClassDef = { name, fields: [] };
        this.classes.push(def);
        const seen = new Set<string>();
        for (const [key, ft] of t.fields) {
          let javaName = toFieldName(key);
          for (let i = 2; seen.has(javaName); i++) javaName = `${toFieldName(key)}${i}`;
          seen.add(javaName);
          def.fields.push({ javaName, jsonName: key, type: this.javaType(ft, key) });
        }
        return name;
      }
    }
  }
}

export function generateJava(value: unknown, options: JsonToJavaOptions): string {
  let root = inferType(value);
  let rootNote = "";
  if (root.k === "array") {
    rootNote = `// The JSON root is an array of ${toPascal(options.rootName)}.\n`;
    root = root.item;
  }
  if (root.k !== "object") throw new Error("The JSON must be an object (or an array of objects) to generate classes.");

  const b = new Builder();
  b.javaType(root, options.rootName || "Root");
  const needsJsonProperty = options.jackson && b.classes.some((c) => c.fields.some((f) => f.javaName !== f.jsonName));
  if (needsJsonProperty) b.imports.add("com.fasterxml.jackson.annotation.JsonProperty");
  if (options.style === "lombok") b.imports.add("lombok.Data");

  const prop = (f: { javaName: string; jsonName: string }) =>
    options.jackson && f.javaName !== f.jsonName ? `@JsonProperty(${JSON.stringify(f.jsonName)}) ` : "";

  const blocks = b.classes.map((c) => {
    if (options.style === "record") {
      const comps = c.fields.map((f) => `${prop(f)}${f.type} ${f.javaName}`);
      return `public record ${c.name}(${comps.join(", ")}) {}`;
    }
    const lines: string[] = [];
    if (options.style === "lombok") lines.push("@Data");
    lines.push(`public class ${c.name} {`);
    for (const f of c.fields) {
      if (prop(f)) lines.push(`    ${prop(f).trim()}`);
      lines.push(`    private ${f.type} ${f.javaName};`);
    }
    if (options.style === "pojo") {
      for (const f of c.fields) {
        const cap = f.javaName[0]!.toUpperCase() + f.javaName.slice(1);
        lines.push("", `    public ${f.type} get${cap}() {`, `        return ${f.javaName};`, "    }");
        lines.push("", `    public void set${cap}(${f.type} ${f.javaName}) {`, `        this.${f.javaName} = ${f.javaName};`, "    }");
      }
    }
    lines.push("}");
    return lines.join("\n");
  });

  const head: string[] = [];
  if (options.packageName.trim()) head.push(`package ${options.packageName.trim()};`, "");
  const imports = Array.from(b.imports).sort();
  if (imports.length) head.push(...imports.map((i) => `import ${i};`), "");
  return head.join("\n") + rootNote + blocks.join("\n\n") + "\n";
}

export function convertJsonToJava(input: string, options: JsonToJavaOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    return { output: generateJava(JSON.parse(input), options), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : e instanceof Error ? e.message : "Could not generate classes." } };
  }
}
