import { describe, expect, it } from "vitest";
import { generateUuids, inspectUuid } from "./transform";

const fixedRandom = (fill: number) => (length: number) => new Uint8Array(length).fill(fill);

describe("generateUuids", () => {
  it("generates a valid v4 UUID with correct version/variant nibbles", () => {
    const [uuid] = generateUuids(
      { version: "v4", count: 1, uppercase: false, hyphens: true },
      fixedRandom(0xff),
    );
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates the requested count", () => {
    const uuids = generateUuids({ version: "v4", count: 5, uppercase: false, hyphens: true });
    expect(uuids).toHaveLength(5);
    expect(new Set(uuids).size).toBe(5);
  });

  it("strips hyphens when requested", () => {
    const [uuid] = generateUuids({ version: "v4", count: 1, uppercase: false, hyphens: false });
    expect(uuid).not.toContain("-");
    expect(uuid).toHaveLength(32);
  });

  it("uppercases output when requested", () => {
    const [uuid] = generateUuids({ version: "v4", count: 1, uppercase: true, hyphens: true });
    expect(uuid).toBe(uuid!.toUpperCase());
  });

  it("generates a valid v7 UUID with a time-ordered prefix", () => {
    const [uuid] = generateUuids({ version: "v7", count: 1, uppercase: false, hyphens: true });
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("inspectUuid", () => {
  it("detects version and variant of a valid v4 UUID", () => {
    const result = inspectUuid("110ec58a-a0f2-4ac4-8393-c866d813b8d1");
    expect(result).toEqual({ version: 4, variant: "RFC 4122", valid: true });
  });

  it("flags invalid input", () => {
    expect(inspectUuid("not-a-uuid")).toEqual({ version: null, variant: null, valid: false });
  });
});
