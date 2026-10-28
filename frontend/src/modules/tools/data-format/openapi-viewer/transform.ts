import { load as loadYaml } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { OpenapiViewerOptions } from "./schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

export interface Operation {
  method: string;
  path: string;
  op: Obj;
  params: Obj[];
}

export function parseSpec(input: string): Obj {
  let doc: unknown;
  try {
    doc = JSON.parse(input);
  } catch {
    try {
      doc = loadYaml(input);
    } catch (e) {
      throw new Error(`Not valid JSON or YAML: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }
  }
  if (!isObj(doc)) throw new Error("The document must be a JSON/YAML object.");
  if (typeof doc.openapi === "string" ? !/^3\./.test(doc.openapi) : doc.swagger !== "2.0") throw new Error('Not an OpenAPI document: expected "openapi: 3.x" or "swagger: \'2.0\'".');
  if (!isObj(doc.paths)) throw new Error('The spec has no "paths" object.');
  return doc;
}

function resolveRef(doc: Obj, ref: string): unknown {
  if (!ref.startsWith("#/")) return undefined;
  let cur: unknown = doc;
  for (const part of ref.slice(2).split("/")) {
    if (!isObj(cur)) return undefined;
    cur = cur[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  }
  return cur;
}

function resolveParams(doc: Obj, list: unknown): Obj[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((p) => {
    if (!isObj(p)) return [];
    if (typeof p.$ref === "string") {
      const r = resolveRef(doc, p.$ref);
      return isObj(r) ? [r] : [{ name: "?", in: "unresolved", $unresolved: true }];
    }
    return [p];
  });
}

export function listOperations(doc: Obj): Operation[] {
  const out: Operation[] = [];
  for (const [path, item] of Object.entries(doc.paths as Obj)) {
    if (!isObj(item)) continue;
    const shared = resolveParams(doc, item.parameters);
    for (const m of METHODS) {
      const op = item[m];
      if (!isObj(op)) continue;
      const own = resolveParams(doc, op.parameters);
      const merged = [...own, ...shared.filter((s) => !own.some((o) => o.name === s.name && o.in === s.in))];
      out.push({ method: m, path, op, params: merged });
    }
  }
  return out;
}

function securityNames(doc: Obj, op: Obj): string[] | "public" | "none" {
  const sec = op.security ?? doc.security;
  if (sec === undefined) return "none";
  if (!Array.isArray(sec) || sec.length === 0) return "public";
  return [...new Set(sec.flatMap((r) => (isObj(r) ? Object.keys(r) : [])))];
}

export interface Finding { level: "error" | "warn" | "info"; where: string; text: string }

export function lintSpec(doc: Obj): Finding[] {
  const f: Finding[] = [];
  const ops = listOperations(doc);
  const ids = new Map<string, string>();
  const isV3 = typeof doc.openapi === "string";
  if (isV3 && !Array.isArray(doc.servers)) f.push({ level: "info", where: "spec", text: 'No "servers" defined; clients will assume the document\'s own host.' });
  const schemes = (isV3 ? (doc.components as Obj | undefined)?.securitySchemes : doc.securityDefinitions) as Obj | undefined;
  const hasSchemes = isObj(schemes) && Object.keys(schemes).length > 0;
  for (const { method, path, op, params } of ops) {
    const where = `${method.toUpperCase()} ${path}`;
    if (typeof op.operationId !== "string") f.push({ level: "warn", where, text: "No operationId — generated SDK method names will be arbitrary." });
    else if (ids.has(op.operationId)) f.push({ level: "error", where, text: `Duplicate operationId "${op.operationId}" (also ${ids.get(op.operationId)}).` });
    else ids.set(op.operationId, where);
    if (!op.summary && !op.description) f.push({ level: "info", where, text: "No summary or description." });
    const templ = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);
    const declared = params.filter((p) => p.in === "path").map((p) => p.name);
    const hasUnresolved = params.some((p) => p.$unresolved);
    if (!hasUnresolved) for (const t of templ) if (!declared.includes(t)) f.push({ level: "error", where, text: `Path parameter {${t}} is not declared in parameters.` });
    for (const d of declared) if (!templ.includes(d as string)) f.push({ level: "error", where, text: `Declared path parameter "${String(d)}" does not appear in the path.` });
    if (isObj(op.responses)) {
      const codes = Object.keys(op.responses);
      if (!codes.some((c) => /^2/.test(c) || c === "default")) f.push({ level: "warn", where, text: "No 2xx response is documented." });
      if (!codes.some((c) => /^[45]/.test(c) || c === "default")) f.push({ level: "warn", where, text: "No 4xx/5xx or default error response documented." });
    } else f.push({ level: "error", where, text: "Missing responses." });
    if (method === "get" && (op.requestBody !== undefined || params.some((p) => p.in === "body"))) f.push({ level: "warn", where, text: "GET with a request body — many proxies and clients drop it." });
    if (hasSchemes && securityNames(doc, op) === "none") f.push({ level: "warn", where, text: "Security schemes exist but this operation has no security requirement (set security: [] to mark it public on purpose)." });
    const verb = path.split("/").find((s) => /^(get|create|update|delete|add|remove|fetch|list)[A-Z_-]?/.test(s) && !s.startsWith("{"));
    if (verb) f.push({ level: "info", where, text: `Path segment "${verb}" looks like a verb; REST paths usually name resources and let the HTTP method carry the action.` });
    if (path.length > 1 && path.endsWith("/")) f.push({ level: "info", where, text: "Trailing slash in path." });
    if (/[A-Z]/.test(path.replace(/\{[^}]*\}/g, ""))) f.push({ level: "info", where, text: "Uppercase characters in path (URLs are case-sensitive; kebab-case is the usual convention)." });
  }
  return f;
}

function overview(doc: Obj): string[] {
  const info = isObj(doc.info) ? doc.info : {};
  const ops = listOperations(doc);
  const rows = [`${String(info.title ?? "(untitled)")}  v${String(info.version ?? "?")}`, `Spec ${String(doc.openapi ?? `Swagger ${String(doc.swagger)}`)} · ${Object.keys(doc.paths as Obj).length} paths · ${ops.length} operations`];
  if (typeof info.description === "string") rows.push(info.description.trim().split("\n")[0]!.slice(0, 160));
  if (Array.isArray(doc.servers)) for (const s of doc.servers) if (isObj(s) && typeof s.url === "string") rows.push(`Server   ${s.url}${s.description ? `  (${String(s.description)})` : ""}`);
  if (typeof doc.host === "string") rows.push(`Host     ${(Array.isArray(doc.schemes) ? String(doc.schemes[0]) : "https")}://${doc.host}${String(doc.basePath ?? "")}`);
  const schemes = (isObj(doc.components) ? doc.components.securitySchemes : doc.securityDefinitions) as unknown;
  if (isObj(schemes)) for (const [name, s] of Object.entries(schemes)) if (isObj(s)) rows.push(`Auth     ${name}: ${String(s.type)}${s.scheme ? ` (${String(s.scheme)})` : ""}${s.in ? ` in ${String(s.in)}` : ""}${s.flows ? ` flows: ${Object.keys(s.flows as Obj).join(", ")}` : ""}`);
  const byMethod: Record<string, number> = {};
  for (const o of ops) byMethod[o.method.toUpperCase()] = (byMethod[o.method.toUpperCase()] ?? 0) + 1;
  rows.push(`Methods  ${Object.entries(byMethod).map(([m, n]) => `${m} ${n}`).join(" · ")}`);
  const dep = ops.filter((o) => o.op.deprecated === true).length;
  if (dep) rows.push(`Deprecated operations: ${dep}`);
  return rows;
}

function endpoints(doc: Obj): string[] {
  const rows: string[] = [];
  const ops = listOperations(doc);
  const tagOf = (o: Operation) => (Array.isArray(o.op.tags) && typeof o.op.tags[0] === "string" ? o.op.tags[0] : "(untagged)");
  const groups = new Map<string, Operation[]>();
  for (const o of ops) groups.set(tagOf(o), [...(groups.get(tagOf(o)) ?? []), o]);
  for (const [tag, list] of groups) {
    rows.push(`▸ ${tag} (${list.length})`);
    for (const o of list) {
      const sec = securityNames(doc, o.op);
      const codes = isObj(o.op.responses) ? Object.keys(o.op.responses).join(",") : "—";
      rows.push(`  ${o.method.toUpperCase().padEnd(7)} ${o.path}${o.op.deprecated === true ? "  [deprecated]" : ""}`);
      const detail = [typeof o.op.summary === "string" ? o.op.summary : "", sec === "public" ? "public" : sec === "none" ? "" : `auth: ${sec.join("|")}`, `→ ${codes}`].filter(Boolean).join("  ·  ");
      rows.push(`          ${detail}`);
    }
  }
  return rows;
}

function schemas(doc: Obj): string[] {
  const defs = (isObj(doc.components) ? doc.components.schemas : doc.definitions) as unknown;
  if (!isObj(defs) || Object.keys(defs).length === 0) return ["No schemas defined."];
  const rows: string[] = [];
  for (const [name, s] of Object.entries(defs)) {
    if (!isObj(s)) continue;
    const props = isObj(s.properties) ? Object.entries(s.properties) : [];
    const req = Array.isArray(s.required) ? (s.required as string[]) : [];
    rows.push(`${name}  (${String(s.type ?? (s.allOf ? "allOf" : s.oneOf ? "oneOf" : s.anyOf ? "anyOf" : "object"))}${props.length ? `, ${props.length} properties` : ""})`);
    for (const [pn, p] of props.slice(0, 12)) {
      const t = isObj(p) ? String(p.type ?? (typeof p.$ref === "string" ? (p.$ref as string).split("/").pop() : "?")) + (isObj(p) && p.format ? `:${String(p.format)}` : "") : "?";
      rows.push(`    ${pn}${req.includes(pn) ? "*" : ""}  ${t}`);
    }
    if (props.length > 12) rows.push(`    … ${props.length - 12} more`);
  }
  rows.push("", "* = required");
  return rows;
}

export function viewOpenapi(input: string, options: OpenapiViewerOptions): TransformResult {
  if (input.trim() === "") return { output: "", error: null };
  let doc: Obj;
  try {
    doc = parseSpec(input);
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Invalid spec" } };
  }
  const sections: string[] = [];
  if (options.view === "all") sections.push(overview(doc).join("\n"));
  if (options.view === "all" || options.view === "endpoints") sections.push(["ENDPOINTS", ...endpoints(doc)].join("\n"));
  if (options.view === "all" || options.view === "schemas") sections.push(["SCHEMAS", ...schemas(doc)].join("\n"));
  if (options.view === "all" || options.view === "lint") {
    const findings = lintSpec(doc);
    const order = { error: 0, warn: 1, info: 2 } as const;
    const icon = { error: "✗", warn: "!", info: "·" } as const;
    const counts = (["error", "warn", "info"] as const).map((l) => `${findings.filter((x) => x.level === l).length} ${l}${l === "info" ? "" : "s"}`).join(", ");
    sections.push([`LINT — ${findings.length === 0 ? "no findings" : counts}`, ...findings.sort((a, b) => order[a.level] - order[b.level]).map((x) => `  ${icon[x.level]} ${x.where}: ${x.text}`)].join("\n"));
  }
  return { output: sections.join("\n\n"), error: null };
}
