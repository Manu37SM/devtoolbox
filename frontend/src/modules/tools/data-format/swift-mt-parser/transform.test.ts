import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseAmount, parseBlock4, parseMt, parseStatementLine, splitBlocks, swiftDate, swiftMtParser as fn } from "./transform";
import { swiftMtParserOptionsSchema } from "./schema";

const O = swiftMtParserOptionsSchema.parse({});

const MT103 = `{1:F01BANKBEBBAXXX0000000000}{2:I103BANKDEFFXXXXN}{3:{108:MT103 EXAMPLE}{121:eb6305c9-1f7f-49de-aed0-16487c27b42d}}{4:
:20:REF12345678
:23B:CRED
:32A:260301EUR1234567,89
:33B:USD1500000,
:50K:/DE89370400440532013000
ACME GMBH
HAUPTSTRASSE 1
10115 BERLIN
:57A:BANKFRPP
:59:/FR1420041010050500013M02606
JEAN DUPONT
PARIS
:70:INVOICE 2026-0042
:71A:SHA
-}{5:{CHK:123456789ABC}}`;

const MT940 = `{1:F01BANKBEBBAXXX0000000000}{2:O9401200010103BANKDEFFXXXX22211999110114101200N}{4:
:20:STMT-20260301
:25:DE89370400440532013000
:28C:00001/001
:60F:C260228EUR1000,00
:61:2603010301D250,50NTRFNONREF//BANKREF1
:86:Payment to ACME
:61:2603020302C1200,00NTRFINV-77//BANKREF2
:86:Salary March
:62F:C260302EUR1949,50
-}`;

