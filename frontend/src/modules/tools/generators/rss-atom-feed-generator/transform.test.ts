import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseStamp, rfc3339, rfc822, rssAtomFeedGenerator as gen } from "./transform";

const FEED = `title: Example Blog
link: https://example.com/
description: Notes on <databases> & systems
language: en-GB
feedUrl: https://example.com/feed.xml
image: https://example.com/icon.png
copyright: © 2026 Example
ttl: 60
author: Jane Doe <jane@example.com>

title: Second post — "quotes" & <tags>
link: https://example.com/posts/2
date: 2026-03-06T10:30:00+05:30
description: Short summary & more
content: <p>Full <b>HTML</b> body with ]]> inside</p>
author: Jane Doe <jane@example.com>
category: databases
category: postgres

title: First post
link: https://example.com/posts/1
date: 2026-03-04
description: Plain text only
author: John Roe
guid: urn:uuid:11111111-2222-3333-4444-555555555555
enclosure: https://example.com/a.mp3 | 12345 | audio/mpeg
`;

describe("dates", () => {
  it("parses ISO and RFC 822", () => {
    const s = parseStamp("2026-03-04T08:00:00+05:30")!;
    expect(rfc822(s)).toBe("Wed, 04 Mar 2026 08:00:00 +0530");
    expect(rfc3339(s)).toBe("2026-03-04T08:00:00+05:30");
    expect(rfc3339(parseStamp("2026-03-04")!)).toBe("2026-03-04T00:00:00Z");
    expect(rfc3339(parseStamp("Thu, 05 Mar 2026 09:00:00 GMT")!)).toBe("2026-03-05T09:00:00Z");
    expect(rfc822(parseStamp("2026-12-31T23:59:59Z")!)).toBe("Thu, 31 Dec 2026 23:59:59 +0000");
  });
  it("rejects impossible dates", () => {
    expect(parseStamp("2026-02-30")).toBeNull();
    expect(parseStamp("yesterday")).toBeNull();
    expect(parseStamp("2026-13-01")).toBeNull();
  });
});

describe("RSS", () => {
  const out = gen(FEED, { format: "rss" }).output;
  it("structure", () => {
    expect(out).toContain('<rss version="2.0"');
    expect(out).toContain("<title>Example Blog</title>");
    expect(out).toContain("<description>Notes on &lt;databases&gt; &amp; systems</description>");
    expect(out).toContain('<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>');
    expect(out).toContain("<lastBuildDate>Fri, 06 Mar 2026 10:30:00 +0530</lastBuildDate>");
  });
  it("newest first and escaped titles", () => {
    expect(out.indexOf("Second post")).toBeLessThan(out.indexOf("First post"));
    expect(out).toContain("<title>Second post — &quot;quotes&quot; &amp; &lt;tags&gt;</title>".replace("&quot;", '"').replace("&quot;", '"'));
  });
  it("author with email uses <author>, without uses dc:creator", () => {
    expect(out).toContain("<author>jane@example.com (Jane Doe)</author>");
    expect(out).toContain("<dc:creator>John Roe</dc:creator>");
  });
  it("CDATA protects ]]> inside content", () => {
    expect(out).toContain("<![CDATA[<p>Full <b>HTML</b> body with ]]]]><![CDATA[> inside</p>]]>");
  });
  it("guid permalink flag and enclosure", () => {
    expect(out).toContain('<guid isPermaLink="true">https://example.com/posts/2</guid>');
    expect(out).toContain('<guid isPermaLink="false">urn:uuid:11111111-2222-3333-4444-555555555555</guid>');
    expect(out).toContain('<enclosure url="https://example.com/a.mp3" length="12345" type="audio/mpeg"/>');
  });
  it("can drop extensions and the declaration", () => {
    const plain = gen(FEED, { extensions: false, declaration: false }).output;
    expect(plain.startsWith('<rss version="2.0">')).toBe(true);
    expect(plain).not.toContain("dc:creator");
  });
});

describe("Atom and JSON Feed", () => {
  it("atom basics", () => {
    const out = gen(FEED, { format: "atom" }).output;
    expect(out).toContain('<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-GB">');
    expect(out).toContain("<id>https://example.com/feed.xml</id>");
    expect(out).toContain("<updated>2026-03-06T10:30:00+05:30</updated>");
    expect(out).toContain('<category term="postgres"/>');
    expect(out).toContain('<content type="html">');
  });
  it("json feed 1.1", () => {
    const j = JSON.parse(gen(FEED, { format: "json" }).output) as { version: string; items: Array<Record<string, unknown>> };
    expect(j.version).toBe("https://jsonfeed.org/version/1.1");
    expect(j.items[0]).toMatchObject({ id: "https://example.com/posts/2", content_html: expect.stringContaining("<b>HTML</b>"), tags: ["databases", "postgres"] });
    expect(j.items[1]).toMatchObject({ attachments: [{ url: "https://example.com/a.mp3", mime_type: "audio/mpeg", size_in_bytes: 12345 }] });
  });
});

