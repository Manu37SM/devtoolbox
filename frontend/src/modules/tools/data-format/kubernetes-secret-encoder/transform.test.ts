import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { b64decode, b64encode, parseEnv, transformSecret } from "./transform";

const secret = `apiVersion: v1
kind: Secret
metadata:
  name: db
type: Opaque
stringData:
  user: admin
  pass: "p@ss wörd"
data:
  existing: Zm9v
`;

describe("base64 helpers", () => {
  it("handle UTF-8", () => {
    expect(b64encode("héllo")).toBe("aMOpbGxv");
    expect(b64decode(b64encode("日本"))).toBe("日本");
  });
});

describe("transformSecret", () => {
  it("encodes stringData into data and keeps existing data", () => {
    const r = transformSecret(secret, { mode: "encode" });
    expect(r.error).toBeNull();
    const o = load(r.output) as { data: Record<string, string>; stringData?: unknown };
    expect(o.stringData).toBeUndefined();
    expect(o.data).toEqual({ existing: "Zm9v", user: "YWRtaW4=", pass: "cEBzcyB3w7ZyZA==" });
  });
  it("decodes data into stringData", () => {
    const enc = transformSecret(secret, { mode: "encode" }).output;
    const o = load(transformSecret(enc, { mode: "decode" }).output) as { stringData: Record<string, string>; data?: unknown };
    expect(o.data).toBeUndefined();
    expect(o.stringData).toEqual({ existing: "foo", user: "admin", pass: "p@ss wörd" });
  });
  it("builds a Secret from a .env file", () => {
    const r = transformSecret("# c\nexport A=1\nB='two words'\nC=\"x=y\"\n", { mode: "from-env" });
    const o = load(r.output) as { kind: string; data: Record<string, string> };
    expect(o.kind).toBe("Secret");
    expect(o.data).toEqual({ A: "MQ==", B: b64encode("two words"), C: b64encode("x=y") });
    expect(parseEnv("A=b")).toEqual({ A: "b" });
  });
  it("reports wrong kinds, bad base64 and bad YAML", () => {
    expect(transformSecret("kind: ConfigMap\n", { mode: "encode" }).error?.message).toContain("ConfigMap");
    expect(transformSecret("kind: Secret\ndata:\n  a: '***'\n", { mode: "decode" }).error?.message).toContain('"a"');
    expect(transformSecret("a: [", { mode: "encode" }).error).not.toBeNull();
    expect(transformSecret("not a line", { mode: "from-env" }).error?.message).toContain("KEY=VALUE");
  });
});
