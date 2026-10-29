import type { TransformResult } from "@/lib/tool-transform";
import type { LogbackConfigGeneratorOptions } from "./schema";

export function fields(input: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const r = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (r && r[2]!.trim()) m.set(r[1]!.toLowerCase(), r[2]!.trim()); }
  return m;
}
const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const levels = (s: string | undefined): [string, string][] => (s ?? "").split(/[;,\n]/).map((p) => p.trim()).filter(Boolean).map((p) => { const [k, v] = p.split(/\s*[=:]\s*/); return [k!, (v ?? "INFO").toUpperCase()]; });
const LEVELS = new Set(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "OFF"]);

function logback(f: Map<string, string>, o: LogbackConfigGeneratorOptions): { text: string; notes: string[] } {
  const app = f.get("app") ?? "app";
  const dir = f.get("log-dir") ?? `/var/log/${app}`;
  const notes: string[] = [];
  const jsonEncoder = (fmt: LogbackConfigGeneratorOptions["format"]) => fmt === "json-logstash"
    ? ['<encoder class="net.logstash.logback.encoder.LogstashEncoder"/>']
    : ['<encoder class="org.springframework.boot.logging.logback.StructuredLogEncoder">', "  <format>ecs</format>", "  <charset>UTF-8</charset>", "</encoder>"];
  const patternEncoder = (p: string) => ["<encoder>", `  <pattern>${p}</pattern>`, "  <charset>UTF-8</charset>", "</encoder>"];
  const json = o.format === "json-ecs" || o.format === "json-logstash";
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', "<configuration>", '  <include resource="org/springframework/boot/logging/logback/defaults.xml"/>', `  <springProperty scope="context" name="APP_NAME" source="spring.application.name" defaultValue="${x(app)}"/>`];
  if (o.rollingFile) lines.push(`  <property name="LOG_DIR" value="\${LOG_DIR:-${x(dir)}}"/>`);
  const consoleEnc = o.format === "pattern" || o.format === "profile-split" ? patternEncoder("${CONSOLE_LOG_PATTERN}") : jsonEncoder(o.format);
  lines.push("", '  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">', ...consoleEnc.map((l) => `    ${l}`), "  </appender>");
  if (o.format === "profile-split") lines.push("", '  <appender name="CONSOLE_JSON" class="ch.qos.logback.core.ConsoleAppender">', ...jsonEncoder("json-ecs").map((l) => `    ${l}`), "  </appender>");
  if (o.rollingFile) {
    lines.push("", '  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">', "    <file>${LOG_DIR}/${APP_NAME}.log</file>", '    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">',
      "      <fileNamePattern>${LOG_DIR}/${APP_NAME}.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>", `      <maxFileSize>${x(f.get("max-file-size") ?? "100MB")}</maxFileSize>`, `      <maxHistory>${x(f.get("max-history") ?? "30")}</maxHistory>`, `      <totalSizeCap>${x(f.get("total-size-cap") ?? "3GB")}</totalSizeCap>`, "    </rollingPolicy>",
      ...(json || o.format === "profile-split" ? jsonEncoder(o.format === "json-logstash" ? "json-logstash" : "json-ecs") : patternEncoder("${FILE_LOG_PATTERN}")).map((l) => `    ${l}`), "  </appender>");
    if (o.async) lines.push("", '  <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">', "    <queueSize>8192</queueSize>", "    <discardingThreshold>0</discardingThreshold>", "    <neverBlock>true</neverBlock>", '    <appender-ref ref="FILE"/>', "  </appender>");
  }
  const lv = levels(f.get("levels"));
  if (lv.length) lines.push("", ...lv.map(([k, v]) => `  <logger name="${x(k)}" level="${x(v)}"/>`));
  const fileRef = o.rollingFile ? [`<appender-ref ref="${o.async ? "ASYNC_FILE" : "FILE"}"/>`] : [];
  const root = (consoleRef: string) => [`<root level="${x((f.get("root-level") ?? "INFO").toUpperCase())}">`, `  <appender-ref ref="${consoleRef}"/>`, ...fileRef.map((r) => `  ${r}`), "</root>"];
  if (o.format === "profile-split") lines.push("", `  <springProfile name="${x(f.get("json-profiles") ?? "prod")}">`, ...root("CONSOLE_JSON").map((l) => `    ${l}`), "  </springProfile>", `  <springProfile name="!${x(f.get("json-profiles") ?? "prod")}">`, ...root("CONSOLE").map((l) => `    ${l}`), "  </springProfile>");
  else lines.push("", ...root("CONSOLE").map((l) => `  ${l}`));
  lines.push("</configuration>");
  if (o.format !== "pattern") notes.push(o.format === "json-logstash" ? "LogstashEncoder needs net.logstash.logback:logstash-logback-encoder on the classpath." : "StructuredLogEncoder (ECS JSON) needs Spring Boot 3.4+; on older versions use the json-logstash option.");
  if (o.async) notes.push("neverBlock=true drops events instead of blocking request threads when the queue is full; set it to false if losing log lines is unacceptable (audit logs).");
  notes.push("Name the file logback-spring.xml (not logback.xml) so <springProfile> and <springProperty> work.");
  return { text: lines.join("\n"), notes };
}

