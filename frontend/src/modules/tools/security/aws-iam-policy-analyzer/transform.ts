import type { TransformResult } from "@/lib/tool-transform";
import type { AwsIamPolicyAnalyzerOptions } from "./schema";

type Sev = "error" | "warning" | "info";
export interface Finding { severity: Sev; sid: string; message: string }
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

const ESCALATION = [
  "iam:CreatePolicyVersion", "iam:SetDefaultPolicyVersion", "iam:AttachUserPolicy", "iam:AttachRolePolicy", "iam:AttachGroupPolicy",
  "iam:PutUserPolicy", "iam:PutRolePolicy", "iam:PutGroupPolicy", "iam:CreateAccessKey", "iam:CreateLoginProfile", "iam:UpdateLoginProfile",
  "iam:UpdateAssumeRolePolicy", "iam:AddUserToGroup", "iam:PassRole", "lambda:UpdateFunctionCode", "glue:UpdateDevEndpoint", "ssm:SendCommand",
];
const SENSITIVE = ["secretsmanager:GetSecretValue", "kms:Decrypt", "s3:PutBucketPolicy", "s3:DeleteBucket", "s3:PutBucketAcl", "ssm:GetParameter", "ssm:GetParameters", "dynamodb:DeleteTable", "rds:DeleteDBInstance", "ec2:TerminateInstances", "cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "organizations:LeaveOrganization"];

export const patternRe = (p: string) => new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
export const matchesAny = (patterns: string[], action: string) => patterns.some((p) => patternRe(p).test(action));

function principalList(p: unknown): { kind: string; value: string }[] {
  if (p === "*") return [{ kind: "AWS", value: "*" }];
  if (!isObj(p)) return [];
  return Object.entries(p).flatMap(([kind, v]) => list(v).map((value) => ({ kind, value })));
}

function describeConditions(c: unknown): string {
  if (!isObj(c)) return "";
  const parts: string[] = [];
  for (const [op, block] of Object.entries(c)) if (isObj(block)) for (const [key, val] of Object.entries(block)) parts.push(`${key} ${op} ${list(val).join(" | ")}`);
  return parts.length ? ` when ${parts.join(" and ")}` : "";
}

export function analyze(policy: Obj): { findings: Finding[]; explanations: string[] } {
  const findings: Finding[] = [];
  const explanations: string[] = [];
  const add = (severity: Sev, sid: string, message: string) => findings.push({ severity, sid, message });
  if (policy.Version === undefined) add("warning", "-", 'No "Version": AWS defaults to 2008-10-17, which does not support policy variables like ${aws:username}. Use "2012-10-17".');
  else if (policy.Version !== "2012-10-17") add("warning", "-", `Version "${String(policy.Version)}" is outdated; use "2012-10-17".`);
  const raw = policy.Statement;
  const statements = (Array.isArray(raw) ? raw : raw !== undefined ? [raw] : []).filter(isObj);
  if (!statements.length) add("error", "-", "No Statement found.");
  const sids = new Map<string, number>();
  const anyDenyInsecure = statements.some((s) => s.Effect === "Deny" && JSON.stringify(s.Condition ?? {}).includes("aws:SecureTransport"));

  statements.forEach((s, i) => {
    const sid = typeof s.Sid === "string" && s.Sid ? s.Sid : `#${i + 1}`;
    if (typeof s.Sid === "string" && s.Sid) sids.set(s.Sid, (sids.get(s.Sid) ?? 0) + 1);
    const effect = String(s.Effect ?? "");
    if (effect !== "Allow" && effect !== "Deny") { add("error", sid, `Effect must be "Allow" or "Deny", got "${effect}".`); return; }
    const actions = list(s.Action), notActions = list(s.NotAction);
    const resources = list(s.Resource), notResources = list(s.NotResource);
    const principals = principalList(s.Principal);
    const hasCondition = isObj(s.Condition) && Object.keys(s.Condition).length > 0;
    const allow = effect === "Allow";
    const allResources = resources.includes("*") || (resources.length === 0 && notResources.length === 0);

    if (!actions.length && !notActions.length) add("error", sid, "Statement has no Action or NotAction.");
    if (allow) {
      if (actions.includes("*") && allResources) add("error", sid, hasCondition ? "Allows every action on every resource (only limited by its Condition)." : "Grants full administrator access: Action \"*\" on Resource \"*\".");
      else if (actions.includes("*")) add("error", sid, "Allows every action (Action \"*\") on the listed resources.");
      for (const a of actions.filter((x) => /^[\w-]+:\*$/.test(x))) if (allResources) add("warning", sid, `${a} on Resource "*" grants every ${a.split(":")[0]} action across the account.`);
      if (notActions.length) add("warning", sid, `Allow with NotAction grants every action except ${notActions.join(", ")}, including ones AWS adds in future.`);
      if (notResources.length) add("warning", sid, `Allow with NotResource applies to every resource except ${notResources.join(", ")}.`);
      const effective = (a: string) => (actions.length ? matchesAny(actions, a) : notActions.length ? !matchesAny(notActions, a) : false);
      const esc = ESCALATION.filter(effective);
      if (esc.includes("iam:PassRole") && allResources) add("error", sid, "iam:PassRole on Resource \"*\" lets the caller hand any role (including admin roles) to a service it controls.");
      const otherEsc = esc.filter((a) => a !== "iam:PassRole");
      if (otherEsc.length && !actions.includes("*")) add("error", sid, `Privilege escalation risk: allows ${otherEsc.slice(0, 6).join(", ")}${otherEsc.length > 6 ? `, and ${otherEsc.length - 6} more` : ""}.`);
      const sens = SENSITIVE.filter(effective);
      if (sens.length && allResources && !actions.includes("*")) add("warning", sid, `Sensitive actions on Resource "*": ${sens.join(", ")}. Scope them to specific ARNs.`);
      if (principals.some((p) => p.value === "*") && !hasCondition) add("error", sid, "Principal \"*\" without a Condition makes this resource public to anyone, including unauthenticated callers.");
      if (principals.some((p) => p.value === "*") && hasCondition) add("info", sid, "Principal \"*\" is limited only by the Condition; make sure it pins an account, organisation (aws:PrincipalOrgID) or VPC endpoint.");
      for (const p of principals.filter((x) => x.kind === "Federated")) {
        const cond = JSON.stringify(s.Condition ?? {});
        if (/token\.actions\.githubusercontent\.com/.test(p.value) && !/:sub"/.test(cond)) add("error", sid, "GitHub OIDC trust without a token.actions.githubusercontent.com:sub condition lets any GitHub repository assume this role.");
        if (/token\.actions\.githubusercontent\.com/.test(p.value) && /:sub"\s*:\s*"repo:[^"]*\*/.test(cond)) add("warning", sid, "The GitHub OIDC sub condition uses a wildcard; pin repo and branch or environment where possible.");
      }
      if (principals.some((p) => p.kind === "AWS" && /^\d{12}$|:root$/.test(p.value)) && actions.some((a) => /sts:AssumeRole/i.test(a)) && !hasCondition) add("info", sid, "Trusts a whole account: any principal there that is allowed sts:AssumeRole can use this role. Consider aws:PrincipalArn or sts:ExternalId conditions.");
    }
    if (principals.length && resources.some((r) => r.startsWith("arn:aws:s3:::")) && allow && !anyDenyInsecure) add("info", sid, "Bucket policy has no Deny for aws:SecureTransport = false, so plain HTTP requests are allowed.");

    const what = actions.length ? actions.join(", ") : `everything except ${notActions.join(", ")}`;
    const where = resources.length ? resources.join(", ") : notResources.length ? `every resource except ${notResources.join(", ")}` : "(no resource: this is a resource-based or trust policy)";
    const who = principals.length ? ` to ${principals.map((p) => `${p.kind} ${p.value}`).join(", ")}` : "";
    explanations.push(`${sid}: ${effect === "Allow" ? "Allows" : "Denies"} ${what}${who} on ${where}${describeConditions(s.Condition)}.`);
  });
  for (const [sid, n] of sids) if (n > 1) add("warning", sid, `Sid "${sid}" is used ${n} times; Sids should be unique.`);
  return { findings, explanations };
}

const RANK: Record<Sev, number> = { info: 0, warning: 1, error: 2 };

export function runAwsIamPolicyAnalyzer(input: string, options: AwsIamPolicyAnalyzerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let doc: unknown;
  try { doc = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  if (!isObj(doc)) return { output: "", error: { message: "Expected a policy document object." } };
  const policy = isObj(doc.PolicyDocument) ? doc.PolicyDocument : isObj(doc.AssumeRolePolicyDocument) ? doc.AssumeRolePolicyDocument : doc;
  const { findings, explanations } = analyze(policy);
  const shown = findings.filter((f) => RANK[f.severity] >= RANK[options.minSeverity]).sort((a, b) => RANK[b.severity] - RANK[a.severity]);
  const counts = (["error", "warning", "info"] as Sev[]).map((s) => `${findings.filter((f) => f.severity === s).length} ${s}${findings.filter((f) => f.severity === s).length === 1 ? "" : "s"}`).join(", ");
  const out = [`Findings: ${counts}`, ...shown.map((f) => `  [${f.severity.toUpperCase()}] ${f.sid}: ${f.message}`), "", "What this policy does:", ...explanations.map((e) => `  ${e}`), "", "Static checks only; effective permissions also depend on SCPs, permission boundaries, session policies and resource policies."];
  return { output: out.join("\n"), error: null };
}
