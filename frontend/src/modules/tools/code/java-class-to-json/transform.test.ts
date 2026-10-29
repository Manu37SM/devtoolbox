import { describe, expect, it } from "vitest";
import { parseJava, runJavaClassToJson } from "./transform";

const SRC = `package com.acme;

import com.fasterxml.jackson.annotation.*;

/** A customer. */
@Data
public class Customer {
    private static final long serialVersionUID = 1L;
    private Long id;
    @JsonProperty("full_name") private String fullName;
    private String email;
    @JsonIgnore private String passwordHash;
    private BigDecimal balance;
    private LocalDate dateOfBirth;
    private Status status = Status.ACTIVE;
    private List<Address> addresses = new ArrayList<>();
    private Map<String, Integer> scores;
    private Optional<String> nickname;
    private byte[] avatar;
    private Customer referredBy;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public enum Status { ACTIVE, SUSPENDED, CLOSED }
}

record Address(String city, @JsonProperty("pin_code") String postalCode, int floor) {}
`;

describe("parseJava", () => {
  it("finds classes, records and enums and skips statics, methods and nested bodies", () => {
    const t = parseJava(SRC);
    expect(t.map((x) => `${x.kind}:${x.name}`)).toEqual(["class:Customer", "enum:Status", "record:Address"]);
    expect(t[0]!.fields.map((f) => f.name)).toEqual(["id", "fullName", "email", "passwordHash", "balance", "dateOfBirth", "status", "addresses", "scores", "nickname", "avatar", "referredBy"]);
    expect(t[0]!.fields[1]!.json).toBe("full_name");
    expect(t[0]!.fields[3]!.ignored).toBe(true);
    expect(t[1]!.constants).toEqual(["ACTIVE", "SUSPENDED", "CLOSED"]);
    expect(t[2]!.fields.map((f) => f.json)).toEqual(["city", "pin_code", "floor"]);
  });
});

describe("runJavaClassToJson", () => {
  it("builds a realistic JSON sample with nested records and cycle protection", () => {
    const json = JSON.parse(runJavaClassToJson(SRC, { output: "json", naming: "as-is" }).output);
    expect(json).toEqual({
      id: 1, full_name: "Asha", email: "user@example.com", balance: 10.5, dateOfBirth: "2024-01-31", status: "ACTIVE",
      addresses: [{ city: "Pune", pin_code: "411001", floor: 1 }], scores: { key: 1 }, nickname: "Asha", avatar: "AQIDBA==", referredBy: null,
    });
  });
  it("emits TypeScript with unions, optionals and records", () => {
    const ts = runJavaClassToJson(SRC, { output: "typescript", naming: "as-is" }).output;
    expect(ts).toContain("export interface Customer {\n  id: number;\n  full_name: string;");
    expect(ts).toContain("  addresses: Address[];");
    expect(ts).toContain("  scores: Record<string, number>;");
    expect(ts).toContain("  nickname?: string | null;");
    expect(ts).toContain('export type Status = "ACTIVE" | "SUSPENDED" | "CLOSED";');
    expect(ts).toContain("export interface Address {\n  city: string;\n  pin_code: string;\n  floor: number;\n}");
    expect(ts).not.toContain("passwordHash");
  });
  it("applies snake_case naming without overriding explicit names", () => {
    const json = JSON.parse(runJavaClassToJson("class A { private String firstName; @JsonProperty(\"X\") private int someValue; private Date createdAt; }", { output: "json", naming: "snake" }).output.split("\n\n")[0]!);
    expect(json).toEqual({ first_name: "Asha", X: 1, created_at: 1706696130000 });
  });
  it("handles multiple declarators, arrays and unknown types", () => {
    const out = runJavaClassToJson("public class P { int x, y; String[] tags; Money price; }", { output: "both", naming: "as-is" }).output;
    expect(out).toContain('"x": 1,\n  "y": 1');
    expect(out).toContain('"tags": [\n    "string"\n  ]');
    expect(out).toContain("price: unknown /* Money */;");
  });
  it("errors when there is no type", () => {
    expect(runJavaClassToJson("int x = 1;", { output: "both", naming: "as-is" }).error?.message).toContain("No class");
  });
});
