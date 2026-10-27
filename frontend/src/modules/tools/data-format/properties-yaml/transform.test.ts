import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { convertPropertiesYaml, logicalLines, propertiesToObject, splitKeyValue } from "./transform";

const p2y = { mode: "properties-to-yaml", inferTypes: true, escapeUnicode: false } as const;
const y2p = { ...p2y, mode: "yaml-to-properties" } as const;

describe("properties parsing", () => {
  it("skips comments and blank lines, joins continuations", () => {
    expect(logicalLines("# c\n! c\n\na=1\nb=x\\\n   y\n")).toEqual(["a=1", "b=xy"]);
  });
  it("splits on =, : or whitespace and handles escapes", () => {
    expect(splitKeyValue("a=1")).toEqual(["a", "1"]);
    expect(splitKeyValue("a : 1")).toEqual(["a", "1"]);
    expect(splitKeyValue("a 1")).toEqual(["a", "1"]);
    expect(splitKeyValue("a\\=b=c\\u0041\\n")).toEqual(["a=b", "cA\n"]);
  });
  it("builds nested objects and indexed lists", () => {
    expect(propertiesToObject("a.b=1\na.c=x\nl[0]=p\nl[1]=q\nu[0].n=1", true)).toEqual({
      a: { b: 1, c: "x" }, l: ["p", "q"], u: [{ n: 1 }],
    });
  });
  it("keeps strings when type inference is off", () => {
    expect(propertiesToObject("a=1\nb=true", false)).toEqual({ a: "1", b: "true" });
  });
  it("rejects scalar/parent conflicts", () => {
    expect(() => propertiesToObject("a=1\na.b=2", true)).toThrow(/conflicts/);
    expect(() => propertiesToObject("a.b=2\na=1", true)).toThrow(/parent/);
  });
});

describe("convertPropertiesYaml", () => {
  const spring = `server.port=8080
spring.datasource.url=jdbc:oracle:thin:@//host:1521/svc
spring.datasource.username=app
management.endpoints.web.exposure.include=health,info
spring.profiles.active[0]=dev
spring.profiles.active[1]=oracle`;

  it("converts a Spring application.properties into nested YAML", () => {
    const yaml = convertPropertiesYaml(spring, p2y).output;
    expect(load(yaml)).toEqual({
      server: { port: 8080 },
      spring: { datasource: { url: "jdbc:oracle:thin:@//host:1521/svc", username: "app" }, profiles: { active: ["dev", "oracle"] } },
      management: { endpoints: { web: { exposure: { include: "health,info" } } } },
    });
  });

  it("round-trips YAML -> properties -> YAML", () => {
    const yaml = "a:\n  b: 1\n  list:\n    - x\n    - y: 2\n";
    const props = convertPropertiesYaml(yaml, y2p).output;
    expect(props).toBe("a.b=1\na.list[0]=x\na.list[1].y=2\n");
    expect(load(convertPropertiesYaml(props, p2y).output)).toEqual(load(yaml));
  });

  it("escapes values and optionally non-ASCII", () => {
    expect(convertPropertiesYaml('k: "a\\nb\\\\c"', y2p).output).toBe("k=a\\nb\\\\c\n");
    expect(convertPropertiesYaml("k: é", y2p).output).toBe("k=é\n");
    expect(convertPropertiesYaml("k: é", { ...y2p, escapeUnicode: true }).output).toBe("k=\\u00e9\n");
  });

  it("writes null as an empty value and empty collections as empty keys", () => {
    expect(convertPropertiesYaml("a: ~\nb: []\nc: {}", y2p).output).toBe("a=\nb=\nc=\n");
  });

  it("reports YAML errors and non-collection roots", () => {
    expect(convertPropertiesYaml("a: [", y2p).error).not.toBeNull();
    expect(convertPropertiesYaml("just text", y2p).error).not.toBeNull();
  });

  it("handles empty input", () => {
    expect(convertPropertiesYaml("", p2y)).toEqual({ output: "", error: null });
  });
});
