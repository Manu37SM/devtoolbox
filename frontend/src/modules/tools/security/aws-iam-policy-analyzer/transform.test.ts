import { describe, expect, it } from "vitest";
import { analyze, matchesAny, runAwsIamPolicyAnalyzer } from "./transform";

const msgs = (p: unknown) => analyze(p as Record<string, unknown>).findings.map((f) => `${f.severity}:${f.message}`);

describe("matchesAny", () => {
  it("expands IAM wildcards case-insensitively", () => {
    expect(matchesAny(["iam:Put*"], "iam:PutRolePolicy")).toBe(true);
    expect(matchesAny(["IAM:passrole"], "iam:PassRole")).toBe(true);
    expect(matchesAny(["s3:Get?bject"], "s3:GetObject")).toBe(true);
    expect(matchesAny(["s3:*"], "iam:PassRole")).toBe(false);
  });
});

describe("analyze", () => {
  it("flags administrator access", () => {
    expect(msgs({ Version: "2012-10-17", Statement: { Effect: "Allow", Action: "*", Resource: "*" } })).toContain('error:Grants full administrator access: Action "*" on Resource "*".');
  });
  it("finds privilege escalation through wildcards and PassRole", () => {
    const m = msgs({ Version: "2012-10-17", Statement: [{ Sid: "Ops", Effect: "Allow", Action: ["iam:Put*", "iam:PassRole", "s3:*"], Resource: "*" }] });
    expect(m).toContain('error:iam:PassRole on Resource "*" lets the caller hand any role (including admin roles) to a service it controls.');
    expect(m.find((x) => x.startsWith("error:Privilege escalation"))).toBe("error:Privilege escalation risk: allows iam:PutUserPolicy, iam:PutRolePolicy, iam:PutGroupPolicy.");
    expect(m).toContain('warning:s3:* on Resource "*" grants every s3 action across the account.');
  });
  it("warns on NotAction and old versions", () => {
    const m = msgs({ Version: "2008-10-17", Statement: [{ Effect: "Allow", NotAction: "iam:*", Resource: "*" }] });
    expect(m[0]).toBe('warning:Version "2008-10-17" is outdated; use "2012-10-17".');
    expect(m).toContain("warning:Allow with NotAction grants every action except iam:*, including ones AWS adds in future.");
    expect(m.some((x) => x.includes("secretsmanager:GetSecretValue"))).toBe(true);
  });
  it("flags public bucket policies and missing TLS enforcement", () => {
    const m = msgs({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::site/*" }] });
    expect(m).toContain('error:Principal "*" without a Condition makes this resource public to anyone, including unauthenticated callers.');
    expect(m).toContain("info:Bucket policy has no Deny for aws:SecureTransport = false, so plain HTTP requests are allowed.");
  });
  it("catches GitHub OIDC trust policies without a sub condition", () => {
    const trust = { Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Federated: "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }, Action: "sts:AssumeRoleWithWebIdentity", Condition: { StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" } } }] };
    expect(msgs(trust).some((x) => x.includes("lets any GitHub repository assume this role"))).toBe(true);
    const pinned = JSON.parse(JSON.stringify(trust));
    pinned.Statement[0].Condition.StringLike = { "token.actions.githubusercontent.com:sub": "repo:acme/*" };
    expect(msgs(pinned).some((x) => x.includes("lets any GitHub repository"))).toBe(false);
    expect(msgs(pinned).some((x) => x.includes("uses a wildcard"))).toBe(true);
  });
  it("is quiet for a well-scoped policy", () => {
    expect(msgs({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: ["s3:GetObject"], Resource: "arn:aws:s3:::reports/*" }] })).toEqual([]);
  });
});

describe("runAwsIamPolicyAnalyzer", () => {
  it("explains statements in plain English and filters by severity", () => {
    const doc = { Version: "2012-10-17", Statement: [{ Sid: "Read", Effect: "Allow", Action: ["s3:GetObject", "s3:ListBucket"], Resource: ["arn:aws:s3:::r", "arn:aws:s3:::r/*"], Condition: { IpAddress: { "aws:SourceIp": "10.0.0.0/8" } } }, { Sid: "Read", Effect: "Deny", Action: "s3:*", Resource: "*", Condition: { Bool: { "aws:SecureTransport": "false" } } }] };
    const out = runAwsIamPolicyAnalyzer(JSON.stringify(doc), { minSeverity: "warning" }).output;
    expect(out).toContain('Read: Allows s3:GetObject, s3:ListBucket on arn:aws:s3:::r, arn:aws:s3:::r/* when aws:SourceIp IpAddress 10.0.0.0/8.');
    expect(out).toContain('[WARNING] Read: Sid "Read" is used 2 times');
    expect(out).toContain("Findings: 0 errors, 1 warning, 0 infos");
  });
  it("unwraps CloudFormation-style documents and rejects bad JSON", () => {
    expect(runAwsIamPolicyAnalyzer(JSON.stringify({ PolicyDocument: { Statement: { Effect: "Allow", Action: "*", Resource: "*" } } }), { minSeverity: "info" }).output).toContain("full administrator access");
    expect(runAwsIamPolicyAnalyzer("{", { minSeverity: "info" }).error?.message).toContain("Invalid JSON");
  });
});
