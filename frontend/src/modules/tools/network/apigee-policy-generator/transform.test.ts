import { describe, expect, it } from "vitest";
import { parseXml } from "../../data-format/xml-core";
import { EXAMPLES, runApigeePolicyGenerator } from "./transform";
import type { ApigeePolicyGeneratorOptions } from "./schema";

const run = (policy: ApigeePolicyGeneratorOptions["policy"], input = EXAMPLES[policy]) => runApigeePolicyGenerator(input, { policy }).output;

describe("runApigeePolicyGenerator", () => {
  it("every example produces well-formed XML with a Step", () => {
    for (const policy of Object.keys(EXAMPLES) as ApigeePolicyGeneratorOptions["policy"][]) {
      const out = run(policy);
      const policyXml = out.split("\n\n")[0]!.split("\n").filter((l) => !l.startsWith("<!--")).join("\n");
      expect(() => parseXml(policyXml), policy).not.toThrow();
      expect(out).toContain("<Step>");
    }
  });
  it("spike arrest and quota", () => {
    expect(run("spike-arrest")).toContain('<SpikeArrest continueOnError="false" enabled="true" name="SA-Protect">\n  <DisplayName>SA-Protect</DisplayName>\n  <Rate>30ps</Rate>\n  <Identifier ref="client_id"/>\n  <UseEffectiveCount>true</UseEffectiveCount>\n</SpikeArrest>');
    expect(run("quota")).toContain('<Quota continueOnError="false" enabled="true" name="Q-PerApp" type="rollingwindow">');
    expect(run("quota", "type: calendar\ncount: 10")).toContain("<StartTime>2024-01-01 00:00:00</StartTime>");
    expect(run("quota", "count: 10")).toContain("Without an Identifier");
    expect(run("spike-arrest", "rate: 30")).toContain("Rate must be a number followed by ps");
  });
  it("assign message escapes values and targets the right message", () => {
    const out = run("assign-message", "name: AM-X\ntarget: response\nset-headers: X-A=a&b; X-B=<c>\nremove-headers: Server, X-Powered-By");
    expect(out).toContain('<Header name="X-A">a&amp;b</Header>');
    expect(out).toContain('<Header name="X-B">&lt;c&gt;</Header>');
    expect(out).toContain('<Header name="X-Powered-By"/>');
    expect(out).toContain('<AssignTo createNew="false" transport="http" type="response"/>');
  });
  it("security policies", () => {
    expect(run("access-control")).toContain('<IPRules noRuleMatchAction="DENY">\n    <MatchRule action="ALLOW">\n      <SourceAddress mask="8">10.0.0.0</SourceAddress>');
    expect(run("cors", "origins: *\ncredentials: true")).toContain("Browsers reject Access-Control-Allow-Origin: * together with credentials");
    expect(run("kvm-get", "assign-to: backend_key")).toContain("Prefix variables holding secrets with private.");
    expect(run("raise-fault")).toContain('<Payload contentType="application/json">{&quot;error&quot;:&quot;unauthorized&quot;');
  });
  it("response cache uses TimeoutInSeconds and lists key fragments", () => {
    const out = run("response-cache");
    expect(out).toContain('<KeyFragment ref="request.uri"/>\n    <KeyFragment ref="request.queryparam.lang"/>');
    expect(out).toContain("<TimeoutInSeconds>300</TimeoutInSeconds>");
    expect(out).toContain("<SkipCacheLookup>request.header.Cache-Control = &quot;no-cache&quot;</SkipCacheLookup>");
  });
  it("extract variables and javascript", () => {
    expect(run("extract-variables")).toContain('<Variable name="amount">\n      <JSONPath>$.order.total</JSONPath>');
    expect(run("javascript", "resource: transform.js")).toContain("must use the jsc:// scheme");
  });
});
