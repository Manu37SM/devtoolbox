import type { TransformResult } from "@/lib/tool-transform";
import type { JsonLdGeneratorOptions } from "./schema";

type Opts = JsonLdGeneratorOptions;
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

interface TypeInfo {
  /** Properties Google/schema.org consumers need for the markup to be useful */
  required: string[];
  /** At least one of these must be present */
  oneOf?: string[];
  recommended: string[];
  sample: string;
  note?: string;
}

const SAMPLE_ARTICLE = `headline: How to Tune PostgreSQL for Web Workloads
description: A practical walk-through of memory, WAL and planner settings.
image: https://example.com/img/postgres-tuning.jpg
author: Jane Doe
author.url: https://example.com/authors/jane
datePublished: 2026-03-04T08:00:00+05:30
dateModified: 2026-03-06T10:30:00+05:30
publisher: Example Media
publisher.logo: https://example.com/logo.png
mainEntityOfPage: https://example.com/blog/postgres-tuning`;

export const TYPES: Record<Opts["type"], TypeInfo> = {
  Article: { required: [], recommended: ["headline", "image", "datePublished", "dateModified", "author"], sample: SAMPLE_ARTICLE },
  NewsArticle: { required: [], recommended: ["headline", "image", "datePublished", "dateModified", "author"], sample: SAMPLE_ARTICLE },
  BlogPosting: { required: [], recommended: ["headline", "image", "datePublished", "dateModified", "author"], sample: SAMPLE_ARTICLE },
  Product: {
    required: ["name"],
    oneOf: ["offers", "review", "aggregateRating"],
    recommended: ["image", "description", "sku", "brand"],
    sample: `name: Trail Runner 2 Running Shoe
description: Lightweight trail shoe with a rock plate.
image: https://example.com/shoes/trail-runner-2.jpg
image: https://example.com/shoes/trail-runner-2-side.jpg
sku: TR2-BLK-42
gtin13: 4006381333931
brand: Acme Outdoors
offers.price: 129.90
offers.priceCurrency: EUR
offers.availability: InStock
offers.itemCondition: NewCondition
offers.url: https://example.com/shoes/trail-runner-2
offers.priceValidUntil: 2026-12-31
aggregateRating.ratingValue: 4.6
aggregateRating.reviewCount: 218`,
  },
  Organization: {
    required: ["name"],
    recommended: ["url", "logo", "sameAs", "contactPoint"],
    sample: `name: Example Corp
url: https://example.com
logo: https://example.com/logo.png
sameAs: https://www.linkedin.com/company/example
sameAs: https://github.com/example
contactPoint.contactType: customer support
contactPoint.telephone: +1-800-555-0100
contactPoint.email: support@example.com
address.streetAddress: 1 Main Street
address.addressLocality: Mumbai
address.addressRegion: MH
address.postalCode: 400001
address.addressCountry: IN`,
  },
  LocalBusiness: {
    required: ["name", "address"],
    recommended: ["telephone", "url", "geo", "openingHoursSpecification", "priceRange", "image"],
    sample: `name: Blue Door Cafe
image: https://example.com/cafe.jpg
url: https://example.com
telephone: +91-22-5550-0100
priceRange: ₹₹
servesCuisine: Coffee
address.streetAddress: 12 Marine Drive
address.addressLocality: Mumbai
address.addressRegion: MH
address.postalCode: 400020
address.addressCountry: IN
geo.latitude: 18.9432
geo.longitude: 72.8235
openingHoursSpecification[1].dayOfWeek: Monday
openingHoursSpecification[1].dayOfWeek: Tuesday
openingHoursSpecification[1].opens: 08:00
openingHoursSpecification[1].closes: 22:00
openingHoursSpecification[2].dayOfWeek: Saturday
openingHoursSpecification[2].opens: 09:00
openingHoursSpecification[2].closes: 23:30`,
  },
  Person: {
    required: ["name"],
    recommended: ["url", "image", "jobTitle", "sameAs"],
    sample: `name: Jane Doe
jobTitle: Staff Engineer
url: https://example.com/jane
image: https://example.com/jane.jpg
sameAs: https://www.linkedin.com/in/janedoe
worksFor: Example Corp`,
  },
  WebSite: {
    required: ["name", "url"],
    recommended: [],
    sample: `name: Example Docs
url: https://docs.example.com
potentialAction.target: https://docs.example.com/search?q={search_term_string}`,
    note: "Google retired the sitelinks search box in 2024; the markup is still valid schema.org for other consumers.",
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
    sample: `Home | https://example.com/
Guides | https://example.com/guides/
PostgreSQL tuning | https://example.com/guides/postgres-tuning`,
    note: "One crumb per line as: Name | URL. The last crumb may omit the URL.",
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
    sample: `Q: What is shared_buffers?
A: The memory PostgreSQL uses for caching table and index pages. A quarter of RAM is a common start.
Q: Should I raise max_connections?
A: Prefer a pooler such as PgBouncer before raising it.`,
    note: "Google stopped showing FAQ rich results in May 2026. The markup remains valid schema.org and other search engines can read it.",
  },
  Event: {
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "eventStatus", "eventAttendanceMode", "image", "description", "offers", "organizer"],
    sample: `name: Mumbai Postgres Meetup
description: Talks on indexing and vacuum.
startDate: 2026-11-21T18:30:00+05:30
endDate: 2026-11-21T21:00:00+05:30
eventStatus: EventScheduled
eventAttendanceMode: OfflineEventAttendanceMode
location: Hub 91, Bandra
location.address.streetAddress: 5th Floor, Linking Road
location.address.addressLocality: Mumbai
location.address.addressCountry: IN
image: https://example.com/meetup.jpg
organizer: Mumbai Postgres Group
organizer.url: https://example.com/group
offers.price: 0
offers.priceCurrency: INR
offers.availability: InStock
offers.url: https://example.com/meetup/register`,
  },
  Recipe: {
    required: ["name", "image"],
    recommended: ["author", "datePublished", "description", "prepTime", "cookTime", "recipeIngredient", "recipeInstructions", "nutrition", "aggregateRating"],
    sample: `name: Masala Chai
image: https://example.com/chai.jpg
author: Jane Doe
datePublished: 2026-01-12
description: Strong spiced tea with milk.
prepTime: 5 min
cookTime: 10 min
totalTime: 15 min
recipeYield: 2 cups
recipeCategory: Drink
recipeIngredient: 2 cups water
recipeIngredient: 1 cup milk
recipeIngredient: 2 tsp black tea
recipeIngredient: 4 crushed cardamom pods
step: Boil the water with cardamom for 2 minutes.
step: Add tea and milk, simmer for 5 minutes, strain and serve.
nutrition.calories: 120 calories
aggregateRating.ratingValue: 4.8
aggregateRating.ratingCount: 90`,
  },
  VideoObject: {
    required: ["name", "thumbnailUrl", "uploadDate"],
    recommended: ["description", "contentUrl", "embedUrl", "duration"],
    sample: `name: PostgreSQL vacuum explained
description: What autovacuum does and how to tune it.
thumbnailUrl: https://example.com/vacuum-thumb.jpg
uploadDate: 2026-02-10T09:00:00+00:00
duration: 12 min 30 s
contentUrl: https://example.com/videos/vacuum.mp4
embedUrl: https://example.com/embed/vacuum`,
  },
  JobPosting: {
    required: ["title", "description", "datePosted", "hiringOrganization", "jobLocation"],
    recommended: ["validThrough", "employmentType", "baseSalary"],
    sample: `title: Senior Java Developer
description: Build payment APIs on Spring Boot and Oracle.
datePosted: 2026-10-01
validThrough: 2026-12-01T00:00:00+05:30
employmentType: FULL_TIME
hiringOrganization: Example Bank
hiringOrganization.sameAs: https://example.com
jobLocation.address.addressLocality: Mumbai
jobLocation.address.addressRegion: MH
jobLocation.address.addressCountry: IN
baseSalary.currency: INR
baseSalary.value.minValue: 2400000
baseSalary.value.maxValue: 3600000
baseSalary.value.unitText: YEAR`,
  },
  SoftwareApplication: {
    required: ["name", "offers"],
    oneOf: ["aggregateRating", "review"],
    recommended: ["applicationCategory", "operatingSystem"],
    sample: `name: DevToolbox
applicationCategory: DeveloperApplication
operatingSystem: Web
offers.price: 0
offers.priceCurrency: USD
aggregateRating.ratingValue: 4.7
aggregateRating.ratingCount: 312`,
  },
};

