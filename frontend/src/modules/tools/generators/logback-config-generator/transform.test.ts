import { describe, expect, it } from "vitest";
import { parseXml } from "../../data-format/xml-core";
import { runLogbackConfigGenerator } from "./transform";
import type { LogbackConfigGeneratorOptions } from "./schema";

const INPUT = "app: orders\nlog-dir: /data/logs\nlevels: com.acme=DEBUG; org.hibernate.SQL=debug\nmax-history: 14";
const run = (o: Partial<LogbackConfigGeneratorOptions>) => runLogbackConfigGenerator(INPUT, { framework: "logback", format: "profile-split", rollingFile: true, async: true, ...o });
const xmlPart = (out: string) => out.split("\n\n<!--")[0]!;

describe("logback", () => {
  it("builds a profile-split config with rolling file and async appender", () => {
    const out = run({}).output;
    expect(() => parseXml(xmlPart(out))).not.toThrow();
    expect(out).toContain('<property name="LOG_DIR" value="${LOG_DIR:-/data/logs}"/>');
    expect(out).toContain("<maxHistory>14</maxHistory>");
    expect(out).toContain('<encoder class="org.springframework.boot.logging.logback.StructuredLogEncoder">');
    expect(out).toContain('<logger name="org.hibernate.SQL" level="DEBUG"/>');
    expect(out).toContain('<springProfile name="prod">\n    <root level="INFO">\n      <appender-ref ref="CONSOLE_JSON"/>\n      <appender-ref ref="ASYNC_FILE"/>');
    expect(out).toContain('<springProfile name="!prod">');
    expect(out).toContain("Spring Boot 3.4+");
  });
  it("supports plain patterns and logstash JSON", () => {
    const plain = run({ format: "pattern", rollingFile: false, async: false }).output;
    expect(() => parseXml(xmlPart(plain))).not.toThrow();
    expect(plain).toContain("<pattern>${CONSOLE_LOG_PATTERN}</pattern>");
    expect(plain).not.toContain("FILE");
    expect(run({ format: "json-logstash" }).output).toContain('<encoder class="net.logstash.logback.encoder.LogstashEncoder"/>');
  });
});

describe("log4j2", () => {
  it("builds a valid log4j2-spring.xml", () => {
    const out = run({ framework: "log4j2" }).output;
    expect(() => parseXml(xmlPart(out))).not.toThrow();
    expect(out).toContain('<JsonTemplateLayout eventTemplateUri="classpath:EcsLayout.json"/>');
    expect(out).toContain('<IfLastModified age="14d"/>');
    expect(out).toContain('<Async name="AsyncFile" bufferSize="8192">');
    expect(out).toContain('<Logger name="com.acme" level="debug"/>');
    expect(out).toContain("spring-boot-starter-log4j2");
  });
});

describe("spring properties", () => {
  it("emits application.yml logging settings", () => {
    const out = run({ framework: "spring-properties", format: "json-ecs" }).output;
    expect(out).toContain("logging:\n  level:\n    root: INFO\n    com.acme: DEBUG\n    org.hibernate.SQL: DEBUG\n  structured:\n    format:\n      console: ecs\n      file: ecs");
    expect(out).toContain("    name: /data/logs/orders.log");
    expect(out).toContain("# Async appenders are not configurable through properties");
  });
  it("rejects unknown levels", () => {
    expect(runLogbackConfigGenerator("levels: com.acme=LOUD", { framework: "logback", format: "pattern", rollingFile: false, async: false }).error?.message).toContain("com.acme=LOUD");
  });
});
