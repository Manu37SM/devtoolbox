import type { TransformResult } from "@/lib/tool-transform";
import type { ApigeePolicyGeneratorOptions } from "./schema";

type Policy = ApigeePolicyGeneratorOptions["policy"];
const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Example fields for each policy; shown as the default input. */
export const EXAMPLES: Record<Policy, string> = {
  "spike-arrest": "name: SA-Protect\nrate: 30ps\nidentifier: client_id\nuse-effective-count: true",
  quota: "name: Q-PerApp\ncount: 1000\ninterval: 1\ntime-unit: hour\ntype: rollingwindow\nidentifier: client_id\ndistributed: true",
  "verify-api-key": "name: VA-Key\nkey-ref: request.header.x-api-key",
  "oauth-verify": "name: OA-VerifyToken\nscope: payments:read",
  "assign-message": "name: AM-Headers\ntarget: request\nset-headers: X-Correlation-Id={messageid}; X-Channel=mobile\nremove-headers: Authorization",
  "raise-fault": "name: RF-Unauthorized\nstatus: 401\nreason: Unauthorized\npayload: {\"error\":\"unauthorized\",\"message\":\"Missing or invalid API key\"}",
  cors: "name: CORS-Default\norigins: {request.header.origin}\nmethods: GET, POST, PUT, DELETE\nheaders: origin, x-requested-with, accept, content-type, authorization\nmax-age: 3600\ncredentials: false",
  "json-threat-protection": "name: JTP-Request\narray-elements: 100\ncontainer-depth: 10\nobject-entries: 50\nentry-name-length: 100\nstring-length: 2000",
  "access-control": "name: AC-Allowlist\nallow: 10.0.0.0/8, 203.0.113.17/32\ndefault: DENY",
  "response-cache": "name: RC-Products\nkey: request.uri, request.queryparam.lang\ntimeout: 300\nskip-if: request.header.Cache-Control = \"no-cache\"",
  "kvm-get": "name: KVM-GetBackendKey\nmap: backend-config\nkey: api_key\nassign-to: private.backend_api_key\nscope: environment",
  "extract-variables": "name: EV-Order\nsource: request\nprefix: order\njson: id=$.order.id; amount=$.order.total",
  "basic-auth-decode": "name: BA-Decode\nsource: request.header.Authorization\nuser: credentials.user\npassword: credentials.password",
  javascript: "name: JS-Transform\nresource: jsc://transform.js\ntime-limit: 200",
};

