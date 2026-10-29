/* eslint-disable @typescript-eslint/no-explicit-any -- parsed YAML/AST shapes are asserted structurally in tests */
import { describe, expect, it } from "vitest";
import { lowerCamel, parseProto, runProtoToTypescript } from "./transform";
import type { ProtoToTypescriptOptions } from "./schema";

const base: ProtoToTypescriptOptions = { output: "typescript", enumStyle: "union", int64: "string" };
const run = (s: string, o: Partial<ProtoToTypescriptOptions> = {}) => runProtoToTypescript(s, { ...base, ...o });

const PROTO = `syntax = "proto3";
package acme.orders.v1;
import "google/protobuf/timestamp.proto";
option java_package = "com.acme.orders";

// An order.
message Order {
  string order_id = 1;
  int64 amount_minor = 2 [json_name = "amountMinor"];
  Status status = 3;
  repeated LineItem items = 4;
  map<string, string> labels = 5;
  google.protobuf.Timestamp created_at = 6;
  optional string note = 7;
  oneof payment {
    Card card = 8;
    string upi_id = 9;
  }
  message LineItem {
    string sku = 1;
    uint32 qty = 2;
    bytes blob = 3 [deprecated = true];
  }
  enum Status { STATUS_UNSPECIFIED = 0; PLACED = 1; PAID = 2; }
}
message Card { string last4 = 1; }
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc Watch(stream Order) returns (stream Order) {}
}
message GetOrderRequest { string order_id = 1; }
`;

describe("parseProto", () => {
  it("reads package, nested types, maps, oneofs and services", () => {
    const f = parseProto(PROTO);
    expect(f.pkg).toBe("acme.orders.v1");
    expect(f.syntax).toBe("proto3");
    expect(f.types.map((x) => x.full)).toEqual(["Order", "Order.LineItem", "Order.Status", "Card", "GetOrderRequest"]);
    const order = f.types[0] as any;
    expect(order.fields.find((x: any) => x.name === "labels")).toMatchObject({ mapKey: "string", type: "string" });
    expect(order.fields.find((x: any) => x.name === "upi_id")).toMatchObject({ oneof: "payment", jsonName: "upiId" });
    expect(f.services[0]!.rpcs).toEqual(["GetOrder(GetOrderRequest) returns (Order)", "Watch(stream Order) returns (stream Order)"]);
  });
  it("converts names and reports syntax errors", () => {
    expect(lowerCamel("created_at_utc")).toBe("createdAtUtc");
    expect(() => parseProto("message A { string x = ; }")).toThrow();
  });
});

describe("runProtoToTypescript", () => {
  it("emits interfaces following the JSON mapping", () => {
    const out = run(PROTO).output;
    expect(out).toContain('export interface Order {\n  orderId?: string;\n  amountMinor?: string;\n  status?: Order_Status;\n  items?: Order_LineItem[];\n  labels?: Record<string, string>;\n  createdAt?: string;\n  note?: string;\n  card?: Card; // oneof payment\n  upiId?: string; // oneof payment\n}');
    expect(out).toContain('export type Order_Status = "STATUS_UNSPECIFIED" | "PLACED" | "PAID";');
    expect(out).toContain("export interface Order_LineItem {\n  sku?: string;\n  qty?: number;\n  blob?: string;\n}");
    expect(out).toContain("//   rpc Watch(stream Order) returns (stream Order)");
  });
  it("supports TS enums and numeric int64", () => {
    const out = run(PROTO, { enumStyle: "enum", int64: "number" }).output;
    expect(out).toContain('export enum Order_Status {\n  STATUS_UNSPECIFIED = "STATUS_UNSPECIFIED",');
    expect(out).toContain("amountMinor?: number;");
  });
  it("builds JSON samples with one oneof member", () => {
    const out = run(PROTO, { output: "json" }).output;
    const order = JSON.parse(out.split("\n\n")[0]!.replace(/^\/\/.*\n/, ""));
    expect(order).toEqual({ orderId: "string", amountMinor: "1", status: "PLACED", items: [{ sku: "string", qty: 1, blob: "AQID" }], labels: { key: "string" }, createdAt: "2024-01-31T10:15:30Z", note: "string", card: { last4: "string" } });
  });
  it("flags unresolved imported types", () => {
    expect(run('syntax = "proto3"; message A { other.pkg.Thing t = 1; }').output).toContain("// Unresolved (imported?) types mapped to unknown: other.pkg.Thing");
  });
});
