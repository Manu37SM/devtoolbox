import type { TransformResult } from "@/lib/tool-transform";
import type { SecurityHeadersGeneratorOptions } from "./schema";

const FIELD_TO_HEADER: Record<string, string> = {
  hsts: "Strict-Transport-Security", csp: "Content-Security-Policy", "csp-report-only": "Content-Security-Policy-Report-Only",
  "referrer-policy": "Referrer-Policy", "permissions-policy": "Permissions-Policy", "frame-options": "X-Frame-Options",
  coop: "Cross-Origin-Opener-Policy", coep: "Cross-Origin-Embedder-Policy", corp: "Cross-Origin-Resource-Policy",
  "content-type-options": "X-Content-Type-Options", "xss-protection": "X-XSS-Protection", "cache-control": "Cache-Control",
};

export function collect(input: string): { headers: [string, string][]; warnings: string[] } {
  const headers: [string, string][] = [];
  const warnings: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    const m = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (!value) continue;
    const name = FIELD_TO_HEADER[key] ?? m[1]!;
    headers.push([name, value]);
  }
  if (!headers.some(([n]) => n === "X-Content-Type-Options")) headers.push(["X-Content-Type-Options", "nosniff"]);
  const get = (n: string) => headers.find(([h]) => h === n)?.[1];
  const hsts = get("Strict-Transport-Security");
  if (hsts) {
    const age = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? NaN);
    if (Number.isNaN(age)) warnings.push("HSTS needs max-age=<seconds>.");
    else if (age < 15552000) warnings.push(`HSTS max-age ${age}s is under 180 days; most scanners expect at least 15552000.`);
    if (/preload/i.test(hsts) && (!/includeSubDomains/i.test(hsts) || age < 31536000)) warnings.push("HSTS preload requires includeSubDomains and max-age >= 31536000 (hstspreload.org).");
  }
  const csp = get("Content-Security-Policy");
  if (csp) {
    const script = /script-src([^;]*)/.exec(csp)?.[1] ?? /default-src([^;]*)/.exec(csp)?.[1] ?? "";
    if (/'unsafe-inline'/.test(script) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(script)) warnings.push("script-src allows 'unsafe-inline' without nonces or hashes, which defeats most of CSP's XSS protection.");
    if (/'unsafe-eval'/.test(script)) warnings.push("script-src allows 'unsafe-eval'.");
    if (!/object-src/.test(csp) && !/default-src\s+'none'/.test(csp)) warnings.push("Add object-src 'none' to the CSP.");
    if (!/frame-ancestors/.test(csp) && !get("X-Frame-Options")) warnings.push("Neither frame-ancestors nor X-Frame-Options is set: the page can be framed (clickjacking).");
  } else warnings.push("No Content-Security-Policy. Build one with the CSP Builder tool.");
  const xss = get("X-XSS-Protection");
  if (xss && xss !== "0") warnings.push("X-XSS-Protection is deprecated and the 1; mode=block filter caused vulnerabilities; send 0 or omit it.");
  if (get("Cross-Origin-Embedder-Policy") === "require-corp") warnings.push("COEP require-corp blocks cross-origin resources that do not send CORP/CORS headers; test before enabling.");
  if (!get("Referrer-Policy")) warnings.push("No Referrer-Policy; strict-origin-when-cross-origin is a safe default.");
  return { headers, warnings };
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dq = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const javaStr = (s: string) => `"${dq(s)}"`;

const SPRING_REFERRER: Record<string, string> = {
  "no-referrer": "NO_REFERRER", "no-referrer-when-downgrade": "NO_REFERRER_WHEN_DOWNGRADE", origin: "ORIGIN", "origin-when-cross-origin": "ORIGIN_WHEN_CROSS_ORIGIN",
  "same-origin": "SAME_ORIGIN", "strict-origin": "STRICT_ORIGIN", "strict-origin-when-cross-origin": "STRICT_ORIGIN_WHEN_CROSS_ORIGIN", "unsafe-url": "UNSAFE_URL",
};

