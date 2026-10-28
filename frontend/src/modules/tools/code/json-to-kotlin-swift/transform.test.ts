import { describe, expect, it } from "vitest";
import { jsonToKotlinSwift } from "./transform";

const base = { target: "kotlin-serialization" as const, optionalDefaults: true };
const sample = 'name: Order\n{"id":1,"user_name":"ann","price":9.5,"tags":["a"],"address":{"city":"X","zip":null},"items":[{"sku":"a","qty":1},{"sku":"b"}],"class":true}';

describe("Kotlin", () => {
  it("emits kotlinx.serialization data classes with SerialName and optional defaults", () => {
    const r = jsonToKotlinSwift(sample, base).output;
    expect(r).toContain("import kotlinx.serialization.Serializable");
    expect(r).toContain("@Serializable\ndata class Order(");
    expect(r).toContain("    val id: Long,");
    expect(r).toContain('    @SerialName("user_name") val userName: String,');
    expect(r).toContain("    val price: Double,");
    expect(r).toContain("    val tags: List<String>,");
    expect(r).toContain("    val address: Address,");
    expect(r).toContain("    val items: List<Item>,");
    expect(r).toContain("    val `class`: Boolean");
    expect(r).toContain("    val zip: Any? = null");
    expect(r).toContain("data class Item(\n    val sku: String,\n    val qty: Long? = null\n)");
  });
  it("supports Jackson and plain targets", () => {
    const j = jsonToKotlinSwift(sample, { ...base, target: "kotlin-jackson" }).output;
    expect(j).toContain("import com.fasterxml.jackson.annotation.JsonProperty");
    expect(j).toContain('@JsonProperty("user_name") val userName: String');
    expect(j).not.toContain("@Serializable");
    const p = jsonToKotlinSwift(sample, { ...base, target: "kotlin-plain" }).output;
    expect(p).not.toContain("import");
    expect(p).not.toContain("@");
  });
  it("can skip default null values", () => {
    expect(jsonToKotlinSwift('[{"a":1},{}]', { ...base, optionalDefaults: false }).output).toContain("val a: Long?\n");
  });
});

describe("Swift", () => {
  const sw = { ...base, target: "swift-codable" as const };
  it("emits Codable structs with CodingKeys only when needed", () => {
    const r = jsonToKotlinSwift(sample, sw).output;
    expect(r).toContain("struct Order: Codable {");
    expect(r).toContain("    let id: Int");
    expect(r).toContain('        case userName = "user_name"');
    expect(r).toContain("        case id\n");
    expect(r).toContain("    let items: [Item]");
    expect(r).toContain("    let qty: Int?");
    const simple = jsonToKotlinSwift('{"a":1}', sw).output;
    expect(simple).not.toContain("CodingKeys");
  });
});

describe("edge cases", () => {
  it("handles scalar roots and errors", () => {
    expect(jsonToKotlinSwift("[1,2]", base).output).toContain("typealias Root = List<Long>");
    expect(jsonToKotlinSwift("{", base).error?.message).toMatch(/Invalid JSON/);
    expect(jsonToKotlinSwift("", base)).toEqual({ output: "", error: null });
  });
});
