import { attemptDeterministicJsonRepair } from "./json-repair";

describe("attemptDeterministicJsonRepair", () => {
  it("returns already-valid JSON unchanged", () => {
    const input = '{"a":1,"b":[1,2,3]}';
    expect(attemptDeterministicJsonRepair(input)).toBe(input);
  });

  it("removes a trailing comma before a closing brace", () => {
    const result = attemptDeterministicJsonRepair('{"a":1,"b":2,}');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1, b: 2 });
  });

  it("removes a trailing comma before a closing bracket", () => {
    const result = attemptDeterministicJsonRepair('{"a":[1,2,3,]}');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: [1, 2, 3] });
  });

  it("quotes unquoted object keys", () => {
    const result = attemptDeterministicJsonRepair('{a: 1, b: "two"}');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1, b: "two" });
  });

  it("converts single-quoted strings to double-quoted", () => {
    const result = attemptDeterministicJsonRepair("{\"a\": 'hello'}");
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: "hello" });
  });

  it("strips line comments", () => {
    const result = attemptDeterministicJsonRepair('{"a": 1} // trailing comment');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1 });
  });

  it("strips block comments", () => {
    const result = attemptDeterministicJsonRepair('{"a": /* inline */ 1}');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1 });
  });

  it("handles a combination of unquoted keys and a trailing comma", () => {
    const result = attemptDeterministicJsonRepair("{a: 1, b: 2,}");
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1, b: 2 });
  });

  it("returns null for structurally damaged JSON (unbalanced brackets)", () => {
    expect(attemptDeterministicJsonRepair('{"a": 1, "b": [1, 2')).toBeNull();
  });

  it("returns null for truncated input", () => {
    expect(attemptDeterministicJsonRepair('{"a": ')).toBeNull();
  });
});