/** property → @type for nested objects (and for plain-text shorthand values) */
const NESTED: Record<string, string> = {
  publisher: "Organization",
  brand: "Brand",
  offers: "Offer",
  aggregateRating: "AggregateRating",
  review: "Review",
  reviewRating: "Rating",
  address: "PostalAddress",
  geo: "GeoCoordinates",
  hiringOrganization: "Organization",
  organizer: "Organization",
  performer: "Person",
  worksFor: "Organization",
  baseSalary: "MonetaryAmount",
  nutrition: "NutritionInformation",
  contactPoint: "ContactPoint",
  openingHoursSpecification: "OpeningHoursSpecification",
  location: "Place",
  jobLocation: "Place",
  potentialAction: "SearchAction",
  mainEntityOfPage: "WebPage",
  creator: "Person",
};
/** Plain text shorthand: `brand: Acme` becomes {"@type":"Brand","name":"Acme"} */
const NAME_SHORTHAND = new Set(["publisher", "brand", "hiringOrganization", "organizer", "performer", "worksFor", "location", "jobLocation", "author", "creator"]);
const NUMERIC = new Set(["price", "ratingValue", "ratingCount", "reviewCount", "bestRating", "worstRating", "latitude", "longitude", "minValue", "maxValue", "value", "position"]);
const DURATION = new Set(["prepTime", "cookTime", "totalTime", "duration"]);
const URL_PROPS = new Set(["url", "image", "logo", "sameAs", "thumbnailUrl", "contentUrl", "embedUrl", "mainEntityOfPage", "target"]);
const DATE_PROPS = new Set(["datePublished", "dateModified", "datePosted", "validThrough", "startDate", "endDate", "uploadDate", "priceValidUntil", "birthDate"]);
const ENUMS: Record<string, string> = {
  availability: "ItemAvailability",
  itemCondition: "OfferItemCondition",
  eventStatus: "EventStatusType",
  eventAttendanceMode: "EventAttendanceModeEnumeration",
};
const ENUM_VALUES: Record<string, string[]> = {
  ItemAvailability: ["InStock", "OutOfStock", "PreOrder", "BackOrder", "SoldOut", "LimitedAvailability", "OnlineOnly", "InStoreOnly", "Discontinued", "PreSale"],
  OfferItemCondition: ["NewCondition", "UsedCondition", "RefurbishedCondition", "DamagedCondition"],
  EventStatusType: ["EventScheduled", "EventCancelled", "EventMovedOnline", "EventPostponed", "EventRescheduled"],
  EventAttendanceModeEnumeration: ["OfflineEventAttendanceMode", "OnlineEventAttendanceMode", "MixedEventAttendanceMode"],
};