describe("primitives", () => {
  it("amounts use a decimal comma", () => {
    expect(parseAmount("1234,56")).toBe("1234.56");
    expect(parseAmount("1500000,")).toBe("1500000");
    expect(parseAmount("12")).toBe("12");
    expect(parseAmount("1,234.56")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
  it("dates honour the year pivot and reject impossible days", () => {
    expect(swiftDate("260301", 79)).toBe("2026-03-01");
    expect(swiftDate("990301", 79)).toBe("1999-03-01");
    expect(swiftDate("990301", 99)).toBe("2099-03-01");
    expect(swiftDate("260230", 79)).toBeNull();
    expect(swiftDate("261301", 79)).toBeNull();
  });
  it("blocks respect nested braces", () => {
    const b = splitBlocks(MT103);
    expect(b.map((x) => x.id)).toEqual(["1", "2", "3", "4", "5"]);
    expect(b[2]!.body).toContain("{121:");
    expect(() => splitBlocks("{1:F01")).toThrow(/Unbalanced/);
  });
  it("block 4 joins continuation lines to their tag", () => {
    const f = parseBlock4("\n:20:X\n:50K:/ACC\nNAME\nADDR\n:71A:OUR\n-");
    expect(f.map((x) => x.tag)).toEqual(["20", "50K", "71A"]);
    expect(f[1]!.lines).toEqual(["/ACC", "NAME", "ADDR"]);
  });
  it("statement line", () => {
    const l = parseStatementLine("2603010301D250,50NTRFNONREF//BANKREF1\nSUPPLEMENTARY", 79)!;
    expect(l).toMatchObject({ valueDate: "2026-03-01", entryDate: "2026-03-01", mark: "D", amount: "250.50", transactionType: "NTRF", reference: "NONREF", bankReference: "BANKREF1", supplementary: "SUPPLEMENTARY" });
    expect(parseStatementLine("260301X1,00NMSC", 79)).toBeNull();
    expect(parseStatementLine("260301C1,00NMSCREF", 79)!.entryDate).toBeNull();
  });
});

describe("MT103", () => {
  const p = parseMt(MT103, O);
  it("headers", () => {
    expect(p.messageType).toBe("103");
    expect(p.header.basic).toMatchObject({ logicalTerminal: "BANKBEBBAXXX", sessionNumber: "0000", sequenceNumber: "000000" });
    expect(p.header.application).toMatchObject({ direction: "Input (to SWIFT)", destination: "BANKDEFFXXXX", priority: "N" });
    expect(p.header.user).toEqual({ "108": "MT103 EXAMPLE", "121": "eb6305c9-1f7f-49de-aed0-16487c27b42d" });
    expect(p.header.trailer).toEqual({ CHK: "123456789ABC" });
  });
  it("fields", () => {
    expect(p.details.valueDate).toEqual({ date: "2026-03-01", currency: "EUR", amount: "1234567.89" });
    expect(p.details.instructedAmount).toEqual({ currency: "USD", amount: "1500000" });
    expect(p.details.orderingCustomer).toEqual({ account: "DE89370400440532013000", name: "ACME GMBH", address: ["HAUPTSTRASSE 1", "10115 BERLIN"] });
    expect(p.details.beneficiary).toMatchObject({ account: "FR1420041010050500013M02606", name: "JEAN DUPONT" });
    expect(p.details.accountWithInstitution).toEqual({ bic: "BANKFRPP" });
    expect(p.details.charges).toBe("SHA");
  });
  it("no issues for a complete message", () => expect(p.issues).toEqual([]));
  it("flags missing and malformed fields", () => {
    const bad = MT103.replace(":71A:SHA\n", "").replace(":23B:CRED", ":23B:XXXX").replace(":32A:260301EUR1234567,89", ":32A:260231EUR12.5");
    const r = parseMt(bad, O).issues.join("\n");
    expect(r).toContain("requires field :71A:");
    expect(r).toContain(":23B:");
    expect(r).toContain(":32A:");
  });
  it("UETR must be a lower-case v4 UUID", () => {
    expect(parseMt(MT103.replace("eb6305c9-1f7f-49de-aed0-16487c27b42d", "EB6305C9"), O).issues.join()).toContain("{121:}");
    const withF121 = MT103.replace(":71A:SHA", ":71A:SHA\n:121:NOT-A-UUID");
    expect(parseMt(withF121, O).issues.join()).toContain(":121:");
  });
});

describe("MT940", () => {
  const p = parseMt(MT940, O);
  it("output header and balances", () => {
    expect(p.header.application).toMatchObject({ direction: "Output (from SWIFT)", messageType: "940", outputDate: "011410", priority: "N" });
    expect(p.details.openingBalance).toEqual({ mark: "C", date: "2026-02-28", currency: "EUR", amount: "1000.00" });
    expect(p.details.closingBalance).toEqual({ mark: "C", date: "2026-03-02", currency: "EUR", amount: "1949.50" });
  });
  it("lines carry their :86: text", () => {
    const lines = p.details.statementLines as Array<{ info: string; reference: string }>;
    expect(lines.map((l) => l.info)).toEqual(["Payment to ACME", "Salary March"]);
    expect(lines[1]!.reference).toBe("INV-77");
  });
  it("reconciles opening + lines = closing", () => {
    expect(p.details.balanceCheck).toMatch(/= closing/);
    expect(p.issues).toEqual([]);
  });
  it("detects a statement that does not add up", () => {
    const bad = MT940.replace("C260302EUR1949,50", "C260302EUR1949,51");
    expect(parseMt(bad, O).issues.join()).toContain("does not reconcile");
  });
  it("large amounts do not lose precision", () => {
    const big = MT940.replace("C260228EUR1000,00", "C260228EUR900719925474099,10").replace("C260302EUR1949,50", "C260302EUR900719925474099,10").replace("D250,50", "D0,01").replace("C1200,00", "C0,01");
    expect(parseMt(big, O).issues).toEqual([]);
  });
});

describe("wrapper", () => {
  it("summary text", () => {
    const out = fn(MT103).output;
    expect(out).toContain("Message type: MT103");
    expect(out).toContain("Amount:       EUR 1,234,567.89");
    expect(out).toContain("UETR:         eb6305c9-1f7f-49de-aed0-16487c27b42d");
    expect(out).toContain("No problems found.");
  });
  it("json and fields", () => {
    const j = JSON.parse(fn(MT940, { output: "json" }).output) as { messageType: string; fields: Array<{ tag: string; name: string }> };
    expect(j.messageType).toBe("940");
    expect(j.fields.find((f) => f.tag === "60F")!.name).toBe("Opening balance (final)");
    expect(fn(MT940, { output: "fields" }).output).toContain(":28C Statement number / sequence");
  });
  it("MT202 mandatory fields", () => {
    const mt202 = "{1:F01BANKBEBBAXXX0000000000}{2:I202BANKDEFFXXXXN}{4:\n:20:TRN1\n:21:REL1\n:32A:260301USD100,\n:58A:BANKFRPP\n-}";
    expect(parseMt(mt202, O).issues).toEqual([]);
    expect(parseMt(mt202.replace(":21:REL1\n", ""), O).issues.join()).toContain(":21:");
  });
  it("input errors", () => {
    expect(fn("hello").error).not.toBeNull();
    expect(fn("{1:F01BANKBEBBAXXX0000000000}").error?.message).toMatch(/Block 4/);
  });
});

const probe = spawnSync("python3", ["-c", "import mt940"], { encoding: "utf8" });
describe.skipIf(probe.status !== 0)("agrees with the python mt940 library", () => {
  it("balances, dates, signed amounts and references", () => {
    const script = `import sys,json,mt940\nt=mt940.models.Transactions()\nt.parse(sys.stdin.read())\nd=t.data\nprint(json.dumps({'ref':d['transaction_reference'],'acct':d['account_identification'],'open':[str(d['final_opening_balance'].amount.amount),d['final_opening_balance'].date.isoformat(),d['final_opening_balance'].amount.currency],'close':[str(d['final_closing_balance'].amount.amount),d['final_closing_balance'].date.isoformat()],'tx':[[x.data['date'].isoformat(),str(x.data['amount'].amount),x.data['status'],x.data['id'] if 'id' in x.data else None] for x in t]}))`;
    const body = MT940.split("{4:")[1]!.replace(/-\}$/, "").trim();
    const r = spawnSync("python3", ["-c", script], { input: body, encoding: "utf8" });
    const want = JSON.parse(r.stdout) as { ref: string; acct: string; open: string[]; close: string[]; tx: Array<[string, string, string]> };
    const p = parseMt(MT940, O);
    expect(p.details.reference).toBe(want.ref);
    expect(p.details.account).toBe(want.acct);
    const ob = p.details.openingBalance as { amount: string; date: string; currency: string };
    expect([Number(ob.amount), ob.date, ob.currency]).toEqual([Number(want.open[0]), want.open[1], want.open[2]]);
    const cb = p.details.closingBalance as { amount: string; date: string };
    expect([Number(cb.amount), cb.date]).toEqual([Number(want.close[0]), want.close[1]]);
    const lines = p.details.statementLines as Array<{ valueDate: string; amount: string; mark: string }>;
    expect(lines).toHaveLength(want.tx.length);
    lines.forEach((l, i) => {
      const w = want.tx[i]!;
      expect(l.valueDate).toBe(w[0]);
      expect((l.mark === "D" ? -1 : 1) * Number(l.amount)).toBe(Number(w[1]));
      expect(l.mark).toBe(w[2]);
    });
  });
});
