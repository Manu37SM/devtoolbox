import type { TransformResult } from "@/lib/tool-transform";
import { COUNTRIES } from "@/modules/tools/converters/iso-code-lookup/data";
import type { BankIdentifierValidatorOptions } from "./schema";

type Kind = Exclude<BankIdentifierValidatorOptions["type"], "auto">;
export interface Check { kind: Kind; valid: boolean; normalized: string; details: string[]; problems: string[]; warnings: string[] }

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c[0], c[3]]));
const FED = ["", "Boston", "New York", "Philadelphia", "Cleveland", "Richmond", "Atlanta", "Chicago", "St. Louis", "Minneapolis", "Kansas City", "Dallas", "San Francisco"];
const IFSC_BANKS: Record<string, string> = {
  SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank", UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank", PUNB: "Punjab National Bank",
  BARB: "Bank of Baroda", CNRB: "Canara Bank", UBIN: "Union Bank of India", IDIB: "Indian Bank", YESB: "Yes Bank", INDB: "IndusInd Bank",
  IDFB: "IDFC FIRST Bank", BKID: "Bank of India", CBIN: "Central Bank of India", IOBA: "Indian Overseas Bank", MAHB: "Bank of Maharashtra",
  FDRL: "Federal Bank", KARB: "Karnataka Bank", SIBL: "South Indian Bank", RATN: "RBL Bank", PYTM: "Paytm Payments Bank",
};

export function checkBic(raw: string): Check {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  const c: Check = { kind: "bic", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  if (s.length !== 8 && s.length !== 11) { c.problems.push(`A BIC has 8 or 11 characters; this has ${s.length}.`); return c; }
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s)) { c.problems.push("Structure must be 4 letters (institution) + 2 letters (country) + 2 letters/digits (location) + optional 3 letters/digits (branch)."); return c; }
  const country = s.slice(4, 6);
  const name = COUNTRY_BY_CODE.get(country) ?? (country === "XK" ? "Kosovo" : undefined);
  if (!name) { c.problems.push(`"${country}" is not an ISO 3166-1 country code.`); return c; }
  const loc = s.slice(6, 8), branch = s.slice(8) || "XXX";
  c.valid = true;
  c.normalized = s;
  c.details.push(`Institution  ${s.slice(0, 4)}`, `Country      ${country} (${name})`, `Location     ${loc}`, `Branch       ${s.length === 11 ? branch : "XXX (primary office, implied)"}`);
  if (s.length === 8) c.details.push(`11-char form ${s}XXX`);
  if (loc[1] === "0") c.warnings.push("Location ends in 0: this is a TEST BIC, not a live institution.");
  else if (loc[1] === "1") c.warnings.push("Location ends in 1: passive SWIFT participant (cannot be reached on the network).");
  else if (loc[1] === "2") c.warnings.push("Location ends in 2: reverse-billing BIC.");
  if (/^[01]/.test(loc)) c.warnings.push("ISO 9362 does not allow a location code starting with 0 or 1.");
  if (branch !== "XXX" && branch.startsWith("X")) c.warnings.push('Branch codes starting with X are reserved; only "XXX" is defined.');
  c.warnings.push("Structure only: this does not prove the BIC is registered. Check the SWIFT BIC directory.");
  return c;
}

export function checkAba(raw: string): Check {
  const s = raw.replace(/[\s-]/g, "");
  const c: Check = { kind: "aba", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  if (!/^\d{9}$/.test(s)) { c.problems.push(`An ABA routing number has 9 digits; this has ${/^\d+$/.test(s) ? s.length : "non-digit characters"}.`); return c; }
  const d = [...s].map(Number);
  const sum = 3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]! + d[7]!) + (d[2]! + d[5]! + d[8]!);
  const fedPrefix = Number(s.slice(0, 2));
  c.details.push(`Checksum      3·(${d[0]}+${d[3]}+${d[6]}) + 7·(${d[1]}+${d[4]}+${d[7]}) + (${d[2]}+${d[5]}+${d[8]}) = ${sum}`);
  if (sum % 10 !== 0) { c.problems.push(`Checksum fails: ${sum} is not a multiple of 10 (check digit should be ${(d[8]! + ((10 - (sum % 10)) % 10)) % 10}).`); return c; }
  const ok = fedPrefix <= 12 || (fedPrefix >= 21 && fedPrefix <= 32) || (fedPrefix >= 61 && fedPrefix <= 72) || fedPrefix === 80;
  if (!ok) { c.problems.push(`Prefix ${s.slice(0, 2)} is not a Federal Reserve routing symbol range (01–12, 21–32, 61–72, 80).`); return c; }
  c.valid = true;
  const district = fedPrefix === 80 ? "traveler's cheques" : FED[fedPrefix % 20 === 0 ? 0 : fedPrefix <= 12 ? fedPrefix : fedPrefix <= 32 ? fedPrefix - 20 : fedPrefix - 60];
  const kind = fedPrefix === 0 ? "Federal Reserve" : fedPrefix <= 12 ? "Federal Reserve bank / government" : fedPrefix <= 32 ? "thrift institution" : fedPrefix <= 72 ? "electronic transaction (ACH)" : "special";
  c.details.push(`Fed district  ${fedPrefix === 0 ? "—" : district ?? "?"}`, `Institution   ${kind}`, `ABA prefix    ${s.slice(0, 4)}  ·  institution id ${s.slice(4, 8)}  ·  check digit ${s[8]}`);
  c.warnings.push("Valid format and checksum. Wires and ACH can use different routing numbers for the same bank.");
  return c;
}

