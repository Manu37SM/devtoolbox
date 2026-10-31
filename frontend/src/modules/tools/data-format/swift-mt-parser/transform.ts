import type { TransformResult } from "@/lib/tool-transform";
import type { SwiftMtParserOptions } from "./schema";

type Opts = SwiftMtParserOptions;

export interface Block {
  id: string;
  body: string;
}

/** Splits {1:...}{2:...}{3:{108:X}}{4:...-}{5:{CHK:...}} respecting nested braces. */
export function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "{") {
      i++;
      continue;
    }
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) throw new Error("Unbalanced braces: a block is not closed with }");
    const inner = text.slice(i + 1, j);
    const m = /^(\d):([^]*)$/.exec(inner);
    if (m) blocks.push({ id: m[1]!, body: m[2]! });
    i = j + 1;
  }
  return blocks;
}

export interface Field {
  tag: string;
  /** tag number plus option letter, e.g. 32A */
  value: string;
  lines: string[];
}

export function parseBlock4(body: string): Field[] {
  let t = body.replace(/\r\n?/g, "\n");
  t = t.replace(/^\n/, "").replace(/\n?-\s*$/, "");
  const fields: Field[] = [];
  let cur: Field | null = null;
  for (const line of t.split("\n")) {
    const m = /^:(\d{2}[A-Z]?):(.*)$/.exec(line);
    if (m) {
      cur = { tag: m[1]!, value: m[2]!, lines: [m[2]!] };
      fields.push(cur);
    } else if (cur) {
      cur.value += "\n" + line;
      cur.lines.push(line);
    } else if (line.trim() !== "") throw new Error(`Text before the first field tag: "${line.slice(0, 30)}"`);
  }
  return fields;
}

export const TAG_NAMES: Record<string, string> = {
  "13C": "Time indication",
  "20": "Sender's reference",
  "21": "Related reference",
  "23B": "Bank operation code",
  "23E": "Instruction code",
  "25": "Account identification",
  "26T": "Transaction type code",
  "28C": "Statement number / sequence",
  "32A": "Value date, currency, amount",
  "32B": "Currency, amount",
  "33B": "Instructed currency, amount",
  "36": "Exchange rate",
  "50A": "Ordering customer (BIC)",
  "50F": "Ordering customer (party id)",
  "50K": "Ordering customer",
  "51A": "Sending institution",
  "52A": "Ordering institution (BIC)",
  "52D": "Ordering institution",
  "53A": "Sender's correspondent (BIC)",
  "53B": "Sender's correspondent (location)",
  "53D": "Sender's correspondent",
  "54A": "Receiver's correspondent (BIC)",
  "56A": "Intermediary (BIC)",
  "56D": "Intermediary",
  "57A": "Account with institution (BIC)",
  "57D": "Account with institution",
  "58A": "Beneficiary institution (BIC)",
  "58D": "Beneficiary institution",
  "59": "Beneficiary customer",
  "59A": "Beneficiary customer (BIC)",
  "59F": "Beneficiary customer (party id)",
  "60F": "Opening balance (final)",
  "60M": "Opening balance (intermediate)",
  "61": "Statement line",
  "62F": "Closing balance (final)",
  "62M": "Closing balance (intermediate)",
  "64": "Closing available balance",
  "65": "Forward available balance",
  "70": "Remittance information",
  "71A": "Details of charges",
  "71F": "Sender's charges",
  "71G": "Receiver's charges",
  "72": "Sender to receiver information",
  "77B": "Regulatory reporting",
  "86": "Information to account owner",
  "90C": "Number and sum of credits",
  "90D": "Number and sum of debits",
  "121": "UETR (unique end-to-end transaction reference)",
};

export interface Amount {
  currency: string;
  /** normalised decimal string, e.g. "1234.56" */
  amount: string;
}

export function parseAmount(s: string): string | null {
  if (!/^\d{1,15}(?:,\d{0,5})?$/.test(s)) return null;
  const [i, f = ""] = s.split(",");
  return f ? `${i}.${f}` : i!;
}

