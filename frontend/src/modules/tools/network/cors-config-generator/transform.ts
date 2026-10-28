import type { TransformResult } from "@/lib/tool-transform";
import type { CorsConfigGeneratorOptions } from "./schema";

export interface Cors { origins: string[]; methods: string[]; headers: string[]; expose: string[]; credentials: boolean; maxAge: number }

const list = (s?: string) => (s ?? "").split(/[,\s]+/).filter(Boolean);

export function parseCors(input: string): Cors | string {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  const origins = list(f.origins ?? f.origin);
  if (!origins.length) return "Add an origins: line (use * for any origin)";
  const methods = list(f.methods ?? "GET,POST,PUT,DELETE,OPTIONS").map((m) => m.toUpperCase());
  const bad = methods.find((m) => !/^[A-Z]+$/.test(m));
  if (bad) return `Invalid method "${bad}"`;
  const credentials = /^(true|yes|1)$/i.test(f.credentials ?? "");
  if (credentials && origins.includes("*")) return "Access-Control-Allow-Credentials cannot be used with a wildcard origin. List explicit origins.";
  for (const o of origins) if (o !== "*" && !/^https?:\/\/[^/\s]+$/.test(o)) return `Origin "${o}" must look like https://host[:port] with no path or trailing slash`;
  const maxAge = f.maxage ? Number(f.maxage) : 3600;
  if (!Number.isFinite(maxAge) || maxAge < 0) return "maxage must be a number of seconds";
  return { origins, methods, headers: list(f.headers ?? "*"), expose: list(f.expose), credentials, maxAge };
}

const q = (a: string[]) => a.map((x) => JSON.stringify(x)).join(", ");

export function generateCors(input: string, o: CorsConfigGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const c = parseCors(input);
  if (typeof c === "string") return { output: "", error: { message: c } };
  const anyOrigin = c.origins.includes("*");
  const m = c.methods.join(", "), h = c.headers.join(", "), e = c.expose.join(", ");
  let out = "";
  switch (o.target) {
    case "spring-mvc":
      out = `@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .${anyOrigin ? "allowedOriginPatterns" : "allowedOrigins"}(${q(c.origins)})
                .allowedMethods(${q(c.methods)})
                .allowedHeaders(${q(c.headers)})${c.expose.length ? `\n                .exposedHeaders(${q(c.expose)})` : ""}
                .allowCredentials(${c.credentials})
                .maxAge(${c.maxAge});
    }
}
`;
      break;
    case "spring-security":
      out = `@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.${anyOrigin ? "setAllowedOriginPatterns" : "setAllowedOrigins"}(List.of(${q(c.origins)}));
    cfg.setAllowedMethods(List.of(${q(c.methods)}));
    cfg.setAllowedHeaders(List.of(${q(c.headers)}));${c.expose.length ? `\n    cfg.setExposedHeaders(List.of(${q(c.expose)}));` : ""}
    cfg.setAllowCredentials(${c.credentials});
    cfg.setMaxAge(${c.maxAge}L);
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cfg);
    return src;
}

// In your SecurityFilterChain:  http.cors(Customizer.withDefaults());
`;
      break;
    case "nginx": {
      const originExpr = anyOrigin ? "*" : "$cors_origin";
      const map = anyOrigin ? "" : `map $http_origin $cors_origin {
    default "";
${c.origins.map((x) => `    "${x}" "${x}";`).join("\n")}
}

`;
      const hdr = (k: string, v: string) => `add_header ${k} "${v}" always;`;
      out = `${map}server {
    # ...
    location / {
        if ($request_method = OPTIONS) {
            ${hdr("Access-Control-Allow-Origin", originExpr)}
            ${hdr("Access-Control-Allow-Methods", m)}
            ${hdr("Access-Control-Allow-Headers", h)}
            ${hdr("Access-Control-Max-Age", String(c.maxAge))}${c.credentials ? `\n            ${hdr("Access-Control-Allow-Credentials", "true")}` : ""}
            ${hdr("Vary", "Origin")}
            return 204;
        }
        ${hdr("Access-Control-Allow-Origin", originExpr)}${c.credentials ? `\n        ${hdr("Access-Control-Allow-Credentials", "true")}` : ""}${e ? `\n        ${hdr("Access-Control-Expose-Headers", e)}` : ""}
        ${hdr("Vary", "Origin")}
    }
}
`;
      break;
    }
    case "apache": {
      const env = anyOrigin ? "" : `SetEnvIf Origin "^(${c.origins.map((x) => x.replace(/[.]/g, "\\.")).join("|")})$" CORS_ORIGIN=$0\n`;
      out = `<IfModule mod_headers.c>
${env}    Header always set Access-Control-Allow-Origin ${anyOrigin ? '"*"' : '%{CORS_ORIGIN}e env=CORS_ORIGIN'}
    Header always set Access-Control-Allow-Methods "${m}"
    Header always set Access-Control-Allow-Headers "${h}"
    Header always set Access-Control-Max-Age "${c.maxAge}"${c.credentials ? '\n    Header always set Access-Control-Allow-Credentials "true"' : ""}${e ? `\n    Header always set Access-Control-Expose-Headers "${e}"` : ""}
    Header always merge Vary Origin
</IfModule>
`;
      break;
    }
    case "express":
      out = `import cors from "cors";

app.use(cors({
  origin: ${anyOrigin ? "true" : `[${q(c.origins)}]`},
  methods: [${q(c.methods)}],
  allowedHeaders: [${q(c.headers)}],${c.expose.length ? `\n  exposedHeaders: [${q(c.expose)}],` : ""}
  credentials: ${c.credentials},
  maxAge: ${c.maxAge},
}));
`;
      break;
    case "kong":
      out = `plugins:
  - name: cors
    config:
      origins:
${c.origins.map((x) => `        - ${x}`).join("\n")}
      methods:
${c.methods.map((x) => `        - ${x}`).join("\n")}
      headers:
${c.headers.map((x) => `        - ${x}`).join("\n")}${c.expose.length ? `\n      exposed_headers:\n${c.expose.map((x) => `        - ${x}`).join("\n")}` : ""}
      credentials: ${c.credentials}
      max_age: ${c.maxAge}
`;
      break;
    case "http-headers":
      out = [`Access-Control-Allow-Origin: ${anyOrigin ? "*" : c.origins[0]}`, c.origins.length > 1 && !anyOrigin ? "# Only one origin may be sent. Echo the request Origin if it is in your allow-list and add 'Vary: Origin'." : "", `Access-Control-Allow-Methods: ${m}`, `Access-Control-Allow-Headers: ${h}`, c.expose.length ? `Access-Control-Expose-Headers: ${e}` : "", c.credentials ? "Access-Control-Allow-Credentials: true" : "", `Access-Control-Max-Age: ${c.maxAge}`].filter(Boolean).join("\n") + "\n";
      break;
  }
  return { output: out, error: null };
}