export function fields(input: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const r = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (r) m.set(r[1]!.toLowerCase(), r[2]!.trim()); }
  return m;
}
const pairs = (s: string | undefined) => (s ?? "").split(";").map((p) => p.trim()).filter(Boolean).map((p) => { const i = p.indexOf("="); return i < 0 ? [p, ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }) as [string, string][];
const csv = (s: string | undefined) => (s ?? "").split(",").map((p) => p.trim()).filter(Boolean);

function wrap(tag: string, name: string, inner: string[], attrs = ""): string {
  return [`<${tag} continueOnError="false" enabled="true" name="${x(name)}"${attrs}>`, `  <DisplayName>${x(name)}</DisplayName>`, ...inner.map((l) => `  ${l}`), `</${tag}>`].join("\n");
}

export function build(policy: Policy, f: Map<string, string>): { xml: string; notes: string[] } {
  const notes: string[] = [];
  const name = f.get("name") || { "spike-arrest": "SA-Protect", quota: "Q-Limit", "verify-api-key": "VA-Key", "oauth-verify": "OA-VerifyToken", "assign-message": "AM-Message", "raise-fault": "RF-Fault", cors: "CORS-Policy", "json-threat-protection": "JTP-Request", "access-control": "AC-Allowlist", "response-cache": "RC-Cache", "kvm-get": "KVM-Get", "extract-variables": "EV-Extract", "basic-auth-decode": "BA-Decode", javascript: "JS-Script" }[policy];
  if (!/^[A-Za-z0-9._\-$ %]+$/.test(name)) notes.push("Policy names may contain only letters, numbers and ._-$ % characters.");
  switch (policy) {
    case "spike-arrest": {
      const rate = f.get("rate") ?? "30ps";
      if (!/^\d+(ps|pm)$/.test(rate)) notes.push("Rate must be a number followed by ps (per second) or pm (per minute).");
      const inner = [`<Rate>${x(rate)}</Rate>`];
      if (f.get("identifier")) inner.push(`<Identifier ref="${x(f.get("identifier")!)}"/>`);
      if (f.get("use-effective-count")) inner.push(`<UseEffectiveCount>${f.get("use-effective-count") === "true"}</UseEffectiveCount>`);
      notes.push("SpikeArrest smooths bursts (30ps allows about one request every 33 ms per message processor unless UseEffectiveCount is true). Use Quota for business limits.");
      return { xml: wrap("SpikeArrest", name, inner), notes };
    }
    case "quota": {
      const type = f.get("type") ?? "rollingwindow";
      const unit = f.get("time-unit") ?? "hour";
      if (!/^(minute|hour|day|week|month)$/.test(unit)) notes.push("time-unit must be minute, hour, day, week or month.");
      const inner = [`<Allow count="${x(f.get("count") ?? "1000")}"/>`, `<Interval>${x(f.get("interval") ?? "1")}</Interval>`, `<TimeUnit>${x(unit)}</TimeUnit>`];
      if (type === "calendar") inner.push(`<StartTime>${x(f.get("start-time") ?? "2024-01-01 00:00:00")}</StartTime>`);
      if (f.get("identifier")) inner.push(`<Identifier ref="${x(f.get("identifier")!)}"/>`);
      inner.push(`<Distributed>${f.get("distributed") ?? "true"}</Distributed>`, `<Synchronous>${f.get("synchronous") ?? "false"}</Synchronous>`);
      if (!f.get("identifier")) notes.push("Without an Identifier one counter is shared by all callers of the proxy.");
      return { xml: wrap("Quota", name, inner, ` type="${x(type)}"`), notes };
    }
    case "verify-api-key":
      notes.push("Prefer a header over a query parameter: query strings end up in access logs.");
      return { xml: wrap("VerifyAPIKey", name, [`<APIKey ref="${x(f.get("key-ref") ?? "request.header.x-api-key")}"/>`]), notes };
    case "oauth-verify": {
      const inner = ["<Operation>VerifyAccessToken</Operation>"];
      if (f.get("scope")) inner.push(`<Scope>${x(f.get("scope")!)}</Scope>`);
      return { xml: wrap("OAuthV2", name, inner), notes };
    }
    case "assign-message": {
      const target = f.get("target") === "response" ? "response" : "request";
      const set = pairs(f.get("set-headers"));
      const remove = csv(f.get("remove-headers"));
      const inner: string[] = [];
      if (remove.length) inner.push("<Remove>", "  <Headers>", ...remove.map((h) => `    <Header name="${x(h)}"/>`), "  </Headers>", "</Remove>");
      if (set.length || f.get("payload")) {
        inner.push("<Set>");
        if (set.length) inner.push("  <Headers>", ...set.map(([k, v]) => `    <Header name="${x(k)}">${x(v)}</Header>`), "  </Headers>");
        if (f.get("payload")) inner.push(`  <Payload contentType="${x(f.get("content-type") ?? "application/json")}">${x(f.get("payload")!)}</Payload>`);
        inner.push("</Set>");
      }
      inner.push("<IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>", `<AssignTo createNew="false" transport="http" type="${target}"/>`);
      return { xml: wrap("AssignMessage", name, inner), notes };
    }
    case "raise-fault": {
      const status = f.get("status") ?? "400";
      if (!/^[1-5]\d\d$/.test(status)) notes.push("status must be an HTTP status code.");
      const inner = ["<FaultResponse>", "  <Set>"];
      if (f.get("payload")) inner.push(`    <Payload contentType="${x(f.get("content-type") ?? "application/json")}">${x(f.get("payload")!)}</Payload>`);
      inner.push(`    <StatusCode>${x(status)}</StatusCode>`, `    <ReasonPhrase>${x(f.get("reason") ?? "Bad Request")}</ReasonPhrase>`, "  </Set>", "</FaultResponse>", "<IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>");
      return { xml: wrap("RaiseFault", name, inner), notes };
    }
    case "cors": {
      const creds = f.get("credentials") === "true";
      const origins = f.get("origins") ?? "{request.header.origin}";
      if (creds && origins.trim() === "*") notes.push("Browsers reject Access-Control-Allow-Origin: * together with credentials; list explicit origins.");
      if (origins.includes("{request.header.origin}")) notes.push("Echoing request.header.origin allows every origin. Use an explicit list for APIs that rely on cookies or other ambient credentials.");
      return { xml: wrap("CORS", name, [`<AllowOrigins>${x(origins)}</AllowOrigins>`, `<AllowMethods>${x(f.get("methods") ?? "GET, POST, PUT, DELETE")}</AllowMethods>`, `<AllowHeaders>${x(f.get("headers") ?? "origin, x-requested-with, accept, content-type")}</AllowHeaders>`, `<ExposeHeaders>${x(f.get("expose") ?? "*")}</ExposeHeaders>`, `<MaxAge>${x(f.get("max-age") ?? "3600")}</MaxAge>`, `<AllowCredentials>${creds}</AllowCredentials>`, "<GeneratePreflightResponse>true</GeneratePreflightResponse>", "<IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>"]), notes };
    }
    case "json-threat-protection":
      return { xml: wrap("JSONThreatProtection", name, [`<ArrayElementCount>${x(f.get("array-elements") ?? "100")}</ArrayElementCount>`, `<ContainerDepth>${x(f.get("container-depth") ?? "10")}</ContainerDepth>`, `<ObjectEntryCount>${x(f.get("object-entries") ?? "50")}</ObjectEntryCount>`, `<ObjectEntryNameLength>${x(f.get("entry-name-length") ?? "100")}</ObjectEntryNameLength>`, `<Source>${x(f.get("source") ?? "request")}</Source>`, `<StringValueLength>${x(f.get("string-length") ?? "2000")}</StringValueLength>`]), notes: [...notes, "Runs only when Content-Type is application/json; pair it with a body size limit at the load balancer."] };
    case "access-control": {
      const def = (f.get("default") ?? "DENY").toUpperCase() === "ALLOW" ? "ALLOW" : "DENY";
      const allow = csv(f.get("allow"));
      const deny = csv(f.get("deny"));
      const rule = (action: string, cidr: string) => {
        const [ip, mask] = cidr.split("/");
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip!)) notes.push(`"${cidr}" is not an IPv4 address or CIDR.`);
        return [`  <MatchRule action="${action}">`, `    <SourceAddress mask="${x(mask ?? "32")}">${x(ip!)}</SourceAddress>`, "  </MatchRule>"];
      };
      notes.push("Behind a load balancer, set <ClientIPVariable> or check the X-Forwarded-For handling, otherwise the rule sees the load balancer's IP.");
      return { xml: wrap("AccessControl", name, [`<IPRules noRuleMatchAction="${def}">`, ...allow.flatMap((c) => rule("ALLOW", c)), ...deny.flatMap((c) => rule("DENY", c)), "</IPRules>"]), notes };
    }
    case "response-cache": {
      const keys = csv(f.get("key") ?? "request.uri");
      const inner = ["<CacheKey>", ...keys.map((k) => `  <KeyFragment ref="${x(k)}"/>`), "</CacheKey>", "<ExpirySettings>", `  <TimeoutInSeconds>${x(f.get("timeout") ?? "300")}</TimeoutInSeconds>`, "</ExpirySettings>"];
      if (f.get("skip-if")) inner.push(`<SkipCacheLookup>${x(f.get("skip-if")!)}</SkipCacheLookup>`);
      notes.push("Attach the same policy in the request PreFlow (lookup) and the response flow (populate). Never cache responses that depend on the caller unless the key includes the caller identity.");
      return { xml: wrap("ResponseCache", name, inner), notes };
    }
    case "kvm-get": {
      const assign = f.get("assign-to") ?? "private.value";
      if (!assign.startsWith("private.")) notes.push("Prefix variables holding secrets with private. so they are masked in Trace/Debug sessions.");
      return { xml: [`<KeyValueMapOperations continueOnError="false" enabled="true" name="${x(name)}" mapIdentifier="${x(f.get("map") ?? "config")}">`, `  <DisplayName>${x(name)}</DisplayName>`, `  <Scope>${x(f.get("scope") ?? "environment")}</Scope>`, `  <ExpiryTimeInSecs>${x(f.get("cache-seconds") ?? "300")}</ExpiryTimeInSecs>`, `  <Get assignTo="${x(assign)}">`, "    <Key>", `      <Parameter>${x(f.get("key") ?? "key")}</Parameter>`, "    </Key>", "  </Get>", "</KeyValueMapOperations>"].join("\n"), notes };
    }
    case "extract-variables": {
      const json = pairs(f.get("json"));
      const inner = [`<Source clearPayload="false">${x(f.get("source") ?? "request")}</Source>`];
      if (json.length) inner.push("<JSONPayload>", ...json.flatMap(([v, p]) => [`  <Variable name="${x(v)}">`, `    <JSONPath>${x(p)}</JSONPath>`, "  </Variable>"]), "</JSONPayload>");
      if (f.get("prefix")) inner.push(`<VariablePrefix>${x(f.get("prefix")!)}</VariablePrefix>`);
      inner.push("<IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>");
      if (f.get("prefix")) notes.push(`Extracted values are available as ${f.get("prefix")}.<name>, e.g. ${f.get("prefix")}.${json[0]?.[0] ?? "id"}.`);
      return { xml: wrap("ExtractVariables", name, inner), notes };
    }
    case "basic-auth-decode":
      return { xml: wrap("BasicAuthentication", name, ["<Operation>Decode</Operation>", "<IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>", `<User ref="${x(f.get("user") ?? "credentials.user")}"/>`, `<Password ref="${x(f.get("password") ?? "credentials.password")}"/>`, `<Source>${x(f.get("source") ?? "request.header.Authorization")}</Source>`]), notes };
    case "javascript": {
      const res = f.get("resource") ?? "jsc://script.js";
      if (!/^jsc:\/\//.test(res)) notes.push("ResourceURL must use the jsc:// scheme and match a file under apiproxy/resources/jsc/.");
      return { xml: [`<Javascript continueOnError="false" enabled="true" timeLimit="${x(f.get("time-limit") ?? "200")}" name="${x(name)}">`, `  <DisplayName>${x(name)}</DisplayName>`, `  <ResourceURL>${x(res)}</ResourceURL>`, "</Javascript>"].join("\n"), notes };
    }
  }
}

