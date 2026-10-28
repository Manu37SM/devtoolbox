import type { TransformResult } from "@/lib/tool-transform";
import type { MavenPomGeneratorOptions } from "./schema";

/** Shortcuts whose versions are managed by the Spring Boot BOM (no <version> needed). */
export const SHORTCUTS: Record<string, { g: string; a: string; scope?: string; optional?: boolean }> = {
  web: { g: "org.springframework.boot", a: "spring-boot-starter-web" },
  webflux: { g: "org.springframework.boot", a: "spring-boot-starter-webflux" },
  "data-jpa": { g: "org.springframework.boot", a: "spring-boot-starter-data-jpa" },
  jdbc: { g: "org.springframework.boot", a: "spring-boot-starter-jdbc" },
  security: { g: "org.springframework.boot", a: "spring-boot-starter-security" },
  "oauth2-resource-server": { g: "org.springframework.boot", a: "spring-boot-starter-oauth2-resource-server" },
  validation: { g: "org.springframework.boot", a: "spring-boot-starter-validation" },
  actuator: { g: "org.springframework.boot", a: "spring-boot-starter-actuator" },
  cache: { g: "org.springframework.boot", a: "spring-boot-starter-cache" },
  "data-redis": { g: "org.springframework.boot", a: "spring-boot-starter-data-redis" },
  kafka: { g: "org.springframework.kafka", a: "spring-kafka" },
  amqp: { g: "org.springframework.boot", a: "spring-boot-starter-amqp" },
  oracle: { g: "com.oracle.database.jdbc", a: "ojdbc11", scope: "runtime" },
  postgresql: { g: "org.postgresql", a: "postgresql", scope: "runtime" },
  mysql: { g: "com.mysql", a: "mysql-connector-j", scope: "runtime" },
  h2: { g: "com.h2database", a: "h2", scope: "runtime" },
  flyway: { g: "org.flywaydb", a: "flyway-core" },
  liquibase: { g: "org.liquibase", a: "liquibase-core" },
  lombok: { g: "org.projectlombok", a: "lombok", optional: true },
  devtools: { g: "org.springframework.boot", a: "spring-boot-devtools", scope: "runtime", optional: true },
  test: { g: "org.springframework.boot", a: "spring-boot-starter-test", scope: "test" },
  "security-test": { g: "org.springframework.security", a: "spring-security-test", scope: "test" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (s?: string) => (s ?? "").split(/[,\s]+/).filter(Boolean);

interface Dep { g: string; a: string; v?: string; scope?: string; optional?: boolean }

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#") && !/^\s*[\w.-]+:[\w.-]+(:[\w.-]+)+/.test(l)) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

export function generatePom(input: string, o: MavenPomGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = fields(input);
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const group = f.group ?? f.groupid, artifact = f.artifact ?? f.artifactid;
  if (!group || !/^[a-zA-Z_][\w.-]*$/.test(group)) return fail("Add a group: line (e.g. com.acme)");
  if (!artifact || !/^[\w.-]+$/.test(artifact)) return fail("Add an artifact: line (e.g. orders-service)");
  const version = f.version ?? "0.0.1-SNAPSHOT";
  const boot = f["spring-boot"] ?? f.boot;
  if (o.type === "spring-boot" && (!boot || !/^\d+\.\d+\.\d+([.-][\w]+)?$/.test(boot))) return fail("Add a spring-boot: line with the Spring Boot version you target (e.g. spring-boot: 3.4.1)");

  const deps: Dep[] = [];
  for (const d of list(f.dependencies)) {
    const sc = SHORTCUTS[d.toLowerCase()];
    if (sc) { deps.push({ g: sc.g, a: sc.a, scope: sc.scope, optional: sc.optional }); continue; }
    const m = /^([\w.-]+):([\w.-]+)(?::([\w.${}-]+))?(?::(compile|runtime|test|provided))?$/.exec(d);
    if (!m) return fail(`Unknown dependency "${d}". Use a shortcut (${Object.keys(SHORTCUTS).join(", ")}) or group:artifact[:version][:scope]`);
    deps.push({ g: m[1]!, a: m[2]!, v: m[3], scope: m[4] });
  }
  if (o.type === "spring-boot" && !deps.some((d) => d.a === "spring-boot-starter-test")) deps.push({ ...SHORTCUTS.test!, g: SHORTCUTS.test!.g, a: SHORTCUTS.test!.a });
  if (o.type !== "spring-boot") {
    const unmanaged = deps.filter((d) => !d.v && SHORTCUTS[Object.keys(SHORTCUTS).find((k) => SHORTCUTS[k]!.a === d.a) ?? ""]);
    if (unmanaged.length) return fail(`${unmanaged.map((d) => d.a).join(", ")} rely on the Spring Boot BOM for their version. Add a version (group:artifact:version) or switch type to spring-boot`);
  }

  const x: string[] = [];
  x.push('<?xml version="1.0" encoding="UTF-8"?>');
  x.push('<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  x.push('         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">');
  x.push("    <modelVersion>4.0.0</modelVersion>");
  if (o.type === "spring-boot") x.push("", "    <parent>", "        <groupId>org.springframework.boot</groupId>", "        <artifactId>spring-boot-starter-parent</artifactId>", `        <version>${esc(boot!)}</version>`, "        <relativePath/>", "    </parent>");
  x.push("", `    <groupId>${esc(group)}</groupId>`, `    <artifactId>${esc(artifact)}</artifactId>`, `    <version>${esc(version)}</version>`);
  const packaging = o.type === "spring-boot" && o.packaging === "pom" ? "jar" : o.packaging;
  if (packaging !== "jar") x.push(`    <packaging>${packaging}</packaging>`);
  if (f.name) x.push(`    <name>${esc(f.name)}</name>`);
  if (f.description) x.push(`    <description>${esc(f.description)}</description>`);
  x.push("", "    <properties>", `        <java.version>${o.javaVersion}</java.version>`);
  if (o.type !== "spring-boot") x.push(`        <maven.compiler.release>${o.javaVersion}</maven.compiler.release>`, "        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>");
  x.push("    </properties>");
  if (deps.length) {
    x.push("", "    <dependencies>");
    for (const d of deps) {
      x.push("        <dependency>", `            <groupId>${esc(d.g)}</groupId>`, `            <artifactId>${esc(d.a)}</artifactId>`);
      if (d.v) x.push(`            <version>${esc(d.v)}</version>`);
      if (d.scope) x.push(`            <scope>${d.scope}</scope>`);
      if (d.optional) x.push("            <optional>true</optional>");
      x.push("        </dependency>");
    }
    x.push("    </dependencies>");
  }
  x.push("", "    <build>", "        <plugins>");
  if (o.type === "spring-boot") {
    const lombok = deps.some((d) => d.a === "lombok");
    x.push("            <plugin>", "                <groupId>org.springframework.boot</groupId>", "                <artifactId>spring-boot-maven-plugin</artifactId>");
    if (lombok) x.push("                <configuration>", "                    <excludes>", "                        <exclude>", "                            <groupId>org.projectlombok</groupId>", "                            <artifactId>lombok</artifactId>", "                        </exclude>", "                    </excludes>", "                </configuration>");
    x.push("            </plugin>");
  } else {
    x.push("            <plugin>", "                <groupId>org.apache.maven.plugins</groupId>", "                <artifactId>maven-compiler-plugin</artifactId>", "                <version>3.13.0</version>", "            </plugin>");
    if (o.type === "library") x.push("            <plugin>", "                <groupId>org.apache.maven.plugins</groupId>", "                <artifactId>maven-source-plugin</artifactId>", "                <version>3.3.1</version>", "                <executions>", "                    <execution>", "                        <goals><goal>jar-no-fork</goal></goals>", "                    </execution>", "                </executions>", "            </plugin>");
  }
  x.push("        </plugins>", "    </build>", "</project>", "");
  return { output: x.join("\n"), error: null };
}
