import { describe, expect, it } from "vitest";
import { decodeId, decodeObjectId, decodeSnowflake, decodeUlid, decodeUuid } from "./transform";

describe("decodeUuid", () => {
  it("decodes v1 timestamp (RFC 4122 example)", () => {
    const r = decodeUuid("c232ab00-9414-11ec-b3c8-9f6bdeced846")!;
    expect(r).toContain("Version: 1");
    expect(r).toContain("Timestamp: 2022-02-22T19:22:22.000Z");
    expect(r).toContain("Node: 9f:6b:de:ce:d8:46");
  });
  it("decodes v7 timestamp (RFC 9562 example)", () => {
    const r = decodeUuid("017F22E2-79B0-7CC3-98C4-DC0C0C07398F")!;
    expect(r).toContain("Version: 7");
    expect(r).toContain("Timestamp: 2022-02-22T19:22:22.000Z");
  });
  it("decodes v6 timestamp (RFC 9562 example)", () => {
    const r = decodeUuid("1EC9414C-232A-6B00-B3C8-9F6BDECED846")!;
    expect(r).toContain("Version: 6");
    expect(r).toContain("Timestamp: 2022-02-22T19:22:22.000Z");
  });
  it("handles v4, nil, max, braces and bad input", () => {
    expect(decodeUuid("{550e8400-e29b-41d4-a716-446655440000}")).toContain("Version: 4");
    expect(decodeUuid("00000000-0000-0000-0000-000000000000")).toContain("Special: nil UUID");
    expect(decodeUuid("ffffffff-ffff-ffff-ffff-ffffffffffff")).toContain("Special: max UUID");
    expect(decodeUuid("nope")).toBeNull();
  });
});

describe("decodeUlid / ObjectId / Snowflake", () => {
  it("decodes the ULID spec example timestamp", () => {
    const r = decodeUlid("01ARZ3NDEKTSV4RRFFQ69G5FAV")!;
    expect(r).toContain("Unix ms: 1469922850259");
    expect(r).toContain("Timestamp: 2016-07-30T23:54:10.259Z");
    expect(decodeUlid("81ARZ3NDEKTSV4RRFFQ69G5FAV")).toBeNull();
  });
  it("decodes ObjectId", () => {
    const r = decodeObjectId("507f1f77bcf86cd799439011")!;
    expect(r).toContain("Timestamp: 2012-10-17T21:13:27.000Z");
    expect(r).toContain("Counter: " + parseInt("439011", 16));
  });
  it("decodes a Twitter snowflake", () => {
    const r = decodeSnowflake("1541815603606036480", "twitter")!;
    expect(r[1]).toBe("Timestamp: 2022-06-28T16:07:40.105Z");
  });
  it("decodes a Discord snowflake", () => {
    const r = decodeSnowflake("175928847299117063", "discord")!;
    expect(r[1]).toBe("Timestamp: 2016-04-30T11:18:25.796Z");
  });
});

describe("decodeId", () => {
  it("auto-detects each line and reports unknown ones", () => {
    const ok = decodeId("507f1f77bcf86cd799439011\n01ARZ3NDEKTSV4RRFFQ69G5FAV", { mode: "auto" });
    expect(ok.error).toBeNull();
    expect(ok.output).toContain("MongoDB ObjectId");
    expect(ok.output).toContain("ULID");
    const bad = decodeId("hello", { mode: "auto" });
    expect(bad.error?.message).toContain("hello");
  });
  it("shows both interpretations for plain numeric ids", () => {
    const r = decodeId("175928847299117063", { mode: "auto" });
    expect(r.output).toContain("Twitter/X Snowflake");
    expect(r.output).toContain("Discord Snowflake");
  });
});
