import type { TransformResult } from "@/lib/tool-transform";
import type { RssAtomFeedGeneratorOptions } from "./schema";

type Opts = RssAtomFeedGeneratorOptions;

export interface Block {
  /** repeated keys keep every value */
  values: Map<string, string[]>;
  startLine: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

export interface Stamp {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  /** offset in minutes east of UTC */
  off: number;
  /** epoch ms, for sorting */
  t: number;
}

export function parseStamp(input: string): Stamp | null {
  const v = input.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/.exec(v);
  if (m) {
    const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? "0", m[5] ?? "0", m[6] ?? "0"].map(Number) as [number, number, number, number, number, number];
    let off = 0;
    const z = m[7];
    if (z && z !== "Z") off = (z[0] === "-" ? -1 : 1) * (Number(z.slice(1, 3)) * 60 + Number(z.slice(-2)));
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 60) return null;
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCMonth() !== mo - 1) return null;
    return { y, mo, d, h, mi, s, off, t: Date.UTC(y, mo - 1, d, h, mi, s) - off * 60000 };
  }
  // RFC 822 / 2822 style
  const r = /^(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s*(GMT|UT|Z|[+-]\d{4})?$/.exec(v);
  if (r) {
    const mo = MONTHS.findIndex((x) => x.toLowerCase() === r[2]!.toLowerCase());
    if (mo < 0) return null;
    const z = r[7];
    const off = !z || /^(GMT|UT|Z)$/.test(z) ? 0 : (z[0] === "-" ? -1 : 1) * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)));
    const [d, y, h, mi, s] = [Number(r[1]), Number(r[3]), Number(r[4]), Number(r[5]), Number(r[6] ?? "0")];
    return { y, mo: mo + 1, d, h, mi, s, off, t: Date.UTC(y, mo, d, h, mi, s) - off * 60000 };
  }
  return null;
}

const offStr = (off: number, colon: boolean) => {
  if (off === 0) return colon ? "Z" : "+0000";
  const a = Math.abs(off);
  return (off < 0 ? "-" : "+") + p2(Math.floor(a / 60)) + (colon ? ":" : "") + p2(a % 60);
};

export function rfc822(s: Stamp): string {
  const wd = DAYS[new Date(Date.UTC(s.y, s.mo - 1, s.d)).getUTCDay()]!;
  return `${wd}, ${p2(s.d)} ${MONTHS[s.mo - 1]} ${s.y} ${p2(s.h)}:${p2(s.mi)}:${p2(s.s)} ${offStr(s.off, false)}`;
}
export function rfc3339(s: Stamp): string {
  return `${s.y}-${p2(s.mo)}-${p2(s.d)}T${p2(s.h)}:${p2(s.mi)}:${p2(s.s)}${offStr(s.off, true)}`;
}

export function parseBlocks(input: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let lastKey: string | null = null;
  input.split(/\r?\n/).forEach((raw, i) => {
    if (raw.trim() === "") {
      cur = null;
      lastKey = null;
      return;
    }
    if (raw.trim().startsWith("#")) return;
    if (cur && lastKey && /^\s+\S/.test(raw)) {
      const arr = cur.values.get(lastKey)!;
      arr[arr.length - 1] += "\n" + raw.trim();
      return;
    }
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(raw.trim());
    if (!m) throw new Error(`Line ${i + 1}: expected "key: value", got "${raw.trim().slice(0, 40)}"`);
    if (!cur) {
      cur = { values: new Map(), startLine: i + 1 };
      blocks.push(cur);
    }
    const key = m[1]!.toLowerCase();
    const arr = cur.values.get(key) ?? [];
    arr.push(m[2]!);
    cur.values.set(key, arr);
    lastKey = key;
  });
  return blocks;
}

