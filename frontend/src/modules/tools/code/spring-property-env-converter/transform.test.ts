import { describe, expect, it } from "vitest";
import { convertSpringEnv, fromEnvName, parseProperties, readProps, toEnvName } from "./transform";

const o = { direction: "to-env" as const, format: "dotenv" as const, includeValues: true };

describe("toEnvName (Spring Boot relaxed binding rules)", () => {
  it.each([
    ["spring.datasource.url", "SPRING_DATASOURCE_URL"],
    ["my.property-name", "MY_PROPERTYNAME"],
    ["spring.main.log-startup-info", "SPRING_MAIN_LOGSTARTUPINFO"],
    ["my.acme[0].other", "MY_ACME_0_OTHER"],
    ["my.list[1]", "MY_LIST_1"],
    ["server.port", "SERVER_PORT"],
  ])("%s → %s", (p, e) => expect(toEnvName(p)).toBe(e));
});

describe("fromEnvName", () => {
  it("makes a best-effort property name", () => {
    expect(fromEnvName("SPRING_DATASOURCE_URL")).toBe("spring.datasource.url");
    expect(fromEnvName("MY_ACME_0_OTHER")).toBe("my.acme[0].other");
    expect(fromEnvName("MY_LIST_1_")).toBe("my.list[1]");
  });
});

describe("reading input", () => {
  it("parses .properties with comments, separators and continuations", () => {
    const m = parseProperties("# c\na.b = 1\nc.d: two\ne.f three\nlong = x\\\n   y\n");
    expect([...m]).toEqual([["a.b", "1"], ["c.d", "two"], ["e.f", "three"], ["long", "xy"]]);
  });
  it("flattens YAML including lists", () => {
    const m = readProps("spring:\n  datasource:\n    url: jdbc:h2:mem:x\nservers:\n  - a\n  - b\n");
    expect([...m]).toEqual([["spring.datasource.url", "jdbc:h2:mem:x"], ["servers[0]", "a"], ["servers[1]", "b"]]);
  });
});

describe("convertSpringEnv", () => {
  const props = "spring.datasource.url=jdbc:oracle:thin:@//db:1521/ORCL\nserver.port=8081\napp.greeting=hello world";
  it("writes dotenv and export formats with quoting", () => {
    expect(convertSpringEnv(props, o).output).toBe('SPRING_DATASOURCE_URL=jdbc:oracle:thin:@//db:1521/ORCL\nSERVER_PORT=8081\nAPP_GREETING="hello world"\n');
    expect(convertSpringEnv(props, { ...o, format: "export" }).output).toContain("export APP_GREETING='hello world'");
  });
  it("writes docker-compose and kubernetes snippets", () => {
    expect(convertSpringEnv("server.port=8081", { ...o, format: "docker-compose" }).output).toBe("environment:\n  - SERVER_PORT=8081\n");
    expect(convertSpringEnv("server.port=8081", { ...o, format: "kubernetes" }).output).toBe("env:\n  - name: SERVER_PORT\n    value: \"8081\"\n");
  });
  it("writes JVM -D arguments and can omit values", () => {
    expect(convertSpringEnv("a.b=1\nc.d=x y", { ...o, format: "jvm" }).output).toBe('-Da.b=1 \\\n-Dc.d="x y"\n');
    expect(convertSpringEnv("a.b=1", { ...o, includeValues: false }).output).toBe("A_B=\n");
  });
  it("warns about colliding names", () => {
    expect(convertSpringEnv("a.b-c=1\na.bc=2", o).output).toContain("Warning: A_BC");
  });
  it("converts env back to properties", () => {
    const r = convertSpringEnv("export SPRING_DATASOURCE_URL='jdbc:h2:mem:t'\nSERVER_PORT=80", { ...o, direction: "from-env" }).output;
    expect(r).toContain("spring.datasource.url=jdbc:h2:mem:t\nserver.port=80\n");
    expect(convertSpringEnv("bad line", { ...o, direction: "from-env" }).error?.message).toMatch(/NAME=value/);
  });
  it("handles empty input", () => {
    expect(convertSpringEnv("", o)).toEqual({ output: "", error: null });
  });
});