export function checkSortCode(raw: string): Check {
  const s = raw.replace(/[\s-]/g, "");
  const c: Check = { kind: "sortcode", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  if (!/^\d{6}$/.test(s)) { c.problems.push("A UK sort code has 6 digits (e.g. 20-00-00)."); return c; }
  if (s === "000000") { c.problems.push("00-00-00 is not a real sort code."); return c; }
  c.valid = true;
  c.normalized = `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4)}`;
  c.details.push(`Formatted     ${c.normalized}`, `Bank group    ${s.slice(0, 2)}`);
  c.warnings.push("Format only. The UK modulus check (VocaLink) needs the account number and a weight table; this tool cannot confirm the sort code exists.");
  return c;
}

export function checkIfsc(raw: string): Check {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  const c: Check = { kind: "ifsc", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  if (s.length !== 11) { c.problems.push(`An IFSC has 11 characters; this has ${s.length}.`); return c; }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) { c.problems.push("Format is 4 letters (bank) + the digit 0 + 6 letters/digits (branch)."); return c; }
  c.valid = true;
  const bank = s.slice(0, 4);
  c.details.push(`Bank code     ${bank}${IFSC_BANKS[bank] ? ` (${IFSC_BANKS[bank]})` : ""}`, `Branch code   ${s.slice(5)}`);
  c.warnings.push("Format only. Branches are added and closed; confirm against the RBI/NPCI IFSC list before paying.");
  return c;
}

export function checkBsb(raw: string): Check {
  const s = raw.replace(/[\s-]/g, "");
  const c: Check = { kind: "bsb", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  if (!/^\d{6}$/.test(s)) { c.problems.push("An Australian BSB has 6 digits (e.g. 062-000)."); return c; }
  c.valid = true;
  c.normalized = `${s.slice(0, 3)}-${s.slice(3)}`;
  c.details.push(`Formatted     ${c.normalized}`, `Institution   ${s.slice(0, 2)}`, `State digit   ${s[2]} (${({ "2": "NSW/ACT", "3": "VIC", "4": "QLD", "5": "SA/NT", "6": "WA", "7": "TAS" } as Record<string, string>)[s[2]!] ?? "n/a"})`);
  c.warnings.push("Format only; there is no public checksum for BSBs.");
  return c;
}

export function checkCaTransit(raw: string): Check {
  const s = raw.replace(/[\s]/g, "");
  const c: Check = { kind: "ca-transit", valid: false, normalized: s, details: [], problems: [], warnings: [] };
  let transit: string, inst: string;
  const m1 = /^(\d{5})-(\d{3})$/.exec(s);
  const m2 = /^0?(\d{3})(\d{5})$/.exec(s.replace(/-/g, ""));
  if (m1) { transit = m1[1]!; inst = m1[2]!; }
  else if (/^\d{8,9}$/.test(s.replace(/-/g, "")) && m2) { inst = m2[1]!; transit = m2[2]!; c.warnings.push("Read as electronic format 0 + institution(3) + transit(5)."); }
  else { c.problems.push("Use branch-institution (12345-003) or the 9-digit electronic form 000312345."); return c; }
  c.valid = true;
  c.normalized = `${transit}-${inst}`;
  c.details.push(`Transit (branch) ${transit}`, `Institution       ${inst}`, `MICR format       ${transit}-${inst}`, `Electronic format 0${inst}${transit}`);
  c.warnings.push("Format only; the 9-digit electronic form has a checksum that depends on how it is printed.");
  return c;
}

const CHECKERS: Record<Kind, (s: string) => Check> = { bic: checkBic, aba: checkAba, sortcode: checkSortCode, ifsc: checkIfsc, bsb: checkBsb, "ca-transit": checkCaTransit };
const LABEL: Record<Kind, string> = { bic: "SWIFT/BIC", aba: "US ABA routing number", sortcode: "UK sort code", ifsc: "Indian IFSC", bsb: "Australian BSB", "ca-transit": "Canadian transit" };

export function detect(raw: string): Kind[] {
  const s = raw.trim();
  const t = s.replace(/[\s-]/g, "");
  if (/^\d{5}-\d{3}$/.test(s)) return ["ca-transit"];
  if (/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(t)) return ["ifsc"];
  if (/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(t) && (t.length === 8 || t.length === 11)) return ["bic"];
  if (/^\d{9}$/.test(t)) return ["aba"];
  if (/^\d{6}$/.test(t)) return ["sortcode", "bsb"];
  return [];
}

export function bankIdentifierValidator(input: string, options: Partial<BankIdentifierValidatorOptions>): TransformResult {
  const o: BankIdentifierValidatorOptions = { type: options.type ?? "auto", showDetails: options.showDetails ?? true };
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const blocks: string[] = [];
  for (const line of lines) {
    const kinds: Kind[] = o.type === "auto" ? detect(line) : [o.type];
    if (!kinds.length) { blocks.push(`✗ ${line}\n  Could not tell what this is. Expected a BIC (8/11 chars), ABA (9 digits), sort code / BSB (6 digits), IFSC (11 chars with a 0 in position 5) or Canadian transit (12345-003).`); continue; }
    for (const k of kinds) {
      const r = CHECKERS[k](line);
      const L = [`${r.valid ? "✓" : "✗"} ${line}  →  ${LABEL[k]}${r.valid ? ` ${r.normalized}` : ""}`];
      for (const p of r.problems) L.push(`  ✗ ${p}`);
      if (o.showDetails) for (const d of r.details) L.push(`  ${d}`);
      for (const w of r.warnings) L.push(`  ! ${w}`);
      blocks.push(L.join("\n"));
    }
  }
  return { output: blocks.join("\n\n") + "\n", error: null };
}
