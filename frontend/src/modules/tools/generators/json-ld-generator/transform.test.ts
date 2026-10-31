import { describe, expect, it } from "vitest";
import { buildJsonLd, jsonLdGenerator as fn, toIsoDuration, TYPES } from "./transform";
import { jsonLdGeneratorOptionsSchema } from "./schema";

const O = jsonLdGeneratorOptionsSchema.parse({});
const build = (input: string, o: Partial<typeof O> = {}) => buildJsonLd(input, { ...O, ...o });
const json = (input: string, o: Partial<typeof O> = {}) => JSON.parse(fn(input, { ...o, format: "json" }).output) as Record<string, unknown>;

describe("every sample", () => {
  for (const type of Object.keys(TYPES) as Array<keyof typeof TYPES>) {
    it(`${type}: sample builds valid JSON with all required properties`, () => {
      const info = TYPES[type];
      const r = fn(info.sample.replace(/^[^]*$/, info.sample), { type, format: "json" });
      expect(r.error).toBeNull();
      const parsed = JSON.parse(r.output) as Record<string, unknown>;
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(parsed["@type"]).toBe(type);
      expect(build(info.sample, { type }).missing, type).toEqual([]);
    });
  }
  it("empty input prints the sample for the chosen type", () => {
    expect(fn("", { type: "Product" }).output).toContain("Sample input for Product");
  });
});