function log4j2(f: Map<string, string>, o: LogbackConfigGeneratorOptions): { text: string; notes: string[] } {
  const app = f.get("app") ?? "app";
  const dir = f.get("log-dir") ?? `/var/log/${app}`;
  const pattern = "%d{yyyy-MM-dd'T'HH:mm:ss.SSSXXX} %5p ${sys:PID:-} --- [%15.15t] %-40.40c{1.} : %m%n%xwEx";
  const layout = (json: boolean) => (json ? `<JsonTemplateLayout eventTemplateUri="classpath:${o.format === "json-logstash" ? "LogstashJsonEventLayoutV1" : "EcsLayout"}.json"/>` : `<PatternLayout pattern="${x(pattern)}"/>`);
  const consoleJson = o.format === "json-ecs" || o.format === "json-logstash";
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<Configuration status="WARN">', "  <Properties>", `    <Property name="APP_NAME">${x(app)}</Property>`, `    <Property name="LOG_DIR">\${env:LOG_DIR:-${x(dir)}}</Property>`, "  </Properties>", "  <Appenders>",
    '    <Console name="Console" target="SYSTEM_OUT">', `      ${layout(consoleJson)}`, "    </Console>"];
  if (o.format === "profile-split") lines.push('    <Console name="ConsoleJson" target="SYSTEM_OUT">', `      ${layout(true)}`, "    </Console>");
  if (o.rollingFile) {
    const hist = f.get("max-history") ?? "30";
    lines.push('    <RollingFile name="File" fileName="${LOG_DIR}/${APP_NAME}.log" filePattern="${LOG_DIR}/${APP_NAME}-%d{yyyy-MM-dd}-%i.log.gz">', `      ${layout(o.format !== "pattern")}`, "      <Policies>", "        <TimeBasedTriggeringPolicy/>", `        <SizeBasedTriggeringPolicy size="${x((f.get("max-file-size") ?? "100MB").replace(/(\d)([KMG]B)$/i, "$1 $2"))}"/>`, "      </Policies>",
      '      <DefaultRolloverStrategy max="100">', '        <Delete basePath="${LOG_DIR}" maxDepth="1">', '          <IfFileName glob="${APP_NAME}-*.log.gz"/>', `          <IfLastModified age="${x(hist)}d"/>`, "        </Delete>", "      </DefaultRolloverStrategy>", "    </RollingFile>");
    if (o.async) lines.push('    <Async name="AsyncFile" bufferSize="8192">', '      <AppenderRef ref="File"/>', "    </Async>");
  }
  lines.push("  </Appenders>", "  <Loggers>", ...levels(f.get("levels")).map(([k, v]) => `    <Logger name="${x(k)}" level="${x(v.toLowerCase())}"/>`));
  const fileRef = o.rollingFile ? [`      <AppenderRef ref="${o.async ? "AsyncFile" : "File"}"/>`] : [];
  if (o.format === "profile-split") lines.push(`    <SpringProfile name="${x(f.get("json-profiles") ?? "prod")}">`, `      <Root level="${x((f.get("root-level") ?? "INFO").toLowerCase())}">`, '        <AppenderRef ref="ConsoleJson"/>', ...fileRef.map((r) => `  ${r}`), "      </Root>", "    </SpringProfile>", `    <SpringProfile name="!${x(f.get("json-profiles") ?? "prod")}">`, `      <Root level="${x((f.get("root-level") ?? "INFO").toLowerCase())}">`, '        <AppenderRef ref="Console"/>', ...fileRef.map((r) => `  ${r}`), "      </Root>", "    </SpringProfile>");
  else lines.push(`    <Root level="${x((f.get("root-level") ?? "INFO").toLowerCase())}">`, '      <AppenderRef ref="Console"/>', ...fileRef, "    </Root>");
  lines.push("  </Loggers>", "</Configuration>");
  const notes = ["Switch Spring Boot to Log4j2: exclude spring-boot-starter-logging and add spring-boot-starter-log4j2. Name the file log4j2-spring.xml so <SpringProfile> works."];
  if (o.format !== "pattern") notes.push("JsonTemplateLayout needs org.apache.logging.log4j:log4j-layout-template-json.");
  if (o.async) notes.push("For lowest overhead make all loggers async with the LMAX Disruptor (Log4jContextSelector=AsyncLoggerContextSelector) instead of an Async appender.");
  return { text: lines.join("\n"), notes };
}

