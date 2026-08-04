import { describe, expect, it } from "vitest";
import { generateFakeData } from "./transform";

describe("generateFakeData", () => {
  it("generates the requested number of person records", () => {
    const result = generateFakeData({ recordType: "person", count: 5 });
    expect(result.error).toBeNull();
    const records = JSON.parse(result.output);
    expect(records).toHaveLength(5);
    expect(records[0]).toHaveProperty("firstName");
    expect(records[0]).toHaveProperty("lastName");
    expect(records[0]).toHaveProperty("email");
    expect(records[0]).toHaveProperty("phone");
    expect(records[0]).toHaveProperty("birthDate");
  });

  it("generates address records with expected shape", () => {
    const result = generateFakeData({ recordType: "address", count: 3 });
    const records = JSON.parse(result.output);
    expect(records).toHaveLength(3);
    expect(records[0]).toHaveProperty("street");
    expect(records[0]).toHaveProperty("city");
    expect(records[0]).toHaveProperty("state");
    expect(records[0]).toHaveProperty("zip");
    expect(records[0]).toHaveProperty("country");
  });

  it("generates company records with expected shape", () => {
    const result = generateFakeData({ recordType: "company", count: 2 });
    const records = JSON.parse(result.output);
    expect(records[0]).toHaveProperty("name");
    expect(records[0]).toHaveProperty("catchPhrase");
    expect(records[0]).toHaveProperty("industry");
  });

  it("generates product records with expected shape", () => {
    const result = generateFakeData({ recordType: "product", count: 2 });
    const records = JSON.parse(result.output);
    expect(records[0]).toHaveProperty("name");
    expect(records[0]).toHaveProperty("price");
    expect(records[0]).toHaveProperty("category");
    expect(records[0]).toHaveProperty("description");
  });

  it("generates internet-user records with expected shape", () => {
    const result = generateFakeData({ recordType: "internet-user", count: 2 });
    const records = JSON.parse(result.output);
    expect(records[0]).toHaveProperty("username");
    expect(records[0]).toHaveProperty("email");
    expect(records[0]).toHaveProperty("password");
    expect(records[0]).toHaveProperty("avatar");
  });

  it("produces identical output for the same seed", () => {
    const a = generateFakeData({ recordType: "person", count: 5, seed: 42 });
    const b = generateFakeData({ recordType: "person", count: 5, seed: 42 });
    expect(a.output).toBe(b.output);
  });

  it("produces different output for different seeds (statistically)", () => {
    const a = generateFakeData({ recordType: "person", count: 5, seed: 1 });
    const b = generateFakeData({ recordType: "person", count: 5, seed: 2 });
    expect(a.output).not.toBe(b.output);
  });

  it("respects the max count boundary", () => {
    const result = generateFakeData({ recordType: "person", count: 1000 });
    const records = JSON.parse(result.output);
    expect(records).toHaveLength(1000);
  });

  it("handles a count of 1", () => {
    const result = generateFakeData({ recordType: "person", count: 1 });
    const records = JSON.parse(result.output);
    expect(records).toHaveLength(1);
  });

  it("errors when count is less than 1", () => {
    const result = generateFakeData({ recordType: "person", count: 0 });
    expect(result.error).not.toBeNull();
    expect(result.output).toBe("");
  });
});