export function toIsoDuration(v: string): string | null {
  const t = v.trim();
  if (/^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/i.test(t) && t.length > 2 && !/T$/i.test(t)) return t.toUpperCase();
  const re = /(\d+(?:\.\d+)?)\s*(d(?:ays?)?|h(?:ours?|rs?)?|m(?:in(?:ute)?s?)?|s(?:ec(?:ond)?s?)?)\b/gi;
  let d = 0, h = 0, m = 0, s = 0, any = false;
  let rest = t;
  for (const mt of t.matchAll(re)) {
    any = true;
    rest = rest.replace(mt[0], "");
    const n = Number(mt[1]);
    const u = mt[2]!.toLowerCase()[0];
    if (u === "d") d += n;
    else if (u === "h") h += n;
    else if (u === "m") m += n;
    else s += n;
  }
  if (!any || rest.replace(/[\s,and]+/gi, "") !== "") return null;
  const date = d ? `${d}D` : "";
  const time = `${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
  return "P" + date + (time ? "T" + time : "");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

interface Ctx {
  type: Opts["type"];
  o: Opts;
  warnings: string[];
}

function convertScalar(prop: string, raw: string, ctx: Ctx): Json {
  const v = raw.trim();
  if (prop in ENUMS) {
    const bare = v.replace(/^https?:\/\/schema\.org\//, "");
    const group = ENUMS[prop]!;
    if (!ENUM_VALUES[group]!.includes(bare)) ctx.warnings.push(`${prop}: "${v}" is not one of ${ENUM_VALUES[group]!.join(", ")}`);
    return `https://schema.org/${bare}`;
  }
  if (DURATION.has(prop)) {
    const iso = toIsoDuration(v);
    if (!iso) {
      ctx.warnings.push(`${prop}: "${v}" is not a duration (use PT1H30M or text like 1 h 30 min)`);
      return v;
    }
    return iso;
  }
  if (DATE_PROPS.has(prop) && !ISO_DATE.test(v)) ctx.warnings.push(`${prop}: "${v}" is not an ISO 8601 date (2026-03-04 or 2026-03-04T08:00:00+05:30)`);
  if (URL_PROPS.has(prop) && !/^https?:\/\/\S+$/.test(v) && !(prop === "target" && /^https?:\/\//.test(v))) {
    ctx.warnings.push(`${prop}: "${v}" should be an absolute http(s) URL`);
  }
  if (prop === "priceCurrency" && !/^[A-Z]{3}$/.test(v)) ctx.warnings.push(`priceCurrency: "${v}" should be a 3-letter ISO 4217 code such as USD`);
  if (ctx.o.numbers && NUMERIC.has(prop) && /^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
  if (prop === "gtin13" && !/^\d{13}$/.test(v)) ctx.warnings.push(`gtin13: "${v}" must be 13 digits`);
  if (prop === "gtin12" && !/^\d{12}$/.test(v)) ctx.warnings.push(`gtin12: "${v}" must be 12 digits`);
  return v;
}

interface Seg {
  name: string;
  idx: number | null;
}
function parsePath(p: string): Seg[] {
  return p.split(".").map((s) => {
    const m = /^([A-Za-z@][A-Za-z0-9_@-]*)(?:\[(\d+)\])?$/.exec(s);
    if (!m) throw new Error(`"${p}" is not a valid property path`);
    return { name: m[1]!, idx: m[2] ? Number(m[2]) : null };
  });
}

function addValue(target: Obj, key: string, val: Json) {
  const cur = target[key];
  if (cur === undefined) target[key] = val;
  else if (Array.isArray(cur)) cur.push(val);
  else target[key] = [cur, val];
}

function getChild(parent: Obj, seg: Seg): Obj {
  const cur = parent[seg.name];
  if (seg.idx !== null) {
    const arr: Json[] = Array.isArray(cur) ? cur : cur === undefined ? [] : [cur];
    parent[seg.name] = arr;
    let o = arr[seg.idx - 1];
    if (o === undefined || typeof o !== "object" || o === null || Array.isArray(o)) {
      o = {};
      arr[seg.idx - 1] = o;
    }
    return o as Obj;
  }
  if (cur && typeof cur === "object" && !Array.isArray(cur)) return cur as Obj;
  const o: Obj = {};
  if (typeof cur === "string") o.name = cur; // `brand: Acme` then `brand.url: ...`
  parent[seg.name] = o;
  return o;
}

function fillTypes(node: Obj, ctx: Ctx, prop: string, type: string | undefined) {
  if (type && node["@type"] === undefined) {
    // @type first for readability
    const rest = { ...node };
    for (const k of Object.keys(node)) delete node[k];
    node["@type"] = type;
    Object.assign(node, rest);
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "@type") continue;
    const walk = (x: Json): Json => {
      if (typeof x === "string" && NAME_SHORTHAND.has(k)) {
        const t = k === "author" ? ctx.o.authorType : NESTED[k] ?? "Thing";
        if (k === "mainEntityOfPage") return x;
        return { "@type": t, name: x };
      }
      if (typeof x === "string" && k === "mainEntityOfPage") return { "@type": "WebPage", "@id": x };
      if (x && typeof x === "object" && !Array.isArray(x)) {
        let t = k === "author" ? ctx.o.authorType : NESTED[k];
        if (k === "value" && prop === "baseSalary") t = "QuantitativeValue";
        if (k === "logo" || k === "image") t = "ImageObject";
        if (k === "location" && ctx.type === "Event") t = "Place";
        fillTypes(x as Obj, ctx, k, t);
      }
      return x;
    };
    node[k] = Array.isArray(v) ? v.map(walk) : walk(v);
  }
}