export function swiftDate(yymmdd: string, pivot: number): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mo = Number(yymmdd.slice(2, 4));
  const d = Number(yymmdd.slice(4, 6));
  const y = (yy <= pivot ? 2000 : 1900) + yy;
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (mo < 1 || mo > 12 || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface Balance {
  mark: "C" | "D" | "RC" | "RD";
  date: string;
  currency: string;
  amount: string;
}

export function parseBalance(v: string, pivot: number): Balance | null {
  const m = /^(RC|RD|C|D)(\d{6})([A-Z]{3})([\d,]+)$/.exec(v.trim());
  if (!m) return null;
  const date = swiftDate(m[2]!, pivot);
  const amount = parseAmount(m[4]!);
  if (!date || !amount) return null;
  return { mark: m[1] as Balance["mark"], date, currency: m[3]!, amount };
}

export interface StatementLine {
  valueDate: string;
  entryDate: string | null;
  mark: "C" | "D" | "RC" | "RD";
  fundsCode: string | null;
  amount: string;
  transactionType: string;
  reference: string;
  bankReference: string | null;
  supplementary: string | null;
  info: string | null;
}

export function parseStatementLine(v: string, pivot: number): StatementLine | null {
  const [first = "", ...rest] = v.split("\n");
  const m = /^(\d{6})(\d{4})?(RC|RD|C|D)([A-Z])?([\d,]+)([NFS])([A-Z0-9]{3})([^/\n]*?)(?:\/\/(.*))?$/.exec(first);
  if (!m) return null;
  const valueDate = swiftDate(m[1]!, pivot);
  const amount = parseAmount(m[5]!);
  if (!valueDate || !amount) return null;
  let entry: string | null = null;
  if (m[2]) {
    const yy = m[1]!.slice(0, 2);
    entry = swiftDate(yy + m[2], pivot);
    // entry date may fall in the following year
    if (!entry) return null;
  }
  return {
    valueDate,
    entryDate: entry,
    mark: m[3] as StatementLine["mark"],
    fundsCode: m[4] ?? null,
    amount,
    transactionType: m[6]! + m[7]!,
    reference: m[8]!,
    bankReference: m[9] ?? null,
    supplementary: rest.length ? rest.join(" ") : null,
    info: null,
  };
}

export interface Header {
  basic?: Record<string, string>;
  application?: Record<string, string>;
  user?: Record<string, string>;
  trailer?: Record<string, string>;
}

function parseHeader1(b: string): Record<string, string> | null {
  const m = /^([FAL])(\d{2})([A-Z0-9]{12})(\d{4})(\d{6})$/.exec(b);
  if (!m) return null;
  return { applicationId: m[1]!, serviceId: m[2]!, logicalTerminal: m[3]!, sessionNumber: m[4]!, sequenceNumber: m[5]! };
}

function parseHeader2(b: string): Record<string, string> | null {
  let m = /^I(\d{3})([A-Z0-9]{12})([NUS])?(\d)?(\d{3})?$/.exec(b);
  if (m) return { direction: "Input (to SWIFT)", messageType: m[1]!, destination: m[2]!, priority: m[3] ?? "N" };
  m = /^O(\d{3})(\d{4})(\d{6}[A-Z0-9]{12}\d{10})(\d{6})(\d{4})([NUS])$/.exec(b);
  if (m) return { direction: "Output (from SWIFT)", messageType: m[1]!, inputTime: m[2]!, mir: m[3]!, outputDate: m[4]!, outputTime: m[5]!, priority: m[6]! };
  return null;
}

function nested(b: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of b.matchAll(/\{([A-Z0-9]{2,3}):([^{}]*)\}/g)) out[m[1]!] = m[2]!;
  return out;
}

export interface Parsed {
  header: Header;
  messageType: string | null;
  fields: Field[];
  details: Record<string, unknown>;
  issues: string[];
}

const MANDATORY: Record<string, string[]> = {
  "103": ["20", "23B", "32A", "50", "59", "71A"],
  "202": ["20", "21", "32A", "58"],
  "940": ["20", "25", "28C", "60", "62"],
  "942": ["20", "25", "28C", "34F", "13D"],
};

/** Exact arithmetic: amounts scaled to 5 decimals (SWIFT allows up to 5 digits after the comma). */
const SCALE = 100000n;
function units(a: string): bigint {
  const [i, f = ""] = a.split(".");
  return BigInt(i!) * SCALE + BigInt(f.padEnd(5, "0").slice(0, 5));
}
function showUnits(u: bigint): string {
  const neg = u < 0n;
  const abs = neg ? -u : u;
  const i = abs / SCALE;
  const f = (abs % SCALE).toString().padStart(5, "0").replace(/0{1,3}$/, "");
  return `${neg ? "-" : ""}${i}.${f.padEnd(2, "0")}`;
}

const base = (tag: string) => tag.replace(/[A-Z]$/, "");

