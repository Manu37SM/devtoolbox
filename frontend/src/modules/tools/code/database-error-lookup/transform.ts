import type { TransformResult } from "@/lib/tool-transform";
import type { DatabaseErrorLookupOptions } from "./schema";
import { MYSQL, ORACLE, PG_MESSAGES, POSTGRES, SQLSTATE_CLASSES, type DbError } from "./data";

type Db = "oracle" | "postgresql" | "mysql" | "sqlstate";
interface Hit { db: Db; code: string; entry: DbError | null; extra?: string }

export function findCodes(input: string, db: DatabaseErrorLookupOptions["database"]): Hit[] {
  const hits: Hit[] = [];
  const seen = new Set<string>();
  const push = (h: Hit) => { const k = `${h.db}:${h.code}`; if (!seen.has(k)) { seen.add(k); hits.push(h); } };

  if (db === "auto" || db === "oracle") {
    for (const m of input.matchAll(/\b(?:ORA|PLS)-(\d{5})\b/gi)) push({ db: "oracle", code: m[1]!, entry: ORACLE[m[1]!] ?? null });
    if (db === "oracle") for (const m of input.matchAll(/(?<![\w-])(\d{5})(?![\w-])/g)) if (ORACLE[m[1]!]) push({ db: "oracle", code: m[1]!, entry: ORACLE[m[1]!]! });
  }
  if (db === "auto" || db === "mysql") {
    for (const m of input.matchAll(/\b(?:ERROR|error code|errno)\s*[:#]?\s*(\d{4})\b/gi)) push({ db: "mysql", code: m[1]!, entry: MYSQL[m[1]!] ?? null });
    if (db === "mysql") for (const m of input.matchAll(/(?<![\w-])(\d{4})(?![\w-])/g)) if (MYSQL[m[1]!]) push({ db: "mysql", code: m[1]!, entry: MYSQL[m[1]!]! });
  }
  if (db === "auto" || db === "postgresql") {
    for (const m of input.matchAll(/(?:SQLSTATE|SQL state|sqlstate|code)\s*[:=[\s]\s*"?([0-9A-Z]{5})\b/g)) push(pgHit(m[1]!));
    for (const [re, code] of PG_MESSAGES) if (re.test(input)) push(pgHit(code));
    if (db === "postgresql") for (const m of input.matchAll(/(?<![\w-])([0-9][0-9A-Z]{4}|[A-Z][0-9A-Z]{4})(?![\w-])/g)) if (POSTGRES[m[1]!] || (/\d/.test(m[1]!) && SQLSTATE_CLASSES[m[1]!.slice(0, 2)])) push(pgHit(m[1]!));
  }
  if (hits.length === 0 && db === "auto") {
    for (const tok of input.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)) {
      if (/^\d{5}$/.test(tok) && ORACLE[tok]) push({ db: "oracle", code: tok, entry: ORACLE[tok]! });
      if (/^\d{4}$/.test(tok) && MYSQL[tok]) push({ db: "mysql", code: tok, entry: MYSQL[tok]! });
      if (/^[0-9A-Z]{5}$/.test(tok) && (POSTGRES[tok] || (/\d/.test(tok) && SQLSTATE_CLASSES[tok.slice(0, 2)]))) push(pgHit(tok));
    }
  }
  return hits;
}

function pgHit(code: string): Hit {
  const e = POSTGRES[code];
  if (e) return { db: "postgresql", code, entry: e, extra: e.name };
  const cls = SQLSTATE_CLASSES[code.slice(0, 2)];
  return { db: "sqlstate", code, entry: null, extra: cls ? `class ${code.slice(0, 2)}: ${cls}` : undefined };
}

const LABEL: Record<Db, string> = { oracle: "Oracle", postgresql: "PostgreSQL", mysql: "MySQL", sqlstate: "SQLSTATE" };

export function runDatabaseErrorLookup(input: string, options: DatabaseErrorLookupOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const hits = findCodes(input, options.database);
  if (hits.length === 0) return { output: "", error: { message: "No known error code found. Try ORA-00942, a PostgreSQL SQLSTATE such as 23505, or a MySQL code such as ERROR 1062." } };
  const blocks = hits.map((h) => {
    const prefix = h.db === "oracle" ? `ORA-${h.code}` : h.db === "mysql" ? `MySQL ${h.code}${MYSQL[h.code] ? ` (SQLSTATE ${MYSQL[h.code]!.sqlstate})` : ""}` : `${LABEL[h.db]} ${h.code}${h.extra ? ` (${h.extra})` : ""}`;
    if (!h.entry) return `${prefix}\n  Not in this reference${h.db === "sqlstate" && h.extra ? `; ${h.extra}` : ""}.`;
    const e = h.entry;
    return [prefix, `  ${e.message}`, `  Cause: ${e.cause}`, `  Fix:   ${e.fix}`, ...(e.spring ? [`  Spring usually translates this to ${e.spring}.`] : [])].join("\n");
  });
  return { output: blocks.join("\n\n"), error: null };
}