describe("shape", () => {
  it("dotted keys nest and infer @type", () => {
    const p = json("name: Shoe\noffers.price: 19.9\noffers.priceCurrency: USD\noffers.availability: InStock", { type: "Product" }) as { offers: Record<string, unknown> };
    expect(p.offers).toEqual({ "@type": "Offer", price: 19.9, priceCurrency: "USD", availability: "https://schema.org/InStock" });
  });
  it("plain text shorthand for author, publisher and brand", () => {
    const a = json("headline: H\nauthor: Jane\npublisher: Acme\npublisher.logo: https://a.test/l.png") as { author: unknown; publisher: unknown };
    expect(a.author).toEqual({ "@type": "Person", name: "Jane" });
    expect(a.publisher).toEqual({ "@type": "Organization", name: "Acme", logo: "https://a.test/l.png" });
    expect((json("headline: H\nauthor: Acme", { authorType: "Organization" }) as { author: { "@type": string } }).author["@type"]).toBe("Organization");
  });
  it("repeated keys become arrays", () => {
    const p = json("name: X\nimage: https://a.test/1.jpg\nimage: https://a.test/2.jpg", { type: "Product" });
    expect(p.image).toEqual(["https://a.test/1.jpg", "https://a.test/2.jpg"]);
  });
  it("indexed objects build lists", () => {
    const b = json("name: Cafe\nopeningHoursSpecification[1].opens: 08:00\nopeningHoursSpecification[2].opens: 09:00\nopeningHoursSpecification[1].dayOfWeek: Monday\nopeningHoursSpecification[1].dayOfWeek: Tuesday", { type: "LocalBusiness" }) as { openingHoursSpecification: Array<Record<string, unknown>> };
    expect(b.openingHoursSpecification).toHaveLength(2);
    expect(b.openingHoursSpecification[0]).toMatchObject({ "@type": "OpeningHoursSpecification", opens: "08:00", dayOfWeek: ["Monday", "Tuesday"] });
  });
  it("LocalBusiness subtype", () => {
    expect(json("name: X\naddress: 1 Street", { type: "LocalBusiness", businessType: "Dentist" })["@type"]).toBe("Dentist");
    expect(json("name: X\naddress: 1 Street", { type: "LocalBusiness", businessType: "bad type" })["@type"]).toBe("LocalBusiness");
  });
  it("@type comes first and context can be dropped", () => {
    const out = fn("headline: H", { format: "minified", context: false }).output;
    expect(out).toMatch(/^<script type="application\/ld\+json">\n\{"@type":"Article","headline":"H"\}\n<\/script>$/);
  });
  it("numbers can stay strings", () => {
    const p = json("name: X\noffers.price: 5", { type: "Product", numbers: false }) as { offers: { price: unknown } };
    expect(p.offers.price).toBe("5");
  });
  it("sitelinks search target gets query-input", () => {
    const w = json("name: S\nurl: https://a.test\npotentialAction.target: https://a.test/s?q={search_term_string}", { type: "WebSite" }) as { potentialAction: Record<string, unknown> };
    expect(w.potentialAction).toMatchObject({ "@type": "SearchAction", "query-input": "required name=search_term_string" });
  });
  it("mainEntityOfPage URL becomes a WebPage", () => {
    expect((json("headline: H\nmainEntityOfPage: https://a.test/x") as { mainEntityOfPage: unknown }).mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": "https://a.test/x" });
  });
});

describe("special types", () => {
  it("breadcrumbs number the crumbs and allow a bare last crumb", () => {
    const b = json("Home | https://a.test/\nGuides | https://a.test/g/\nThis page", { type: "BreadcrumbList" }) as { itemListElement: Array<Record<string, unknown>> };
    expect(b.itemListElement.map((x) => x.position)).toEqual([1, 2, 3]);
    expect(b.itemListElement[2]).toEqual({ "@type": "ListItem", position: 3, name: "This page" });
    expect(build("Home\nGuides | https://a.test/g/", { type: "BreadcrumbList" }).warnings.join()).toMatch(/only the last crumb/);
  });
  it("FAQ pairs, multi-line answers", () => {
    const f = json("Q: What?\nA: First line\ncontinues here\nQ: Why?\nA: Because", { type: "FAQPage" }) as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(f.mainEntity).toHaveLength(2);
    expect(f.mainEntity[0]!.acceptedAnswer.text).toBe("First line continues here");
    expect(fn("A: orphan", { type: "FAQPage" }).error).not.toBeNull();
  });
  it("recipe steps become numbered HowToStep", () => {
    const r = json("name: Tea\nimage: https://a.test/t.jpg\nstep: Boil\nstep: Pour", { type: "Recipe" }) as { recipeInstructions: Array<Record<string, unknown>> };
    expect(r.recipeInstructions).toEqual([{ "@type": "HowToStep", position: 1, text: "Boil" }, { "@type": "HowToStep", position: 2, text: "Pour" }]);
  });
  it("job salary nests QuantitativeValue", () => {
    const j = json("title: T\nbaseSalary.currency: INR\nbaseSalary.value.minValue: 100\nbaseSalary.value.unitText: YEAR", { type: "JobPosting" }) as { baseSalary: { value: Record<string, unknown> } };
    expect(j.baseSalary.value).toEqual({ "@type": "QuantitativeValue", minValue: 100, unitText: "YEAR" });
  });
});

describe("conversions and checks", () => {
  it("durations", () => {
    expect(toIsoDuration("1 h 15 min")).toBe("PT1H15M");
    expect(toIsoDuration("45 minutes")).toBe("PT45M");
    expect(toIsoDuration("PT30M")).toBe("PT30M");
    expect(toIsoDuration("2 days 3 hours")).toBe("P2DT3H");
    expect(toIsoDuration("soon")).toBeNull();
    expect(json("name: R\nimage: https://a.test/i.jpg\nprepTime: 5 min", { type: "Recipe" }).prepTime).toBe("PT5M");
  });
  it("reports missing required properties", () => {
    expect(build("description: x", { type: "Product" }).missing).toEqual(["name", "one of offers / review / aggregateRating"]);
    expect(build("name: x\noffers.price: 1", { type: "Product" }).missing).toEqual(["offers.priceCurrency"]);
  });
  it("warns about bad dates, URLs, enums and currencies", () => {
    const w = build("name: X\nstartDate: tomorrow\nimage: /rel.png\neventStatus: Happening\nlocation: Y\noffers.priceCurrency: usd", { type: "Event" }).warnings.join("\n");
    expect(w).toMatch(/startDate: "tomorrow" is not an ISO 8601/);
    expect(w).toMatch(/image: "\/rel.png" should be an absolute/);
    expect(w).toMatch(/eventStatus: "Happening" is not one of/);
    expect(w).toMatch(/priceCurrency: "usd"/);
  });
  it("checks format", () => {
    expect(fn("name: x", { type: "Product", format: "checks" }).output).toContain("Missing required: one of offers");
    expect(fn(TYPES.Product.sample, { type: "Product", format: "checks" }).output).toContain("All required properties present");
  });
  it("script format carries an HTML comment when required properties are missing", () => {
    expect(fn("description: x", { type: "Product" }).output.startsWith("<!-- missing required: name, one of")).toBe(true);
  });
  it("cannot be broken out of the script element", () => {
    const out = fn("headline: </script><script>alert(1)</script>", { type: "Article" }).output;
    expect(out.match(/<\/script>/g)).toHaveLength(1);
    expect(out).toContain("<\\/script>");
  });
  it("bad lines are errors", () => {
    expect(fn("just words", { type: "Article" }).error?.message).toMatch(/expected "property: value"/);
    expect(fn("a b: c", { type: "Article" }).error).not.toBeNull();
  });
});