export function parseMt(text: string, o: Opts): Parsed {
  const issues: string[] = [];
  const blocks = splitBlocks(text.trim());
  if (blocks.length === 0) throw new Error("No {1:...}{2:...}{4:...} blocks found. Paste the full FIN message.");
  const header: Header = {};
  let b4: Block | undefined;
  for (const b of blocks) {
    if (b.id === "1") {
      header.basic = parseHeader1(b.body) ?? undefined;
      if (!header.basic) issues.push(`Block 1 "${b.body.slice(0, 30)}" is not F01 + 12-character LT address + session + sequence`);
    } else if (b.id === "2") {
      header.application = parseHeader2(b.body) ?? undefined;
      if (!header.application) issues.push(`Block 2 "${b.body.slice(0, 40)}" is not a valid input (I...) or output (O...) application header`);
    } else if (b.id === "3") header.user = nested(b.body);
    else if (b.id === "4") b4 = b;
    else if (b.id === "5") header.trailer = nested(b.body);
  }
  if (!b4) throw new Error("Block 4 (text block) is missing");
  const fields = parseBlock4(b4.body);
  let messageType = header.application?.messageType ?? null;
  if (!messageType) {
    if (fields.some((f) => f.tag === "23B")) messageType = "103";
    else if (fields.some((f) => f.tag === "60F" || f.tag === "60M")) messageType = "940";
  }
  const details: Record<string, unknown> = {};
  const pivot = o.yearPivot;
  const statementLines: StatementLine[] = [];
  let lastLine: StatementLine | null = null;
  for (const f of fields) {
    const t = f.tag;
    const v = f.value;
    if (t === "32A") {
      const m = /^(\d{6})([A-Z]{3})([\d,]+)$/.exec(v.trim());
      const date = m && swiftDate(m[1]!, pivot);
      const amount = m && parseAmount(m[3]!);
      if (!m || !date || !amount) issues.push(`:32A: "${v.trim()}" must be YYMMDD + currency + amount with a decimal comma`);
      else details.valueDate = { date, currency: m[2]!, amount };
    } else if (t === "33B" || t === "32B") {
      const m = /^([A-Z]{3})([\d,]+)$/.exec(v.trim());
      const amount = m && parseAmount(m[2]!);
      if (!m || !amount) issues.push(`:${t}: "${v.trim()}" must be currency + amount with a decimal comma`);
      else details[t === "33B" ? "instructedAmount" : "amount"] = { currency: m[1]!, amount };
    } else if (t === "60F" || t === "60M" || t === "62F" || t === "62M" || t === "64" || t === "65") {
      const b = parseBalance(v, pivot);
      if (!b) issues.push(`:${t}: "${v.trim()}" must be C/D + YYMMDD + currency + amount`);
      else {
        const key = { "60F": "openingBalance", "60M": "openingBalance", "62F": "closingBalance", "62M": "closingBalance", "64": "availableBalance", "65": "forwardAvailableBalance" }[t]!;
        if (key === "forwardAvailableBalance") details[key] = [...((details[key] as Balance[] | undefined) ?? []), b];
        else details[key] = b;
      }
    } else if (t === "61") {
      const line = parseStatementLine(v, pivot);
      if (!line) issues.push(`:61: "${v.split("\n")[0]!.slice(0, 40)}" is not a valid statement line`);
      else {
        statementLines.push(line);
        lastLine = line;
      }
    } else if (t === "86") {
      if (lastLine && lastLine.info === null) lastLine.info = v.replace(/\n/g, " ");
      else details.accountOwnerInfo = v.replace(/\n/g, " ");
    } else if (t === "121") {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.trim())) issues.push(`:121: UETR "${v.trim()}" is not a lower-case UUID v4`);
      else details.uetr = v.trim();
    } else if (t === "20") {
      if (v.length > 16) issues.push(`:20: reference is ${v.length} characters; the limit is 16`);
      if (/^\/|\/$|\/\//.test(v)) issues.push(":20: reference may not start or end with / or contain //");
      details.reference = v.trim();
    } else if (t === "71A") {
      if (!["OUR", "SHA", "BEN"].includes(v.trim())) issues.push(`:71A: "${v.trim()}" must be OUR, SHA or BEN`);
      details.charges = v.trim();
    } else if (t === "23B") {
      if (!["CRED", "CRTS", "SPAY", "SPRI", "SSTD"].includes(v.trim())) issues.push(`:23B: "${v.trim()}" is not CRED, CRTS, SPAY, SPRI or SSTD`);
      details.bankOperationCode = v.trim();
    } else if (t === "25") details.account = v.trim();
    else if (t === "28C") details.statementNumber = v.trim();
    else if (/^(50|59|52|53|54|56|57|58)[A-Z]?$/.test(t)) {
      const key = { "50": "orderingCustomer", "59": "beneficiary", "52": "orderingInstitution", "53": "sendersCorrespondent", "54": "receiversCorrespondent", "56": "intermediary", "57": "accountWithInstitution", "58": "beneficiaryInstitution" }[base(t)]!;
      const lines = f.lines.map((x) => x.trim()).filter(Boolean);
      const acct = lines[0]?.startsWith("/") ? lines.shift()!.slice(1) : undefined;
      if (t.endsWith("A")) {
        const bic = lines[0] ?? "";
        if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic)) issues.push(`:${t}: "${bic}" is not a BIC`);
        details[key] = { ...(acct ? { account: acct } : {}), bic };
      } else details[key] = { ...(acct ? { account: acct } : {}), name: lines[0] ?? "", address: lines.slice(1) };
    } else if (t === "70" || t === "72" || t === "77B") details[{ "70": "remittance", "72": "senderToReceiver", "77B": "regulatoryReporting" }[t]!] = f.lines.map((x) => x.trim()).filter(Boolean);
  }
  const uetr3 = header.user?.["121"];
  if (uetr3 !== undefined) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uetr3)) issues.push(`Block 3 {121:}: UETR "${uetr3}" is not a lower-case UUID v4`);
    else details.uetr = uetr3;
  }
  if (statementLines.length) details.statementLines = statementLines;
  if (statementLines.length && details.openingBalance && details.closingBalance) {
    const ob = details.openingBalance as Balance;
    const cb = details.closingBalance as Balance;
    if (ob.currency === cb.currency) {
      const sign = (m: string) => (m === "C" || m === "RD" ? 1n : -1n);
      let total = units(ob.amount) * sign(ob.mark);
      for (const l of statementLines) total += units(l.amount) * sign(l.mark);
      const want = units(cb.amount) * sign(cb.mark);
      details.balanceCheck = total === want ? "opening balance + lines = closing balance" : `lines do not reconcile: computed ${showUnits(total)}, closing says ${showUnits(want)}`;
      if (total !== want) issues.push(`Statement does not reconcile: opening ${ob.mark}${ob.amount} plus lines gives ${showUnits(total)} but closing is ${cb.mark}${cb.amount}`);
    }
  }
  if (o.validate && messageType) {
    const req = MANDATORY[messageType];
    if (req) for (const r of req) if (!fields.some((f) => base(f.tag) === r || f.tag === r)) issues.push(`MT${messageType} requires field :${r}: but it is missing`);
    if (!req) issues.push(`MT${messageType} is not one of the types with built-in mandatory-field checks (103, 202, 940, 942); fields are still listed`);
  }
  return { header, messageType, fields, details, issues };
}