function springProperties(f: Map<string, string>, o: LogbackConfigGeneratorOptions): { text: string; notes: string[] } {
  const app = f.get("app") ?? "app";
  const lines = ["# application.yml", "logging:", "  level:", `    root: ${(f.get("root-level") ?? "INFO").toUpperCase()}`, ...levels(f.get("levels")).map(([k, v]) => `    ${k}: ${v}`)];
  if (o.format !== "pattern") lines.push("  structured:", "    format:", `      console: ${o.format === "json-logstash" ? "logstash" : "ecs"}`, ...(o.rollingFile ? [`      file: ${o.format === "json-logstash" ? "logstash" : "ecs"}`] : []));
  if (o.rollingFile) lines.push("  file:", `    name: ${f.get("log-dir") ?? `/var/log/${app}`}/${app}.log`, "  logback:", "    rollingpolicy:", `      max-file-size: ${f.get("max-file-size") ?? "100MB"}`, `      max-history: ${f.get("max-history") ?? "30"}`, `      total-size-cap: ${f.get("total-size-cap") ?? "3GB"}`, "      file-name-pattern: ${LOG_FILE}.%d{yyyy-MM-dd}.%i.gz");
  const notes = [o.format !== "pattern" ? "logging.structured.format.* needs Spring Boot 3.4+." : "", o.format === "profile-split" ? "For a dev/prod split, put the structured settings in application-prod.yml only." : "", o.async ? "Async appenders are not configurable through properties; use the logback-spring.xml output for that." : ""].filter(Boolean);
  return { text: lines.join("\n"), notes };
}

export function runLogbackConfigGenerator(input: string, options: LogbackConfigGeneratorOptions): TransformResult {
  const f = fields(input);
  const bad = levels(f.get("levels")).filter(([, v]) => !LEVELS.has(v));
  if (bad.length) return { output: "", error: { message: `Unknown level for ${bad.map(([k, v]) => `${k}=${v}`).join(", ")}. Use TRACE, DEBUG, INFO, WARN, ERROR or OFF.` } };
  const { text, notes } = options.framework === "log4j2" ? log4j2(f, options) : options.framework === "spring-properties" ? springProperties(f, options) : logback(f, options);
  const comment = (n: string) => (options.framework === "spring-properties" ? `# ${n}` : `<!-- ${n} -->`);
  return { output: `${text}${notes.length ? `\n\n${notes.map(comment).join("\n")}` : ""}`, error: null };
}
