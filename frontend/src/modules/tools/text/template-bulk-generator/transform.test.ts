import { describe, expect, it } from "vitest";
import { parseCsv, parseData, render, runTemplateBulkGenerator } from "./transform";

describe("data parsing", () => {
  it("parses RFC 4180 CSV with quotes and newlines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n"multi\nline",2\n', ",")).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", "2"]]);
  });
  it("detects TSV, semicolons and JSON", () => {
    expect(parseData("id\tname\n1\tAnn")).toEqual([{ id: "1", name: "Ann" }]);
    expect(parseData("id;name\n1;Ann")).toEqual([{ id: "1", name: "Ann" }]);
    expect(parseData('[{"id":1,"tags":["a"],"x":null}]')).toEqual([{ id: "1", tags: '["a"]', x: "" }]);
  });
});

describe("render", () => {
  const row = { name: "O'Brien", email: "ann@x.io", city: "" };
  it("applies chained filters and row numbers", () => {
    expect(render("INSERT INTO t VALUES ({{#}}, {{name|sql}}, {{email | upper}});", row, 0, "error")).toBe("INSERT INTO t VALUES (1, 'O''Brien', ANN@X.IO);");
    expect(render("{{city|default:Pune}} {{name|slug}} {{index0}} {{# | pad:3}}", row, 4, "error")).toBe("Pune o-brien 4 005");
    expect(render("curl -d {{name|shell}} /u?e={{email|url}}", row, 0, "error")).toBe("curl -d 'O'\\''Brien' /u?e=ann%40x.io");
  });
  it("handles missing columns per option", () => {
    expect(() => render("{{nope}}", row, 0, "error")).toThrow('Row 1 has no column "nope"');
    expect(render("{{nope}}", row, 0, "keep")).toBe("{{nope}}");
    expect(render("[{{nope}}]", row, 0, "empty")).toBe("[]");
    expect(() => render("{{name|shout}}", row, 0, "error")).toThrow('Unknown filter "shout"');
  });
});

describe("runTemplateBulkGenerator", () => {
  it("joins rendered rows", () => {
    const out = runTemplateBulkGenerator("kubectl label ns {{ns}} team={{team|lower}}", "ns,team\npay,CORE\nkyc,Risk", { separator: "newline", missing: "error" }).output;
    expect(out).toBe("kubectl label ns pay team=core\nkubectl label ns kyc team=risk");
    expect(runTemplateBulkGenerator("{{a}}", "a\n1\n2", { separator: "comma", missing: "error" }).output).toBe("1,\n2");
  });
  it("reports data errors", () => {
    expect(runTemplateBulkGenerator("{{a}}", 'a\n"oops', { separator: "newline", missing: "error" }).error?.message).toContain("Unclosed quote");
    expect(runTemplateBulkGenerator("{{a}}", "a", { separator: "newline", missing: "error" }).error?.message).toContain("No data rows");
  });
});