describe("validation", () => {
  it("needs a title and link", () => {
    expect(gen("link: https://a.test/").error).not.toBeNull();
    expect(gen("title: T").error?.message).toMatch(/feed link/);
  });
  it("items need content and sane fields", () => {
    expect(gen("title: T\nlink: https://a.test/\n\nlink: https://a.test/1").error?.message).toMatch(/title or a description/);
    expect(gen("title: T\nlink: https://a.test/\n\ntitle: I\ndate: nope").error?.message).toMatch(/not a date/);
    expect(gen("title: T\nlink: https://a.test/\n\ntitle: I\nlink: javascript:alert(1)").error?.message).toMatch(/absolute http/);
    expect(gen("title: T\nlink: https://a.test/\n\ntitle: I\nenclosure: https://a.test/x | big | audio/mpeg").error).not.toBeNull();
  });
  it("duplicate guids are rejected", () => {
    expect(gen("title: T\nlink: https://a.test/\n\ntitle: A\nlink: https://a.test/1\n\ntitle: B\nguid: https://a.test/1").error?.message).toMatch(/share the id/);
  });
  it("control characters never reach the XML", () => {
    const out = gen("title: T\nlink: https://a.test/\n\ntitle: bad\u0001char\nlink: https://a.test/1").output;
    expect(out).toContain("<title>badchar</title>");
  });
  it("limit and ordering options", () => {
    const out = gen(FEED, { limit: 1 }).output;
    expect(out).toContain("Second post");
    expect(out).not.toContain("First post");
  });
});

// Oracles: xmllint for well-formedness, feedparser for semantics.
const xml = spawnSync("xmllint", ["--version"], { encoding: "utf8" });
const fp = spawnSync("python3", ["-c", "import feedparser"], { encoding: "utf8" });
describe.skipIf(Boolean(xml.error) || xml.status !== 0)("well-formed according to xmllint", () => {
  const dir = mkdtempSync(join(tmpdir(), "feed-"));
  for (const format of ["rss", "atom"] as const) {
    for (const extra of [{}, { cdata: false }, { pretty: false }, { extensions: false, declaration: false }]) {
      it(`${format} ${JSON.stringify(extra)}`, () => {
        const f = join(dir, `f${Math.random().toString(36).slice(2)}.xml`);
        writeFileSync(f, gen(FEED, { format, ...extra }).output);
        const r = spawnSync("xmllint", ["--noout", f], { encoding: "utf8" });
        expect(r.status, r.stderr).toBe(0);
      });
    }
  }
});
describe.skipIf(fp.status !== 0)("read back by feedparser", () => {
  for (const format of ["rss", "atom"] as const) {
    it(`${format} round trip`, () => {
      const script = `import sys,json,feedparser\nd=feedparser.parse(sys.stdin.read())\nprint(json.dumps({'bozo':d.bozo,'title':d.feed.get('title'),'link':d.feed.get('link'),'lang':d.feed.get('language'),'n':len(d.entries),'e':[{'t':e.get('title'),'l':e.get('link'),'id':e.get('id'),'p':e.get('published_parsed') and list(e.published_parsed[:6]),'a':e.get('author'),'tags':[t.term for t in e.get('tags',[])],'enc':[x.href for x in e.get('enclosures',[])]} for e in d.entries]}))`;
      const r = spawnSync("python3", ["-c", script], { input: gen(FEED, { format }).output, encoding: "utf8" });
      const d = JSON.parse(r.stdout) as { bozo: number; title: string; link: string; n: number; e: Array<{ t: string; l: string; id: string; p: number[]; tags: string[]; enc: string[] }> };
      expect(d.bozo).toBeFalsy();
      expect(d.title).toBe("Example Blog");
      expect(d.link).toBe("https://example.com/");
      expect(d.n).toBe(2);
      expect(d.e[0]!.t).toBe('Second post — "quotes" & <tags>');
      expect(d.e[0]!.l).toBe("https://example.com/posts/2");
      expect(d.e[0]!.tags).toEqual(["databases", "postgres"]);
      // 10:30 +05:30 is 05:00 UTC
      expect(d.e[0]!.p).toEqual([2026, 3, 6, 5, 0, 0]);
      expect(d.e[1]!.id).toBe("urn:uuid:11111111-2222-3333-4444-555555555555");
      expect(d.e[1]!.enc).toEqual(["https://example.com/a.mp3"]);
    });
  }
});
