import type { TransformResult } from "@/lib/tool-transform";
import type { IndianIdValidatorOptions } from "./schema";

const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const VINV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  [...digits].reverse().forEach((ch, i) => { c = VD[c]![VP[i % 8]![Number(ch)]!]!; });
  return c === 0;
}

export function verhoeffCheckDigit(digits: string): number {
  let c = 0;
  [...digits].reverse().forEach((ch, i) => { c = VD[c]![VP[(i + 1) % 8]![Number(ch)]!]!; });
  return VINV[c]!;
}

const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  [...first14].forEach((ch, i) => {
    const v = GST_CHARS.indexOf(ch) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  });
  return GST_CHARS[(36 - (sum % 36)) % 36]!;
}

const PAN_TYPES: Record<string, string> = { P: "Individual", C: "Company", H: "Hindu Undivided Family", F: "Firm / LLP", A: "Association of Persons", T: "Trust", B: "Body of Individuals", L: "Local Authority", J: "Artificial Juridical Person", G: "Government" };
const GST_STATES: Record<string, string> = { "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh" };

function mask(kind: string, v: string): string {
  if (kind === "Aadhaar") return `XXXX XXXX ${v.slice(-4)}`;
  if (kind === "PAN") return `${v.slice(0, 2)}XXXXX${v.slice(-2)}`;
  return v;
}

export function validateIndianId(input: string, options: IndianIdValidatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out = lines.map((line) => {
    const v = line.replace(/[\s-]/g, "").toUpperCase();
    const show = (kind: string) => (options.mask ? mask(kind, v) : v);
    if (/^\d{12}$/.test(v)) {
      const ok = /^[2-9]/.test(v) && verhoeffValid(v);
      return `${ok ? "✓" : "✗"} Aadhaar ${show("Aadhaar")}\n    ${ok ? "Format and Verhoeff checksum are valid." : /^[2-9]/.test(v) ? "Verhoeff checksum fails." : "Aadhaar numbers never start with 0 or 1."}\n    (A valid checksum does not prove the number was issued.)`;
    }
    if (/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) {
      const type = PAN_TYPES[v[3]!];
      return `${type ? "✓" : "✗"} PAN ${show("PAN")}\n    ${type ? `Holder type (4th letter ${v[3]}): ${type}` : `4th letter ${v[3]} is not a valid holder type.`}\n    (PAN has no public checksum; this checks format only.)`;
    }
    if (/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) {
      const state = GST_STATES[v.slice(0, 2)];
      const ok = gstinCheckChar(v.slice(0, 14)) === v[14];
      const notes = [state ? `State: ${state}` : `Unknown state code ${v.slice(0, 2)}`, `PAN inside: ${options.mask ? mask("PAN", v.slice(2, 12)) : v.slice(2, 12)}`, ok ? "Checksum character is valid." : `Checksum fails (expected ${gstinCheckChar(v.slice(0, 14))}).`];
      return `${ok && state ? "✓" : "✗"} GSTIN ${v}\n    ${notes.join("\n    ")}`;
    }
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return `✓ IFSC ${v}\n    Bank code ${v.slice(0, 4)}, branch code ${v.slice(5)}. Format only — check the code against RBI's list for a live branch.`;
    return `✗ ${line}\n    Not recognised as Aadhaar (12 digits), PAN (ABCDE1234F), GSTIN (15 chars) or IFSC (ABCD0123456).`;
  });
  return { output: out.join("\n\n"), error: null };
}
