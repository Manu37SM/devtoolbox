import { describe, expect, it } from "vitest";
import { normLevel, parseLogfmt, runStructuredLogConverter, toLogfmt } from "./transform";
import type { StructuredLogConverterOptions } from "./schema";

const run = (s: string, o: Partial<StructuredLogConverterOptions> = {}) => runStructuredLogConverter(s, { output: "pretty", minLevel: "all", ...o }).output;

describe("logfmt", () => {
  it("parses quoted values, escapes and flags", () => {
    expect(parseLogfmt('level=info msg="hello \\"world\\"" user=42 dry_run path=/a=b')).toEqual({ level: "info", msg: 'hello "world"', user: "42", dry_run: true, path: "/a=b" });
  });
  it("round-trips through toLogfmt and flattens nested objects", () => {
    expect(toLogfmt({ msg: "a b", n: 1, ok: true, e: "", http: { status: 500 } })).toBe('msg="a b" n=1 ok e="" http.status=500');
    expect(parseLogfmt(toLogfmt({ msg: 'quote " and \\ slash' }))).toEqual({ msg: 'quote " and \\ slash' });
  });
  it("normalises levels from many loggers", () => {
    expect([30, 50, "WARNING", "ERR", "CRITICAL", "fine", "notice"].map(normLevel)).toEqual(["info", "error", "warn", "error", "fatal", "debug", "info"]);
  });
});

describe("runStructuredLogConverter", () => {
  const MIXED = `{"level":30,"time":1706695200000,"msg":"server started","port":8080}
time=2024-01-31T10:00:01Z level=error msg="db down" err="connection refused" retry=3
{"@timestamp":"2024-01-31T10:00:02Z","log":{"level":"warn"},"message":"slow query","event":{"duration":1200}}
plain text line`;
  it("pretty prints JSON, logfmt and ECS lines", () => {
    expect(run(MIXED).split("\n")).toEqual([
      "2024-01-31T10:00:00.000Z  INFO   server started  port=8080",
      '2024-01-31T10:00:01Z  ERROR  db down  err="connection refused" retry=3',
      "2024-01-31T10:00:02Z  WARN   slow query  event.duration=1200",
      "-      plain text line",
    ]);
  });
  it("filters by minimum level, keeping lines without a level", () => {
    const out = run(MIXED, { minLevel: "warn" });
    expect(out).not.toContain("server started");
    expect(out).toContain("db down");
    expect(out).toContain("plain text line");
    expect(out).toContain("(1 line below warn hidden)");
  });
  it("converts logfmt to JSON lines and JSON to logfmt", () => {
    expect(run('level=info msg="a b" n=1', { output: "json" })).toBe('{"level":"info","msg":"a b","n":"1"}');
    expect(run('{"level":"info","msg":"a b","ctx":{"id":7}}', { output: "logfmt" })).toBe('level=info msg="a b" ctx.id=7');
  });
});