function group(a: string, on: boolean): string {
  if (!on) return a;
  const [i, f] = a.split(".");
  return i!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (f ? "." + f : "");
}

export function swiftMtParser(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    output: options.output ?? "summary",
    validate: options.validate ?? true,
    headers: options.headers ?? true,
    yearPivot: options.yearPivot ?? 79,
    groupAmounts: options.groupAmounts ?? true,
  };
  if (input.trim() === "") return { output: "", error: null };
  try {
    const p = parseMt(input, o);
    if (o.output === "json") return { output: JSON.stringify({ messageType: p.messageType, header: o.headers ? p.header : undefined, details: p.details, fields: p.fields.map((f) => ({ tag: f.tag, name: TAG_NAMES[f.tag] ?? null, value: f.lines })), issues: o.validate ? p.issues : undefined }, null, 2), error: null };
    if (o.output === "fields") {
      const out = p.fields.map((f) => `:${f.tag.padEnd(3)} ${(TAG_NAMES[f.tag] ?? "").padEnd(44)} ${f.lines.join(" | ")}`);
      if (o.validate) for (const i of p.issues) out.push(`! ${i}`);
      return { output: out.join("\n"), error: null };
    }
    const L: string[] = [];
    L.push(`Message type: MT${p.messageType ?? "?"}`);
    if (o.headers) {
      const b = p.header.basic;
      if (b) L.push(`Sender LT:    ${b.logicalTerminal} (BIC ${b.logicalTerminal!.slice(0, 8)}, branch ${b.logicalTerminal!.slice(9)})  session ${b.sessionNumber} seq ${b.sequenceNumber}`);
      const a = p.header.application;
      if (a) {
        L.push(`Direction:    ${a.direction}, priority ${a.priority}`);
        if (a.destination) L.push(`Receiver LT:  ${a.destination}`);
        if (a.mir) L.push(`MIR:          ${a.mir}  (output ${a.outputDate} ${a.outputTime})`);
      }
      if (p.header.user && Object.keys(p.header.user).length) L.push(`User header:  ${Object.entries(p.header.user).map(([k, v]) => `${k}=${v}`).join(" ")}`);
      if (p.header.trailer && Object.keys(p.header.trailer).length) L.push(`Trailer:      ${Object.entries(p.header.trailer).map(([k, v]) => `${k}=${v}`).join(" ")}`);
      L.push("");
    }
    const d = p.details;
    const money = (x: { currency: string; amount: string }) => `${x.currency} ${group(x.amount, o.groupAmounts)}`;
    if (d.reference) L.push(`Reference:    ${d.reference}`);
    if (d.uetr) L.push(`UETR:         ${d.uetr}`);
    if (d.bankOperationCode) L.push(`Operation:    ${d.bankOperationCode}`);
    if (d.valueDate) {
      const v = d.valueDate as { date: string; currency: string; amount: string };
      L.push(`Value date:   ${v.date}`);
      L.push(`Amount:       ${money(v)}`);
    }
    if (d.instructedAmount) L.push(`Instructed:   ${money(d.instructedAmount as { currency: string; amount: string })}`);
    const party = (label: string, key: string) => {
      const x = d[key] as { account?: string; bic?: string; name?: string; address?: string[] } | undefined;
      if (!x) return;
      L.push(`${label.padEnd(13)} ${[x.bic, x.name, x.account ? `(account ${x.account})` : "", ...(x.address ?? [])].filter(Boolean).join(", ")}`);
    };
    party("Ordering:", "orderingCustomer");
    party("Ord. inst.:", "orderingInstitution");
    party("Sender corr.:", "sendersCorrespondent");
    party("Intermediary:", "intermediary");
    party("Acct with:", "accountWithInstitution");
    party("Beneficiary:", "beneficiary");
    party("Ben. inst.:", "beneficiaryInstitution");
    if (d.remittance) L.push(`Remittance:   ${(d.remittance as string[]).join(" / ")}`);
    if (d.charges) L.push(`Charges:      ${d.charges}`);
    if (d.account) L.push(`Account:      ${d.account}`);
    if (d.statementNumber) L.push(`Statement:    ${d.statementNumber}`);
    if (d.openingBalance) {
      const b = d.openingBalance as Balance;
      L.push(`Opening:      ${b.mark === "C" ? "+" : "-"}${money(b)} on ${b.date}`);
    }
    for (const l of (d.statementLines as StatementLine[] | undefined) ?? []) {
      L.push(`  ${l.valueDate}  ${l.mark.startsWith("R") ? "reversal " : ""}${l.mark.endsWith("C") ? "CR" : "DR"} ${group(l.amount, o.groupAmounts).padStart(14)}  ${l.transactionType}  ${l.reference}${l.bankReference ? ` // ${l.bankReference}` : ""}${l.info ? `  — ${l.info}` : ""}`);
    }
    if (d.closingBalance) {
      const b = d.closingBalance as Balance;
      L.push(`Closing:      ${b.mark === "C" ? "+" : "-"}${money(b)} on ${b.date}`);
    }
    if (d.availableBalance) {
      const b = d.availableBalance as Balance;
      L.push(`Available:    ${b.mark === "C" ? "+" : "-"}${money(b)} on ${b.date}`);
    }
    if (d.balanceCheck) L.push(`Check:        ${d.balanceCheck}`);
    if (d.senderToReceiver) L.push(`Sender info:  ${(d.senderToReceiver as string[]).join(" / ")}`);
    if (d.regulatoryReporting) L.push(`Regulatory:   ${(d.regulatoryReporting as string[]).join(" / ")}`);
    if (d.accountOwnerInfo) L.push(`Owner info:   ${d.accountOwnerInfo}`);
    if (o.validate) {
      L.push("");
      if (p.issues.length) for (const i of p.issues) L.push(`! ${i}`);
      else L.push("No problems found.");
    }
    return { output: L.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
