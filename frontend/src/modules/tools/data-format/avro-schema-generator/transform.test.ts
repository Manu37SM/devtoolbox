import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { avroName, avroSchemaGenerator } from "./transform";

const gen = (input: unknown, o: Parameters<typeof avroSchemaGenerator>[1] = {}) => {
  const r = avroSchemaGenerator(typeof input === "string" ? input : JSON.stringify(input), { format: "compact", ...o });
  if (r.error) throw new Error(r.error.message);
  return JSON.parse(r.output) as { name: string; namespace?: string; fields: Array<{ name: string; type: unknown; default?: unknown; aliases?: string[] }> };
};
const field = (s: ReturnType<typeof gen>, n: string) => s.fields.find((f) => f.name === n)!;

describe("avroSchemaGenerator", () => {
  it("infers primitives", () => {
    const s = gen({ a: 1, b: 1.5, c: "x", d: true, e: 3000000000 });
    expect(s.name).toBe("Root");
    expect(s.namespace).toBe("com.example");
    expect(field(s, "a").type).toBe("int");
    expect(field(s, "b").type).toBe("double");
    expect(field(s, "c").type).toBe("string");
    expect(field(s, "d").type).toBe("boolean");
    expect(field(s, "e").type).toBe("long");
  });

  it("widens numbers across samples", () => {
    expect(field(gen([{ a: 1 }, { a: 2.5 }]), "a").type).toBe("double");
    expect(field(gen([{ a: 1 }, { a: 5000000000 }]), "a").type).toBe("long");
  });

  it("honours integers=long and floats=float", () => {
    const s = gen({ a: 1, b: 1.5 }, { integers: "long", floats: "float" });
    expect(field(s, "a").type).toBe("long");
    expect(field(s, "b").type).toBe("float");
  });

  it("makes missing and null fields nullable with null defaults", () => {
    const s = gen([{ a: 1, b: "x" }, { a: 2, b: null }, { a: 3 }]);
    expect(field(s, "a").type).toBe("int");
    expect(field(s, "b").type).toEqual(["null", "string"]);
    expect(field(s, "b").default).toBeNull();
  });

  it("nullable=all and none", () => {
    expect(field(gen({ a: 1 }, { nullable: "all" }), "a").type).toEqual(["null", "int"]);
    expect(field(gen([{ a: 1 }, {}], { nullable: "none" }), "a").type).toBe("int");
  });

  it("omits defaults when asked", () => {
    expect(field(gen({ a: null }, { nullDefaults: false }), "a").default).toBeUndefined();
  });

  it("builds nested records with unique names", () => {
    const s = gen({ user: { id: 1, address: { city: "x" } }, owner: { id: 2, address: { city: "y" } } });
    const user = field(s, "user").type as { name: string; fields: Array<{ type: { name: string } }> };
    expect(user.name).toBe("User");
    expect(user.fields[1]!.type.name).toBe("Address");
    const owner = field(s, "owner").type as { fields: Array<{ type: { name: string } }> };
    expect(owner.fields[1]!.type.name).toBe("Address2");
  });

  it("infers arrays and singularises item record names", () => {
    const s = gen({ tags: ["a", "b"], orders: [{ id: 1 }, { id: 2, note: "x" }] });
    expect(field(s, "tags").type).toEqual({ type: "array", items: "string" });
    const orders = field(s, "orders").type as { items: { name: string; fields: Array<{ type: unknown }> } };
    expect(orders.items.name).toBe("Order");
    expect(orders.items.fields[1]!.type).toEqual(["null", "string"]);
  });

  it("empty array falls back to string with a warning", () => {
    const r = avroSchemaGenerator('{"a": []}', { format: "avsc" });
    expect(r.output).toContain('"items": "string"');
    expect(r.output).toContain("empty array");
  });

  it("mixed types produce a union", () => {
    expect(field(gen([{ a: 1 }, { a: "x" }]), "a").type).toEqual(["int", "string"]);
  });

  it("detects logical types only when enabled and consistent", () => {
    const sample = [{ d: "2024-01-02", t: "2024-01-02T03:04:05Z", u: "123e4567-e89b-12d3-a456-426614174000", s: "hello" }];
    const off = gen(sample);
    expect(field(off, "d").type).toBe("string");
    const on = gen(sample, { logicalTypes: true });
    expect(field(on, "d").type).toEqual({ type: "int", logicalType: "date" });
    expect(field(on, "t").type).toEqual({ type: "long", logicalType: "timestamp-millis" });
    expect(field(on, "u").type).toEqual({ type: "string", logicalType: "uuid" });
    expect(field(on, "s").type).toBe("string");
    expect(field(gen([{ d: "2024-01-02" }, { d: "nope" }], { logicalTypes: true }), "d").type).toBe("string");
  });

  it("renames illegal names and keeps legal aliases only", () => {
    expect(avroName("my-field")).toBe("my_field");
    expect(avroName("1st")).toBe("_1st");
    const s = gen({ "my-field": 1, "2x": 2 });
    expect(field(s, "my_field")).toBeTruthy();
    expect(field(s, "_2x")).toBeTruthy();
    expect(field(s, "my_field").aliases).toBeUndefined(); // "my-field" is not a legal alias either
  });

  it("detects maps when enabled", () => {
    const s = gen({ scores: { a: 1, b: 2, c: 3 } }, { mapMinKeys: 3 });
    expect(field(s, "scores").type).toEqual({ type: "map", values: "int" });
    const rec = gen({ scores: { a: 1, b: "x", c: 3 } }, { mapMinKeys: 3 });
    expect((field(rec, "scores").type as { type: string }).type).toBe("record");
  });

  it("accepts NDJSON and arrays of samples", () => {
    expect(field(gen('{"a":1}\n{"a":2,"b":true}'), "b").type).toEqual(["null", "boolean"]);
  });

  it("formats", () => {
    const reg = JSON.parse(avroSchemaGenerator('{"a":1}', { format: "registry" }).output) as { schema: string };
    expect(JSON.parse(reg.schema).type).toBe("record");
    expect(avroSchemaGenerator('{"a":1}', { format: "avsc" }).output).toContain("\n");
  });

  it("errors clearly", () => {
    expect(avroSchemaGenerator("[1,2]").error).not.toBeNull();
    expect(avroSchemaGenerator("[]").error).not.toBeNull();
    expect(avroSchemaGenerator("{bad").error?.message).toMatch(/Invalid JSON/);
    expect(avroSchemaGenerator("{}", { recordName: "1bad" }).error).not.toBeNull();
    expect(avroSchemaGenerator("{}", { namespace: "a..b" }).error).not.toBeNull();
    expect(avroSchemaGenerator("").output).toBe("");
  });
});

