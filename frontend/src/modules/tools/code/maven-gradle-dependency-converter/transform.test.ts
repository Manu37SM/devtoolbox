import { describe, expect, it } from "vitest";
import { convertDependencies, parseGradle, parseMaven } from "./transform";

const o = { direction: "maven-to-gradle" as const, dsl: "groovy" as const, includeExclusions: true };
const pom = `
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency>
    <groupId>com.oracle.database.jdbc</groupId><artifactId>ojdbc11</artifactId><version>23.3.0.23.09</version><scope>runtime</scope>
  </dependency>
  <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><scope>provided</scope></dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope>
    <exclusions><exclusion><groupId>org.junit.vintage</groupId><artifactId>junit-vintage-engine</artifactId></exclusion></exclusions>
  </dependency>
</dependencies>`;

describe("parseMaven", () => {
  it("reads coordinates, scopes and exclusions", () => {
    const d = parseMaven(pom);
    expect(d).toHaveLength(4);
    expect(d[1]).toMatchObject({ group: "com.oracle.database.jdbc", artifact: "ojdbc11", version: "23.3.0.23.09", scope: "runtime" });
    expect(d[3]!.exclusions).toEqual([{ group: "org.junit.vintage", artifact: "junit-vintage-engine" }]);
  });
  it("ignores commented-out dependencies and rejects empty input", () => {
    expect(parseMaven("<!-- <dependency><groupId>a</groupId><artifactId>b</artifactId></dependency> --><dependency><groupId>c</groupId><artifactId>d</artifactId></dependency>")).toHaveLength(1);
    expect(() => parseMaven("<project/>")).toThrow(/No <dependency>/);
    expect(() => parseMaven("<dependency><groupId>a</groupId></dependency>")).toThrow(/missing/);
  });
});

describe("Maven → Gradle", () => {
  it("maps scopes (Groovy)", () => {
    const r = convertDependencies(pom, o).output;
    expect(r).toContain("    implementation 'org.springframework.boot:spring-boot-starter-web'");
    expect(r).toContain("    runtimeOnly 'com.oracle.database.jdbc:ojdbc11:23.3.0.23.09'");
    expect(r).toContain("    compileOnly 'org.projectlombok:lombok'");
    expect(r).toContain("    testImplementation('org.springframework.boot:spring-boot-starter-test') {\n        exclude group: 'org.junit.vintage', module: 'junit-vintage-engine'\n    }");
  });
  it("emits Kotlin DSL and platform() for BOM imports", () => {
    const bom = "<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-dependencies</artifactId><version>3.3.0</version><type>pom</type><scope>import</scope></dependency>";
    expect(convertDependencies(bom, { ...o, dsl: "kotlin" }).output).toContain('implementation(platform("org.springframework.boot:spring-boot-dependencies:3.3.0"))');
    expect(convertDependencies("<dependency><groupId>a</groupId><artifactId>b</artifactId><version>1</version></dependency>", { ...o, dsl: "kotlin" }).output).toContain('implementation("a:b:1")');
  });
  it("keeps Maven properties as Gradle variables with a note", () => {
    const r = convertDependencies("<dependency><groupId>a</groupId><artifactId>b</artifactId><version>${b.version}</version></dependency>", o).output;
    expect(r).toContain('implementation "a:b:$b.version"');
    expect(r).toContain("Maven property");
  });
  it("carries classifier and type", () => {
    const r = convertDependencies("<dependency><groupId>a</groupId><artifactId>b</artifactId><version>1</version><classifier>tests</classifier><type>test-jar</type></dependency>", o).output;
    expect(r).toContain("'a:b:1:tests@test-jar'");
  });
});

describe("Gradle → Maven", () => {
  const g = { ...o, direction: "gradle-to-maven" as const };
  it("parses string, map and Kotlin notations", () => {
    const { deps } = parseGradle(`dependencies {
      implementation 'org.slf4j:slf4j-api:2.0.9'
      runtimeOnly("com.h2database:h2:2.2.224")
      testImplementation group: 'junit', name: 'junit', version: '4.13.2'
      compileOnly "org.projectlombok:lombok"
      implementation platform('org.springframework.boot:spring-boot-dependencies:3.3.0')
      // implementation 'ignored:commented:1'
    }`);
    expect(deps.map((d) => [d.group, d.artifact, d.version, d.scope])).toEqual([
      ["org.slf4j", "slf4j-api", "2.0.9", undefined],
      ["com.h2database", "h2", "2.2.224", "runtime"],
      ["junit", "junit", "4.13.2", "test"],
      ["org.projectlombok", "lombok", undefined, "provided"],
      ["org.springframework.boot", "spring-boot-dependencies", "3.3.0", "import"],
    ]);
  });
  it("writes Maven XML with a dependencyManagement section for BOMs", () => {
    const r = convertDependencies("implementation 'a:b:1'\nimplementation platform('x:y:2')", g).output;
    expect(r).toContain("<dependencyManagement>");
    expect(r).toContain("<type>pom</type>");
    expect(r).toContain("<scope>import</scope>");
    expect(r).toContain("<dependency>\n    <groupId>a</groupId>\n    <artifactId>b</artifactId>\n    <version>1</version>\n  </dependency>");
  });
  it("round-trips exclusions", () => {
    const m = convertDependencies(pom, o).output;
    const back = convertDependencies(m, g).output;
    expect(back).toContain("<artifactId>junit-vintage-engine</artifactId>");
    expect(back).toContain("<scope>test</scope>");
  });
  it("errors when nothing is recognised", () => {
    expect(convertDependencies("nothing here", g).error?.message).toMatch(/No dependencies/);
    expect(convertDependencies("", g)).toEqual({ output: "", error: null });
  });
});