const first = (b: Block, ...keys: string[]) => {
  for (const k of keys) {
    const v = b.values.get(k)?.[0];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
};
const all = (b: Block, k: string) => (b.values.get(k) ?? []).filter((x) => x !== "");

const XML_BAD = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;
export const esc = (s: string) => s.replace(XML_BAD, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${s.replace(XML_BAD, "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

interface Person {
  name: string;
  email?: string;
  url?: string;
}
function person(v: string): Person {
  const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(v);
  if (m) return m[2]!.includes("@") ? { name: m[1]!.trim(), email: m[2]!.trim() } : { name: m[1]!.trim(), url: m[2]!.trim() };
  return { name: v.trim() };
}

function checkUrl(label: string, v: string | undefined, warns: string[], required = false) {
  if (!v) {
    if (required) warns.push(`${label} is missing`);
    return;
  }
  if (!/^https?:\/\/[^\s<>"]+$/.test(v)) throw new Error(`${label} "${v}" must be an absolute http(s) URL`);
}

interface Item {
  title?: string;
  link?: string;
  guid: string;
  permalink: boolean;
  summary?: string;
  content?: string;
  published?: Stamp;
  updated?: Stamp;
  authors: Person[];
  categories: string[];
  enclosure?: { url: string; length: string; type: string };
  image?: string;
}

function buildItem(b: Block, warns: string[], n: number): Item {
  const label = `item ${n}`;
  const link = first(b, "link", "url");
  checkUrl(`${label} link`, link, warns);
  const title = first(b, "title");
  const summary = first(b, "description", "summary");
  const content = first(b, "content");
  if (!title && !summary && !content) throw new Error(`Block starting at line ${b.startLine}: an item needs a title or a description`);
  const dRaw = first(b, "date", "published", "pubdate");
  const published = dRaw ? (parseStamp(dRaw) ?? undefined) : undefined;
  if (dRaw && !published) throw new Error(`${label}: date "${dRaw}" is not a date (use 2026-03-04T08:00:00+05:30 or an RFC 822 date)`);
  const uRaw = first(b, "updated", "modified");
  const updated = uRaw ? (parseStamp(uRaw) ?? undefined) : undefined;
  if (uRaw && !updated) throw new Error(`${label}: updated "${uRaw}" is not a date`);
  const guidRaw = first(b, "guid", "id");
  const guid = guidRaw ?? link ?? `${title ?? "item"}-${n}`;
  if (!guidRaw && !link) warns.push(`${label} has no link or id; its guid is made up from the title and will change if the title does`);
  const enc = first(b, "enclosure");
  let enclosure: Item["enclosure"];
  if (enc) {
    const [url = "", length = "0", type = ""] = enc.split("|").map((s) => s.trim());
    checkUrl(`${label} enclosure`, url, warns, true);
    if (!/^\d+$/.test(length)) throw new Error(`${label}: enclosure length must be a byte count (url | length | mime-type)`);
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(type)) throw new Error(`${label}: enclosure needs a MIME type (url | length | audio/mpeg)`);
    enclosure = { url, length, type };
  }
  const image = first(b, "image");
  checkUrl(`${label} image`, image, warns);
  return { title, link, guid, permalink: guid === link, summary, content, published, updated, authors: all(b, "author").map(person), categories: all(b, "category"), enclosure, image };
}

export interface Channel {
  title: string;
  link: string;
  description: string;
  language?: string;
  copyright?: string;
  ttl?: string;
  image?: string;
  feedUrl?: string;
  id?: string;
  author?: Person;
}

function buildChannel(b: Block, warns: string[]): Channel {
  const title = first(b, "title");
  if (!title) throw new Error("The first block describes the feed and needs a title");
  const link = first(b, "link", "url");
  checkUrl("Feed link", link, warns, true);
  const feedUrl = first(b, "feedurl", "self");
  checkUrl("Feed URL", feedUrl, warns);
  const ttl = first(b, "ttl");
  if (ttl && !/^\d+$/.test(ttl)) throw new Error("ttl is a number of minutes");
  const lang = first(b, "language");
  if (lang && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(lang)) throw new Error(`language "${lang}" is not a language tag like en or en-GB`);
  const authorRaw = first(b, "author");
  return {
    title,
    link: link ?? "",
    description: first(b, "description", "subtitle") ?? title,
    language: lang,
    copyright: first(b, "copyright", "rights"),
    ttl,
    image: first(b, "image"),
    feedUrl,
    id: first(b, "id"),
    author: authorRaw ? person(authorRaw) : undefined,
  };
}

class Xml {
  private lines: string[] = [];
  private depth = 0;
  constructor(private pretty: boolean) {}
  private ind() {
    return this.pretty ? "  ".repeat(this.depth) : "";
  }
  open(tag: string) {
    this.lines.push(`${this.ind()}<${tag}>`);
    this.depth++;
  }
  close(name: string) {
    this.depth--;
    this.lines.push(`${this.ind()}</${name}>`);
  }
  leaf(name: string, text: string, attrs = "") {
    this.lines.push(`${this.ind()}<${name}${attrs}>${text}</${name}>`);
  }
  empty(tag: string) {
    this.lines.push(`${this.ind()}<${tag}/>`);
  }
  toString() {
    return this.lines.join(this.pretty ? "\n" : "");
  }
}

function html(s: string, useCdata: boolean) {
  return useCdata ? cdata(s) : esc(s);
}

function renderRss(ch: Channel, items: Item[], o: Opts): string {
  const x = new Xml(o.pretty);
  const ns = [o.extensions ? ' xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"' : ""].join("");
  x.open(`rss version="2.0"${ns}`);
  x.open("channel");
  x.leaf("title", esc(ch.title));
  x.leaf("link", esc(ch.link));
  x.leaf("description", esc(ch.description));
  if (ch.language) x.leaf("language", esc(ch.language));
  if (ch.copyright) x.leaf("copyright", esc(ch.copyright));
  const latest = items.map((i) => i.updated ?? i.published).filter((s): s is Stamp => !!s).sort((a, b) => b.t - a.t)[0];
  if (latest) {
    x.leaf("pubDate", rfc822(latest));
    x.leaf("lastBuildDate", rfc822(latest));
  }
  if (o.generator) x.leaf("generator", esc(o.generator));
  if (ch.ttl) x.leaf("ttl", ch.ttl);
  if (o.extensions && ch.feedUrl) x.empty(`atom:link href="${escAttr(ch.feedUrl)}" rel="self" type="application/rss+xml"`);
  if (ch.image) {
    x.open("image");
    x.leaf("url", esc(ch.image));
    x.leaf("title", esc(ch.title));
    x.leaf("link", esc(ch.link));
    x.close("image");
  }
  for (const it of items) {
    x.open("item");
    if (it.title) x.leaf("title", esc(it.title));
    if (it.link) x.leaf("link", esc(it.link));
    const desc = it.summary ?? it.content;
    if (desc) x.leaf("description", html(desc, o.cdata));
    if (o.extensions && it.content && it.summary) x.leaf("content:encoded", cdata(it.content));
    for (const a of it.authors) {
      if (a.email) x.leaf("author", esc(a.name ? `${a.email} (${a.name})` : a.email));
      else if (o.extensions) x.leaf("dc:creator", esc(a.name));
    }
    for (const c of it.categories) x.leaf("category", esc(c));
    if (it.enclosure) x.empty(`enclosure url="${escAttr(it.enclosure.url)}" length="${it.enclosure.length}" type="${escAttr(it.enclosure.type)}"`);
    x.leaf("guid", esc(it.guid), ` isPermaLink="${it.permalink}"`);
    if (it.published) x.leaf("pubDate", rfc822(it.published));
    x.close("item");
  }
  x.close("channel");
  x.close("rss");
  return x.toString();
}

function renderAtom(ch: Channel, items: Item[], o: Opts): string {
  const x = new Xml(o.pretty);
  x.open('feed xmlns="http://www.w3.org/2005/Atom"' + (ch.language ? ` xml:lang="${escAttr(ch.language)}"` : ""));
  x.leaf("id", esc(ch.id ?? ch.feedUrl ?? ch.link));
  x.leaf("title", esc(ch.title));
  if (ch.description !== ch.title) x.leaf("subtitle", esc(ch.description));
  const latest = items.map((i) => i.updated ?? i.published).filter((s): s is Stamp => !!s).sort((a, b) => b.t - a.t)[0];
  x.leaf("updated", latest ? rfc3339(latest) : "1970-01-01T00:00:00Z");
  if (ch.link) x.empty(`link href="${escAttr(ch.link)}" rel="alternate" type="text/html"`);
  if (ch.feedUrl) x.empty(`link href="${escAttr(ch.feedUrl)}" rel="self" type="application/atom+xml"`);
  if (ch.copyright) x.leaf("rights", esc(ch.copyright));
  if (ch.image) x.leaf("logo", esc(ch.image));
  if (o.generator) x.leaf("generator", esc(o.generator));
  if (ch.author) {
    x.open("author");
    x.leaf("name", esc(ch.author.name));
    if (ch.author.email) x.leaf("email", esc(ch.author.email));
    if (ch.author.url) x.leaf("uri", esc(ch.author.url));
    x.close("author");
  }
  for (const it of items) {
    x.open("entry");
    x.leaf("id", esc(it.guid));
    x.leaf("title", esc(it.title ?? "(untitled)"));
    if (it.link) x.empty(`link href="${escAttr(it.link)}" rel="alternate" type="text/html"`);
    if (it.enclosure) x.empty(`link href="${escAttr(it.enclosure.url)}" rel="enclosure" type="${escAttr(it.enclosure.type)}" length="${it.enclosure.length}"`);
    const stamp = it.updated ?? it.published;
    x.leaf("updated", stamp ? rfc3339(stamp) : latest ? rfc3339(latest) : "1970-01-01T00:00:00Z");
    if (it.published) x.leaf("published", rfc3339(it.published));
    for (const a of it.authors) {
      x.open("author");
      x.leaf("name", esc(a.name));
      if (a.email) x.leaf("email", esc(a.email));
      if (a.url) x.leaf("uri", esc(a.url));
      x.close("author");
    }
    for (const c of it.categories) x.empty(`category term="${escAttr(c)}"`);
    if (it.summary) x.leaf("summary", esc(it.summary));
    if (it.content) x.leaf("content", html(it.content, o.cdata), ' type="html"');
    else if (!it.summary && it.title) x.leaf("summary", esc(it.title));
    x.close("entry");
  }
  x.close("feed");
  return x.toString();
}

function renderJson(ch: Channel, items: Item[], o: Opts): string {
  const feed: Record<string, unknown> = { version: "https://jsonfeed.org/version/1.1", title: ch.title };
  if (ch.link) feed.home_page_url = ch.link;
  if (ch.feedUrl) feed.feed_url = ch.feedUrl;
  if (ch.description !== ch.title) feed.description = ch.description;
  if (ch.image) feed.icon = ch.image;
  if (ch.language) feed.language = ch.language;
  if (ch.author) feed.authors = [{ name: ch.author.name, ...(ch.author.url ? { url: ch.author.url } : {}) }];
  feed.items = items.map((it) => {
    const j: Record<string, unknown> = { id: it.guid };
    if (it.link) j.url = it.link;
    if (it.title) j.title = it.title;
    if (it.content) j.content_html = it.content;
    else if (it.summary) j.content_text = it.summary;
    if (it.summary && it.content) j.summary = it.summary;
    if (it.image) j.image = it.image;
    if (it.published) j.date_published = rfc3339(it.published);
    if (it.updated) j.date_modified = rfc3339(it.updated);
    if (it.authors.length) j.authors = it.authors.map((a) => ({ name: a.name, ...(a.url ? { url: a.url } : {}) }));
    if (it.categories.length) j.tags = it.categories;
    if (it.enclosure) j.attachments = [{ url: it.enclosure.url, mime_type: it.enclosure.type, size_in_bytes: Number(it.enclosure.length) }];
    return j;
  });
  return JSON.stringify(feed, null, o.pretty ? 2 : 0);
}

export function buildFeed(input: string, o: Opts): { text: string; warnings: string[] } {
  const blocks = parseBlocks(input);
  if (blocks.length === 0) return { text: "", warnings: [] };
  const warns: string[] = [];
  const ch = buildChannel(blocks[0]!, warns);
  let items = blocks.slice(1).map((b, i) => buildItem(b, warns, i + 1));
  if (o.sortNewestFirst) items = items.map((it, i) => ({ it, i })).sort((a, b) => (b.it.published?.t ?? -Infinity) - (a.it.published?.t ?? -Infinity) || a.i - b.i).map((x) => x.it);
  if (o.limit > 0) items = items.slice(0, o.limit);
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.guid)) throw new Error(`Two items share the id/guid "${it.guid}"; readers would drop one`);
    seen.add(it.guid);
  }
  if (o.format === "rss" && !ch.link) throw new Error("RSS needs a feed link: add link: https://example.com/");
  if (o.format === "atom" && !(ch.id ?? ch.feedUrl ?? ch.link)) throw new Error("Atom needs an id, feedUrl or link for the feed");
  let text: string;
  if (o.format === "json") text = renderJson(ch, items, o);
  else {
    const body = o.format === "rss" ? renderRss(ch, items, o) : renderAtom(ch, items, o);
    text = (o.declaration ? `<?xml version="1.0" encoding="UTF-8"?>${o.pretty ? "\n" : ""}` : "") + body;
  }
  return { text, warnings: warns };
}

export function rssAtomFeedGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    format: options.format ?? "rss",
    cdata: options.cdata ?? true,
    extensions: options.extensions ?? true,
    pretty: options.pretty ?? true,
    declaration: options.declaration ?? true,
    sortNewestFirst: options.sortNewestFirst ?? true,
    limit: options.limit ?? 0,
    generator: options.generator ?? "",
  };
  try {
    const { text, warnings } = buildFeed(input, o);
    const tail = warnings.length ? `\n${o.format === "json" ? "" : "<!-- "}${warnings.map((w) => `warning: ${w.replace(/--+/g, "-")}`).join("; ")}${o.format === "json" ? "" : " -->"}` : "";
    return { output: o.format === "json" && warnings.length ? text : text + tail, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
