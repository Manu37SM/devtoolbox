import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeEmails } from "./transform";

const base = { lowercase: true, stripPlus: "gmail", gmailDots: true, unifyGmailDomain: true, dedupe: true } as const;

describe("normalizeEmail", () => {
  it("lowercases and always lowercases the domain", () => {
    expect(normalizeEmail("Ann@Example.COM", base)).toBe("ann@example.com");
    expect(normalizeEmail("Ann@Example.COM", { ...base, lowercase: false })).toBe("Ann@example.com");
  });
  it("strips +tags for Gmail only by default, or for all domains", () => {
    expect(normalizeEmail("a+news@gmail.com", base)).toBe("a@gmail.com");
    expect(normalizeEmail("a+news@corp.com", base)).toBe("a+news@corp.com");
    expect(normalizeEmail("a+news@corp.com", { ...base, stripPlus: "all" })).toBe("a@corp.com");
    expect(normalizeEmail("a+news@gmail.com", { ...base, stripPlus: "none" })).toBe("a+news@gmail.com");
  });
  it("removes dots only on Gmail", () => {
    expect(normalizeEmail("j.o.h.n@gmail.com", base)).toBe("john@gmail.com");
    expect(normalizeEmail("j.o.h.n@corp.com", base)).toBe("j.o.h.n@corp.com");
    expect(normalizeEmail("j.o@googlemail.com", base)).toBe("jo@gmail.com");
    expect(normalizeEmail("j.o@googlemail.com", { ...base, unifyGmailDomain: false })).toBe("jo@googlemail.com");
  });
  it("rejects malformed addresses", () => {
    expect(normalizeEmail("not-an-email", base)).toBeNull();
    expect(normalizeEmail("a@b", base)).toBeNull();
  });
});

describe("normalizeEmails", () => {
  it("dedupes equivalent addresses and flags invalid ones", () => {
    const out = normalizeEmails("A.B@gmail.com\nab+x@gmail.com\nbad\nc@d.org", base).output;
    expect(out).toBe("ab@gmail.com\n# invalid: bad\nc@d.org");
  });
  it("accepts comma and semicolon separated input and keeps duplicates when asked", () => {
    expect(normalizeEmails("a@b.co, a@b.co; c@d.co", { ...base, dedupe: false }).output).toBe("a@b.co\na@b.co\nc@d.co");
  });
  it("handles blank input", () => {
    expect(normalizeEmails("", base)).toEqual({ output: "", error: null });
  });
});