const ATTACH: Record<Policy, string> = {
  "spike-arrest": "ProxyEndpoint PreFlow Request, first step", quota: "ProxyEndpoint PreFlow Request, after authentication", "verify-api-key": "ProxyEndpoint PreFlow Request, first step",
  "oauth-verify": "ProxyEndpoint PreFlow Request, first step", "assign-message": "the flow that should modify the message", "raise-fault": "a conditional Step or a FaultRule",
  cors: "ProxyEndpoint PreFlow Request (it answers preflight OPTIONS itself)", "json-threat-protection": "ProxyEndpoint PreFlow Request, before parsing the body",
  "access-control": "ProxyEndpoint PreFlow Request, first step", "response-cache": "ProxyEndpoint PreFlow Request and TargetEndpoint PostFlow Response",
  "kvm-get": "before the step that needs the value", "extract-variables": "after the message is available", "basic-auth-decode": "ProxyEndpoint PreFlow Request", javascript: "where the script should run",
};

export function runApigeePolicyGenerator(input: string, options: ApigeePolicyGeneratorOptions): TransformResult {
  const f = fields(input);
  const { xml, notes } = build(options.policy, f);
  const name = /name="([^"]+)"/.exec(xml)?.[1] ?? "Policy";
  return {
    output: [`<!-- apiproxy/policies/${name}.xml -->`, xml, "", `<!-- Attach: ${ATTACH[options.policy]} -->`, "<Step>", `  <Name>${name}</Name>`, "</Step>", ...(notes.length ? ["", ...notes.map((n) => `<!-- Note: ${n.replace(/--/g, "- -")} -->`)] : [])].join("\n"),
    error: null,
  };
}
