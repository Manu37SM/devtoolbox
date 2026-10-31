import { describe, expect, it } from "vitest";
import { csvPivot, parseAggregates } from "./transform";

// Expected values come from pandas 3.0.5 (groupby / pivot_table) on this data.
const CSV = `region,product,amount,qty
East,A,100.5,2
East,B,"1,200",3
West,A,50,1
West,A,75.25,4
West,B,n/a,2
North,B,10,1
`;
const run = (o: Parameters<typeof csvPivot>[1]) => csvPivot(CSV, o);

describe("csvPivot group by", () => {
  it("matches pandas count, sum, mean, max, median, nunique", () => {
    const r = run({ groupBy: "region", aggregates: "count(), sum(amount), avg(amount), max(amount), median(amount), distinct(product)", decimals: 4 });
    expect(r.error).toBeNull();
    expect(r.output).toBe(
      ["region,count,sum_amount,avg_amount,max_amount,median_amount,distinct_product", "East,2,1300.5,650.25,1200,650.25,2", "North,1,10,10,10,10,1", "West,3,125.25,62.625,75.25,62.625,2"].join("\n"),
    );
  });
  it("matches pandas sample standard deviation and is blank for one value", () => {
    const r = run({ groupBy: "region", aggregates: "stdev(amount) as sd", output: "json" });
    const j = JSON.parse(r.output) as { region: string; sd: string }[];
    expect(j.find((x) => x.region === "East")!.sd).toBe("777.4639");
    expect(j.find((x) => x.region === "West")!.sd).toBe("17.8544");
    expect(j.find((x) => x.region === "North")!.sd).toBe("");
  });
  it("groups by several columns and by column number", () => {
    const r = run({ groupBy: "1,product", aggregates: "sum(qty)", sortBy: "group" });
    expect(r.output.split("\n")).toEqual(["region,product,sum_qty", "East,A,2", "East,B,3", "North,B,1", "West,A,5", "West,B,2"]);
  });
  it("aggregates the whole file when no group is given", () => {
    expect(run({ aggregates: "count(), sum(qty)" }).output).toBe("count,sum_qty\n6,13");
  });
  it("sorts by the first aggregate and by group descending", () => {
    expect(run({ groupBy: "region", aggregates: "sum(qty)", sortBy: "first-aggregate-desc" }).output.split("\n")[1]).toBe("West,7");
    expect(run({ groupBy: "region", aggregates: "count()", sortBy: "group-desc" }).output.split("\n")[1]).toBe("West,3");
  });
  it("fails on non-numeric cells when told to", () => {
    expect(run({ groupBy: "region", aggregates: "sum(amount)", skipNonNumeric: false }).error?.message).toMatch(/"n\/a".*not a number/);
  });
  it("adds a grand total for additive functions", () => {
    expect(run({ groupBy: "region", aggregates: "sum(qty)", totals: true }).output.endsWith("Total,13")).toBe(true);
  });
  it("concat, first, last, mode and case-insensitive grouping", () => {
    const r = csvPivot("k,v\na,x\nA,y\na,x", { groupBy: "k", aggregates: "concat(v), first(v), last(v), mode(v)", caseInsensitive: true });
    expect(r.output.split("\n")[1]).toBe('a,x; y,x,x,x');
  });
});

describe("csvPivot pivoting", () => {
  it("matches pandas pivot_table(sum) with the numeric fill", () => {
    const r = run({ groupBy: "region", pivotColumn: "product", aggregates: "sum(amount)" });
    expect(r.output).toBe(["region,A,B", "East,100.5,1200", "North,,10", "West,125.25,0"].join("\n"));
  });
  it("fills missing combinations and adds totals", () => {
    const r = run({ groupBy: "region", pivotColumn: "product", aggregates: "sum(qty)", fill: "0", totals: true });
    expect(r.output).toBe(["region,A,B,Total", "East,2,3,5", "North,0,1,1", "West,5,2,7", "Total,7,6,13"].join("\n"));
  });
  it("renders markdown and TSV", () => {
    expect(run({ groupBy: "region", aggregates: "count()", output: "markdown" }).output.split("\n")[1]).toBe("| --- | --- |");
    expect(run({ groupBy: "region", aggregates: "count()", output: "tsv" }).output.split("\n")[0]).toBe("region\tcount");
  });
});

describe("csvPivot errors", () => {
  it("explains bad aggregates and unknown columns", () => {
    expect(parseAggregates("sum()", ["a"])).toMatch(/needs a column/);
    expect(parseAggregates("bogus(a)", ["a"])).toMatch(/Unknown function/);
    expect(parseAggregates("sum(a) oops", ["a"])).toMatch(/Could not read/);
    expect(run({ groupBy: "nope" }).error?.message).toMatch(/not found/);
    expect(run({ aggregates: "" }).error).not.toBeNull();
    expect(csvPivot("", {})).toEqual({ output: "", error: null });
  });
});
