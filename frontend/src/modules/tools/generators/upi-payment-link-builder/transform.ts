import type { TransformResult } from "@/lib/tool-transform";
import type { UpiPaymentLinkBuilderOptions } from "./schema";

type Opts = UpiPaymentLinkBuilderOptions;

/** handle@psp: handle 2-256 chars of letters, digits . - _ ; psp 2-64 letters/digits */
const VPA = /^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9]{1,63}$/;

/** UPI apps decode + as a space inconsistently, so spaces are always %20. */
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export interface UpiParams {
  pa: string;
  pn?: string;
  am?: string;
  cu?: string;
  tn?: string;
  tr?: string;
  mc?: string;
  [k: string]: string | undefined;
}

export function validate(p: UpiParams): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!p.pa) errors.push("pa (payee VPA) is required");
  else if (!VPA.test(p.pa)) errors.push(`pa "${p.pa}" is not a valid VPA (name@bank, e.g. shop@okicici)`);
  if (!p.pn) errors.push("pn (payee name) is required: apps refuse to show a payment without it");
  else if (p.pn.length > 99) warnings.push("pn is long; some apps truncate at ~99 characters");
  if (p.am !== undefined && p.am !== "") {
    if (!/^\d+(?:\.\d{1,2})?$/.test(p.am)) errors.push(`am "${p.am}" must be a positive amount with at most 2 decimals`);
    else {
      const n = Number(p.am);
      if (n <= 0) errors.push("am must be greater than zero");
      if (n > 100000) warnings.push("am is above ₹1,00,000, the usual per-transaction UPI limit (some categories allow ₹5,00,000)");
    }
  }
  if (p.cu && p.cu !== "INR") errors.push(`cu must be INR, got ${p.cu}`);
  if (p.tn) {
    if (p.tn.length > 50) warnings.push("tn is longer than 50 characters; banks truncate the remark (NPCI allows 50 for most flows)");
    if (/[^\x20-\x7e]/.test(p.tn)) warnings.push("tn contains non-ASCII characters; some banks reject or mangle them");
  }
  if (p.mc !== undefined && p.mc !== "" && !/^\d{4}$/.test(p.mc)) errors.push("mc must be a 4-digit ISO 18245 merchant category code");
  if (p.tr && !/^[A-Za-z0-9._-]{1,35}$/.test(p.tr)) warnings.push("tr should be 1-35 characters of letters, digits, . _ - (reference IDs with other characters fail in several apps)");
  if (p.mc && !p.tr) warnings.push("merchant links normally carry tr (transaction reference) so the payment can be reconciled");
  return { errors, warnings };
}

export function buildQuery(p: UpiParams): string {
  const order = ["pa", "pn", "am", "cu", "tn", "tr", "mc"];
  const keys = [...order.filter((k) => p[k] !== undefined && p[k] !== ""), ...Object.keys(p).filter((k) => !order.includes(k) && p[k] !== undefined && p[k] !== "")];
  return keys.map((k) => `${k}=${enc(p[k]!)}`).join("&");
}

export function parseUpi(link: string): UpiParams {
  const t = link.trim();
  const m = /^upi:\/\/pay\?(.*)$/i.exec(t);
  if (!m) throw new Error("Not a upi://pay link");
  const out: UpiParams = { pa: "" };
  for (const part of m[1]!.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const k = (eq < 0 ? part : part.slice(0, eq)).toLowerCase();
    let v = eq < 0 ? "" : part.slice(eq + 1);
    try {
      v = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      throw new Error(`Cannot decode the value of ${k}: malformed percent-encoding`);
    }
    out[k] = v;
  }
  return out;
}

const APPS = {
  gpay: { label: "Google Pay", prefix: "gpay://upi/pay?" },
  phonepe: { label: "PhonePe", prefix: "phonepe://pay?" },
  paytm: { label: "Paytm", prefix: "paytmmp://pay?" },
} as const;

export function upiPaymentLinkBuilder(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    mode: options.mode ?? "build",
    payeeName: options.payeeName ?? "",
    amount: options.amount ?? "",
    note: options.note ?? "",
    reference: options.reference ?? "",
    merchantCode: options.merchantCode ?? "",
    targets: options.targets ?? ["upi", "qr-payload"],
    androidPackage: options.androidPackage ?? "com.google.android.apps.nbu.paisa.user",
  };
  const text = input.trim();
  if (text === "") return { output: "", error: null };
  try {
    if (o.mode === "parse") {
      const p = parseUpi(text);
      const { errors, warnings } = validate(p);
      const known: Record<string, string> = { pa: "Payee VPA", pn: "Payee name", am: "Amount (INR)", cu: "Currency", tn: "Note", tr: "Transaction ref", mc: "Merchant category", tid: "Transaction id", url: "Reference URL", mode: "Mode", orgid: "Org id", sign: "Signature", purpose: "Purpose" };
      const lines = Object.entries(p)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${(known[k] ?? k).padEnd(20)} ${v}`);
      if (p.sign) warnings.push("Link is signed (sign=...): editing any field will invalidate it");
      for (const e of errors) lines.push(`ERROR   ${e}`);
      for (const w of warnings) lines.push(`WARNING ${w}`);
      if (!errors.length) lines.push("Valid for the checks above (VPA ownership is not verified).");
      return { output: lines.join("\n"), error: null };
    }
    const p: UpiParams = {
      pa: text.replace(/\s+/g, ""),
      pn: o.payeeName.trim(),
      am: o.amount.trim().replace(/,/g, ""),
      cu: "INR",
      tn: o.note.trim(),
      tr: o.reference.trim(),
      mc: o.merchantCode.trim(),
    };
    if (!p.am) delete p.am;
    const { errors, warnings } = validate(p);
    if (errors.length) return { output: "", error: { message: errors[0]! } };
    const q = buildQuery(p);
    const out: string[] = [];
    const t = o.targets;
    if (t.includes("upi")) out.push(`# UPI deep link (any UPI app)\nupi://pay?${q}`);
    if (t.includes("qr-payload")) out.push(`# QR code payload (same string, encode it as a QR)\nupi://pay?${q}`);
    for (const key of ["gpay", "phonepe", "paytm"] as const) if (t.includes(key)) out.push(`# ${APPS[key].label}\n${APPS[key].prefix}${q}`);
    if (t.includes("android-intent")) {
      if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(o.androidPackage)) return { output: "", error: { message: "Android package must look like com.example.app" } };
      out.push(`# Android intent (opens a specific app from Chrome)\nintent://pay?${q}#Intent;scheme=upi;package=${o.androidPackage};end`);
    }
    if (t.includes("html")) {
      const href = `upi://pay?${q}`.replace(/&/g, "&amp;");
      out.push(`# HTML button\n<a href="${href}">Pay${p.am ? ` ₹${p.am}` : ""} with UPI</a>`);
    }
    if (warnings.length) out.push(warnings.map((w) => `# warning: ${w}`).join("\n"));
    return { output: out.join("\n\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