export function render(headers: [string, string][], target: SecurityHeadersGeneratorOptions["target"]): string {
  switch (target) {
    case "nginx":
      return ["# server {} or location {} block. add_header in a nested block replaces ALL inherited add_header lines.", "server_tokens off;", ...headers.map(([n, v]) => `add_header ${n} "${dq(v)}" always;`)].join("\n");
    case "apache":
      return ["# Requires mod_headers. Put in the VirtualHost or .htaccess.", "ServerTokens Prod", "ServerSignature Off", "Header always unset X-Powered-By", ...headers.map(([n, v]) => `Header always set ${n} "${dq(v)}"`)].join("\n");
    case "express":
      return ["// Plain middleware with no extra dependency; helmet() offers the same with more defaults.", "app.disable(\"x-powered-by\");", "app.use((req, res, next) => {", ...headers.map(([n, v]) => `  res.setHeader(${JSON.stringify(n)}, ${JSON.stringify(v)});`), "  next();", "});"].join("\n");
    case "spring-security": {
      const get = (n: string) => headers.find(([h]) => h === n)?.[1];
      const parts: string[] = [];
      const csp = get("Content-Security-Policy");
      if (csp) parts.push(`.contentSecurityPolicy(csp -> csp.policyDirectives(${javaStr(csp)}))`);
      const hsts = get("Strict-Transport-Security");
      if (hsts) parts.push(`.httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(${/max-age=(\d+)/i.exec(hsts)?.[1] ?? "31536000"}).includeSubDomains(${/includeSubDomains/i.test(hsts)}).preload(${/preload/i.test(hsts)}))`);
      const fo = get("X-Frame-Options");
      if (fo) parts.push(/sameorigin/i.test(fo) ? ".frameOptions(frame -> frame.sameOrigin())" : ".frameOptions(frame -> frame.deny())");
      const rp = get("Referrer-Policy");
      if (rp && SPRING_REFERRER[rp]) parts.push(`.referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.${SPRING_REFERRER[rp]}))`);
      const handled = new Set(["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Referrer-Policy", "X-Content-Type-Options"]);
      for (const [n, v] of headers) if (!handled.has(n) && !(n === "Referrer-Policy" && rp && SPRING_REFERRER[rp])) parts.push(`.addHeaderWriter(new StaticHeadersWriter(${javaStr(n)}, ${javaStr(v)}))`);
      return [
        "// Spring Security 6.x (lambda DSL). X-Content-Type-Options: nosniff is on by default.",
        "import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;",
        "import org.springframework.security.web.header.writers.StaticHeadersWriter;",
        "",
        "http.headers(headers -> headers",
        ...parts.map((p) => `    ${p}`),
        ");",
      ].join("\n");
    }
    case "kong":
      return ["# Kong declarative config: response-transformer plugin (service, route or global).", "plugins:", "  - name: response-transformer", "    config:", "      remove:", "        headers:", "          - Server", "          - X-Powered-By", "      add:", "        headers:", ...headers.map(([n, v]) => `          - ${JSON.stringify(`${n}:${v}`)}`)].join("\n");
    case "apigee":
      return ["<!-- Attach in the ProxyEndpoint PostFlow Response (or PreFlow Response of the TargetEndpoint). -->", '<AssignMessage continueOnError="false" enabled="true" name="AM-Security-Headers">', "  <DisplayName>AM-Security-Headers</DisplayName>", "  <Remove>", "    <Headers>", '      <Header name="X-Powered-By"/>', '      <Header name="Server"/>', "    </Headers>", "  </Remove>", "  <Set>", "    <Headers>", ...headers.map(([n, v]) => `      <Header name="${xml(n)}">${xml(v)}</Header>`), "    </Headers>", "  </Set>", "  <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>", '  <AssignTo createNew="false" transport="http" type="response"/>', "</AssignMessage>"].join("\n");
    case "iis":
      return ["<configuration>", "  <system.webServer>", "    <security>", '      <requestFiltering removeServerHeader="true" />', "    </security>", "    <httpProtocol>", "      <customHeaders>", '        <remove name="X-Powered-By" />', ...headers.map(([n, v]) => `        <add name="${xml(n)}" value="${xml(v)}" />`), "      </customHeaders>", "    </httpProtocol>", "  </system.webServer>", "</configuration>"].join("\n");
    case "caddy":
      return ["header {", "  -Server", ...headers.map(([n, v]) => `  ${n} "${dq(v)}"`), "}"].join("\n");
    case "netlify":
      return ["# _headers file in the publish directory", "/*", ...headers.map(([n, v]) => `  ${n}: ${v}`)].join("\n");
    case "vercel":
      return JSON.stringify({ headers: [{ source: "/(.*)", headers: headers.map(([key, value]) => ({ key, value })) }] }, null, 2);
  }
}

export function runSecurityHeadersGenerator(input: string, options: SecurityHeadersGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const { headers, warnings } = collect(input);
  const body = render(headers, options.target);
  return { output: `${body}${warnings.length ? `\n\n# Review:\n${warnings.map((w) => `#  - ${w}`).join("\n")}` : ""}`, error: null };
}
