import { describe, expect, it } from "vitest";
import { generatePom, SHORTCUTS } from "./transform";

const base = { type: "spring-boot" as const, javaVersion: "21" as const, packaging: "jar" as const };
const gen = (s: string, o = {}) => generatePom(s, { ...base, ...o });
const IN = "group: com.acme\nartifact: orders\nspring-boot: 3.4.1\ndependencies: web, data-jpa, oracle, lombok, validation";

describe("spring boot pom", () => {
  const out = gen(IN).output;
  it("has parent, coordinates and java version", () => {
    expect(out).toContain("<artifactId>spring-boot-starter-parent</artifactId>\n        <version>3.4.1</version>");
    expect(out).toContain("<groupId>com.acme</groupId>\n    <artifactId>orders</artifactId>\n    <version>0.0.1-SNAPSHOT</version>");
    expect(out).toContain("<java.version>21</java.version>");
  });
  it("maps shortcuts, scopes and adds the test starter", () => {
    expect(out).toContain("<artifactId>ojdbc11</artifactId>\n            <scope>runtime</scope>");
    expect(out).toContain("<artifactId>lombok</artifactId>\n            <optional>true</optional>");
    expect(out).toContain("spring-boot-starter-test");
    expect(out).not.toMatch(/<version>[^<]*<\/version>\s*<scope>runtime/);
  });
  it("excludes lombok from the repackaged jar", () => {
    expect(out).toContain("<exclude>");
    expect(gen("group: a\nartifact: b\nspring-boot: 3.4.1\ndependencies: web").output).not.toContain("<exclude>");
  });
  it("is well-formed: tags balance", () => {
    const tags = [...out.matchAll(/<(\/?)([A-Za-z.:]+)[^>]*?(\/?)>/g)].filter((m) => !m[3]);
    const stack: string[] = [];
    for (const [, close, name] of tags) { if (close) expect(stack.pop()).toBe(name); else stack.push(name!); }
    expect(stack).toEqual([]);
  });
});

describe("other types and validation", () => {
  it("plain jar with explicit versions", () => {
    const o = gen("group: com.acme\nartifact: tool\ndependencies: com.google.guava:guava:33.0.0-jre, org.junit.jupiter:junit-jupiter:5.10.2:test", { type: "plain-jar" }).output;
    expect(o).not.toContain("spring-boot-starter-parent");
    expect(o).toContain("<version>33.0.0-jre</version>");
    expect(o).toContain("<scope>test</scope>");
    expect(o).toContain("<maven.compiler.release>21</maven.compiler.release>");
  });
  it("library adds the sources plugin; war packaging is emitted", () => {
    expect(gen("group: a\nartifact: b", { type: "library" }).output).toContain("maven-source-plugin");
    expect(gen("group: a\nartifact: b\nspring-boot: 3.4.1", { packaging: "war" }).output).toContain("<packaging>war</packaging>");
  });
  it("errors", () => {
    expect(gen("artifact: b").error?.message).toMatch(/group/);
    expect(gen("group: a\nartifact: b").error?.message).toMatch(/spring-boot/);
    expect(gen("group: a\nartifact: b\nspring-boot: 3.4.1\ndependencies: nope").error?.message).toMatch(/Unknown dependency/);
    expect(gen("group: a\nartifact: b\ndependencies: web", { type: "plain-jar" }).error?.message).toMatch(/BOM/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
  it("escapes xml in names", () => {
    expect(gen("group: a\nartifact: b\nspring-boot: 3.4.1\nname: R&D <svc>").output).toContain("<name>R&amp;D &lt;svc&gt;</name>");
    expect(Object.keys(SHORTCUTS).length).toBeGreaterThan(15);
  });
});
