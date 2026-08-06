import { validateCronExpression, validateGeneratedJsonSchema, validateGeneratedRegex } from "./validate-generated";

describe("validateCronExpression", () => {
  it("accepts a well-formed 5-field expression", () => {
    expect(validateCronExpression("0 9 * * 1-5")).toEqual({ valid: true });
  });

  it("accepts comma/step syntax", () => {
    expect(validateCronExpression("*/15 0,12 1 */2 *")).toEqual({ valid: true });
  });

  it("rejects a wrong field count", () => {
    const result = validateCronExpression("0 9 * *");
    expect(result.valid).toBe(false);
    expect(result.note).toMatch(/5 fields/);
  });

  it("rejects a field with invalid characters", () => {
    const result = validateCronExpression("0 9 * * MON-FRI");
    expect(result.valid).toBe(false);
    expect(result.note).toMatch(/Field 5/);
  });
});

describe("validateGeneratedRegex", () => {
  it("accepts a compilable pattern with no examples", () => {
    const result = validateGeneratedRegex("^[a-z]+$", undefined);
    expect(result.valid).toBe(true);
    expect(result.note).toMatch(/no test strings/);
  });

  it("accepts a pattern that matches every provided example", () => {
    expect(validateGeneratedRegex("^\\d{3}-\\d{4}$", ["555-1234", "000-0000"])).toEqual({ valid: true });
  });

  it("rejects a pattern that fails to match some examples", () => {
    const result = validateGeneratedRegex("^\\d{3}-\\d{4}$", ["555-1234", "not-a-match"]);
    expect(result.valid).toBe(false);
    expect(result.note).toMatch(/1 of 2/);
  });

  it("rejects an uncompilable pattern", () => {
    const result = validateGeneratedRegex("(unterminated", undefined);
    expect(result.valid).toBe(false);
  });
});

describe("validateGeneratedJsonSchema", () => {
  it("accepts valid JSON", () => {
    const result = validateGeneratedJsonSchema('{"type":"object"}');
    expect(result.valid).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = validateGeneratedJsonSchema("{type: object}");
    expect(result.valid).toBe(false);
  });
});
