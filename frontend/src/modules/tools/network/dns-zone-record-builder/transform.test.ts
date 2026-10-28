import { describe, expect, it } from "vitest";
import { buildZone } from "./transform";

const o = { ttl: 3600, autoDot: true, alignColumns: true };

describe("buildZone", () => {
  it("builds aligned BIND records and adds trailing dots", () => {
    const r = buildZone("@ A 203.0.113.10\nwww CNAME example.com\n@ MX 10 mail.example.com\n@ TXT v=spf1 -all", o);
    expect(r.error).toBeNull();
    expect(r.output.split("\n")[0]).toBe("$TTL 3600");
    expect(r.output).toContain("CNAME example.com.");
    expect(r.output).toContain("MX    10 mail.example.com.");
    expect(r.output).toContain('TXT   "v=spf1 -all"');
  });
  it("honours per-record TTL and quoting", () => {
    const r = buildZone('@ 300 TXT "already quoted"', o).output;
    expect(r).toContain('@ 300 IN TXT "already quoted"');
  });
  it("splits long TXT values into 255-byte strings", () => {
    const r = buildZone("@ TXT " + "a".repeat(300), o).output;
    expect(r).toMatch(/"a{255}" "a{45}"/);
  });
  it("supports SRV and CAA", () => {
    const r = buildZone('_sip._tcp SRV 10 60 5060 sip.example.com\n@ CAA 0 issue letsencrypt.org', o).output;
    expect(r).toContain("10 60 5060 sip.example.com.");
    expect(r).toContain('0 issue "letsencrypt.org"');
  });
  it("applies the CNAME exclusivity rules", () => {
    expect(buildZone("www CNAME a.example.com.\nwww A 1.2.3.4", o).error?.message).toMatch(/already has a CNAME/);
    expect(buildZone("www A 1.2.3.4\nwww CNAME a.example.com.", o).error?.message).toMatch(/cannot coexist/);
    expect(buildZone("@ CNAME a.example.com.", o).error?.message).toMatch(/apex/);
  });
  it("validates values", () => {
    expect(buildZone("@ A 999.1.1.1", o).error?.message).toMatch(/IPv4/);
    expect(buildZone("@ MX mail.example.com.", o).error?.message).toMatch(/priority/);
    expect(buildZone("@ MX 10 1.2.3.4", o).error?.message).toMatch(/hostname/);
    expect(buildZone("@ SOA x", o).error?.message).toMatch(/Unsupported/);
    expect(buildZone("bad line", o).error?.line).toBe(1);
    expect(buildZone("", o)).toEqual({ output: "", error: null });
  });
});