// ---- oracle: fastavro must accept the schema and validate the sample ----
const py = spawnSync("python3", ["-c", "import fastavro"], { encoding: "utf8" });
const hasFastavro = py.status === 0;

describe.skipIf(!hasFastavro)("fastavro oracle", () => {
  const check = (samples: unknown[], o: Parameters<typeof avroSchemaGenerator>[1] = {}) => {
    const r = avroSchemaGenerator(JSON.stringify(samples), { format: "compact", ...o });
    expect(r.error).toBeNull();
    const script = `
import sys, json, fastavro
d = json.load(sys.stdin)
parsed = fastavro.parse_schema(d["schema"])
bad = 0
for rec in d["samples"]:
    if not fastavro.validate(rec, parsed, raise_errors=False): bad += 1
print(bad)`;
    const p = spawnSync("python3", ["-c", script], { input: JSON.stringify({ schema: JSON.parse(r.output), samples }), encoding: "utf8" });
    expect(p.stderr).toBe("");
    return Number(p.stdout.trim());
  };

  it("accepts a rich nested sample", () => {
    const samples = [
      { id: 1, name: "a", tags: ["x"], profile: { age: 3, email: null }, items: [{ sku: "s", qty: 2 }], ok: true, price: 1.5 },
      { id: 2, name: "b", tags: [], profile: { age: 4 }, items: [], ok: false, price: 2 },
    ];
    expect(check(samples)).toBe(0);
  });

  it("accepts logical types and maps", () => {
    const samples = [{ d: "2024-01-02", u: "123e4567-e89b-12d3-a456-426614174000", m: { a: 1, b: 2 } }];
    // date/uuid strings are not valid Avro ints, so only the schema parse is the oracle here
    const r = avroSchemaGenerator(JSON.stringify(samples), { format: "compact", logicalTypes: true, mapMinKeys: 2 });
    const p = spawnSync("python3", ["-c", "import sys,json,fastavro;fastavro.parse_schema(json.loads(sys.stdin.read()));print('ok')"], { input: r.output, encoding: "utf8" });
    expect(p.stdout.trim()).toBe("ok");
  });

  it("accepts unions and name collisions", () => {
    expect(check([{ a: 1, x: { id: 1 }, y: { id: 2 } }, { a: "s", x: { id: 3 }, y: { id: 4 } }])).toBe(0);
  });
});