function parseKeyValues(lines: string[], ctx: Ctx): Obj {
  const root: Obj = {};
  for (const [n, line] of lines.entries()) {
    const m = /^([A-Za-z@][A-Za-z0-9_.@[\]-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) throw new Error(`Line ${n + 1}: expected "property: value", got "${line.slice(0, 40)}"`);
    const path = parsePath(m[1]!);
    const last = path[path.length - 1]!;
    let node = root;
    for (const seg of path.slice(0, -1)) node = getChild(node, seg);
    if (last.idx !== null) throw new Error(`Line ${n + 1}: put the index on the object, e.g. ${last.name}[1].name, not on the value`);
    const val = convertScalar(last.name, m[2]!, ctx);
    if (m[2]!.trim() === "") continue;
    addValue(node, last.name, val);
  }
  return root;
}

function buildSpecial(type: Opts["type"], lines: string[], ctx: Ctx): Obj | null {
  if (type === "BreadcrumbList") {
    const items = lines.map((l, i) => {
      const [name, url] = l.split("|").map((s) => s.trim());
      if (!name) throw new Error(`Line ${i + 1}: breadcrumb needs a name`);
      if (url && !/^https?:\/\/\S+$/.test(url)) ctx.warnings.push(`breadcrumb "${name}": URL should be absolute`);
      if (!url && i !== lines.length - 1) ctx.warnings.push(`breadcrumb "${name}": only the last crumb may omit its URL`);
      const o: Obj = { "@type": "ListItem", position: i + 1, name };
      if (url) o.item = url;
      return o;
    });
    return { itemListElement: items };
  }
  if (type === "FAQPage") {
    const qa: Array<{ q: string; a: string }> = [];
    let mode: "q" | "a" | null = null;
    for (const l of lines) {
      const q = /^Q\s*:\s*(.*)$/i.exec(l);
      const a = /^A\s*:\s*(.*)$/i.exec(l);
      if (q) {
        qa.push({ q: q[1]!, a: "" });
        mode = "q";
      } else if (a) {
        if (!qa.length) throw new Error("An answer (A:) needs a question (Q:) before it");
        qa[qa.length - 1]!.a = a[1]!;
        mode = "a";
      } else if (mode && qa.length) {
        const last = qa[qa.length - 1]!;
        if (mode === "q") last.q += " " + l;
        else last.a += " " + l;
      } else throw new Error(`Expected a line starting with Q: or A:, got "${l.slice(0, 40)}"`);
    }
    for (const x of qa) if (!x.a) ctx.warnings.push(`question "${x.q.slice(0, 40)}" has no answer`);
    return { mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };
  }
  return null;
}

export interface Built {
  data: Obj;
  warnings: string[];
  missing: string[];
}

const has = (o: Obj, k: string): boolean => {
  const v = o[k];
  return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
};

export function buildJsonLd(input: string, o: Opts): Built {
  const ctx: Ctx = { type: o.type, o, warnings: [] };
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const special = buildSpecial(o.type, lines, ctx);
  let body: Obj;
  if (special) body = special;
  else {
    body = parseKeyValues(
      lines.filter((l) => !/^step\s*:/i.test(l) || o.type !== "Recipe"),
      ctx,
    );
    if (o.type === "Recipe") {
      const steps = lines.filter((l) => /^step\s*:/i.test(l)).map((l) => l.replace(/^step\s*:\s*/i, ""));
      if (steps.length) body.recipeInstructions = steps.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t }));
    }
    if (body.potentialAction && typeof body.potentialAction === "object" && !Array.isArray(body.potentialAction)) {
      const pa = body.potentialAction as Obj;
      if (typeof pa.target === "string" && pa.target.includes("{search_term_string}") && pa["query-input"] === undefined) pa["query-input"] = "required name=search_term_string";
    }
  }
  fillTypes(body, ctx, "", undefined);
  const type = o.type === "LocalBusiness" ? (/^[A-Z][A-Za-z]+$/.test(o.businessType) ? o.businessType : "LocalBusiness") : o.type;
  const data: Obj = {};
  if (o.context) data["@context"] = "https://schema.org";
  data["@type"] = type;
  Object.assign(data, body);

  const info = TYPES[o.type];
  const missing: string[] = [];
  for (const k of info.required) if (!has(data, k)) missing.push(k);
  if (info.oneOf && !info.oneOf.some((k) => has(data, k))) missing.push(`one of ${info.oneOf.join(" / ")}`);
  const rec = info.recommended.filter((k) => !has(data, k));
  if (rec.length) ctx.warnings.push(`recommended but missing: ${rec.join(", ")}`);
  if (info.note) ctx.warnings.push(info.note);
  if (o.type === "Product" && typeof data.offers === "object" && data.offers && !Array.isArray(data.offers)) {
    const of = data.offers as Obj;
    if (!has(of, "price") && !has(of, "priceSpecification")) missing.push("offers.price");
    if (!has(of, "priceCurrency")) missing.push("offers.priceCurrency");
  }
  return { data, warnings: ctx.warnings, missing };
}

export function jsonLdGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    type: options.type ?? "Article",
    businessType: options.businessType ?? "LocalBusiness",
    authorType: options.authorType ?? "Person",
    format: options.format ?? "script",
    numbers: options.numbers ?? true,
    context: options.context ?? true,
  };
  if (input.trim() === "") {
    const info = TYPES[o.type];
    return { output: `Sample input for ${o.type}${info.note ? `\n(${info.note})` : ""}\n\n${info.sample}`, error: null };
  }
  try {
    const { data, warnings, missing } = buildJsonLd(input, o);
    if (o.format === "checks") {
      const out: string[] = [];
      out.push(missing.length ? `Missing required: ${missing.join(", ")}` : "All required properties present");
      for (const w of warnings) out.push(`- ${w}`);
      return { output: out.join("\n"), error: null };
    }
    const json = o.format === "minified" ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    if (o.format === "json") return { output: json, error: null };
    const safe = json.replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
    const head = missing.length ? `<!-- missing required: ${missing.join(", ")} -->\n` : "";
    return { output: `${head}<script type="application/ld+json">\n${safe}\n</script>`, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
