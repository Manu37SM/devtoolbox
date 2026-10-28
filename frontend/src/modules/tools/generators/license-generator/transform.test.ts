import { describe, expect, it } from "vitest";
import { commentOut, generateLicense, parseLicenseInput } from "./transform";

const o = { license: "mit", output: "file", comment: "block" } as const;

describe("parseLicenseInput", () => {
  it("reads key/value lines and bare names", () => {
    expect(parseLicenseInput("holder: Jane Doe\nyear: 2020-2026", 2030)).toEqual({ holder: "Jane Doe", year: "2020-2026" });
    expect(parseLicenseInput("Jane Doe", 2030)).toEqual({ holder: "Jane Doe", year: "2030" });
  });
});

describe("generateLicense", () => {
  it("fills in the MIT text", () => {
    const r = generateLicense("Jane Doe", o, 2026);
    expect(r.output.startsWith("MIT License\n\nCopyright (c) 2026 Jane Doe\n\nPermission is hereby granted")).toBe(true);
    expect(r.output).not.toContain("{year}");
    expect(r.output).not.toContain("{holder}");
  });
  it("covers every license with the right marker text", () => {
    const text = (license: "mit" | "isc" | "bsd-2" | "bsd-3" | "unlicense" | "apache-2") => generateLicense("ACME", { ...o, license }, 2026).output;
    expect(text("isc")).toContain("ISC License");
    expect(text("bsd-2")).toContain("BSD 2-Clause License");
    expect(text("bsd-2")).not.toContain("Neither the name");
    expect(text("bsd-3")).toContain("Neither the name of the copyright holder");
    expect(text("unlicense")).toContain("https://unlicense.org");
    expect(text("apache-2")).toContain("Licensed under the Apache License, Version 2.0");
    expect(text("apache-2")).toContain("full license text");
  });
  it("creates source headers with an SPDX id in several comment styles", () => {
    const h = (comment: "block" | "line" | "hash" | "none") => generateLicense("ACME", { ...o, output: "header", comment }, 2026).output;
    expect(h("block")).toBe("/*\n * Copyright (c) 2026 ACME\n * SPDX-License-Identifier: MIT\n */\n");
    expect(h("line")).toBe("// Copyright (c) 2026 ACME\n// SPDX-License-Identifier: MIT\n");
    expect(h("hash")).toBe("# Copyright (c) 2026 ACME\n# SPDX-License-Identifier: MIT\n");
    expect(commentOut("a\n\nb", "block")).toBe("/*\n * a\n *\n * b\n */");
  });
  it("validates", () => {
    expect(generateLicense("", o, 2026).error).not.toBeNull();
    expect(generateLicense("holder: X\nyear: soon", o, 2026).error?.message).toContain("Year");
  });
});
