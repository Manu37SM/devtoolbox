import { describe, expect, it } from "vitest";
import { jiraInlineToMd, jiraToMd, mdInlineToJira, mdInlineToSlack, mdToJira } from "./transform";

describe("inline Markdown -> Jira", () => {
  it("converts emphasis, code, links and images", () => {
    expect(mdInlineToJira("**bold** and *italic* and _also_ and ~~gone~~")).toBe("*bold* and _italic_ and _also_ and -gone-");
    expect(mdInlineToJira("run `**not bold**` now")).toBe("run {{**not bold**}} now");
    expect(mdInlineToJira("[docs](https://x.io/a) ![logo](https://x.io/l.png) <https://x.io>")).toBe("[docs|https://x.io/a] !https://x.io/l.png|alt=logo! [https://x.io]");
    expect(mdInlineToJira("snake_case_name stays")).toBe("snake_case_name stays");
  });
});

describe("block Markdown -> Jira", () => {
  it("handles headings, nested lists, tasks, code, quotes, tables and rules", () => {
    const md = [
      "# Release 1.2",
      "", "- first", "  - nested **b**", "    1. deep", "- [x] done", "- [ ] todo",
      "", "```java", "String s = \"*x*\";", "```",
      "", "> quoted", "> more",
      "", "| Name | Value |", "| --- | ---: |", "| a | `1` |",
      "", "---",
    ].join("\n");
    expect(mdToJira(md)).toBe([
      "h1. Release 1.2",
      "", "* first", "** nested *b*", "**# deep", "* (/) done", "* (x) todo",
      "", "{code:java}", "String s = \"*x*\";", "{code}",
      "", "{quote}", "quoted", "more", "{quote}",
      "", "||Name||Value||", "|a|{{1}}|",
      "", "----",
    ].join("\n"));
  });
});

describe("Markdown -> Slack", () => {
  it("uses mrkdwn syntax", () => {
    expect(mdInlineToSlack("**b** *i* ~~s~~ [t](https://u)")).toBe("*b* _i_ ~s~ <https://u|t>");
    expect(mdToJira("## Title\n- a\n  - b\n\n| x | y |\n|---|---|\n| 1 | 2 |", true)).toBe("*Title*\n• a\n    • b\n\n```\nx | y\n1 | 2\n```");
  });
});

describe("Jira -> Markdown", () => {
  it("converts inline markup", () => {
    expect(jiraInlineToMd("*bold* _it_ -strike- {{code}} [Docs|https://x] [https://y] !img.png! well-known {color:red}red{color}")).toBe("**bold** *it* ~~strike~~ `code` [Docs](https://x) <https://y> ![](img.png) well-known red");
  });
  it("converts blocks", () => {
    const jira = "h2. Steps\n* one\n** two\n# first\n{code:sql}\nSELECT *\n{code}\n{quote}\nwise\n{quote}\n||A||B||\n|1|2|\nbq. note\n----";
    expect(jiraToMd(jira)).toBe("## Steps\n- one\n  - two\n1. first\n```sql\nSELECT *\n```\n> wise\n| A | B |\n| --- | --- |\n| 1 | 2 |\n> note\n---");
  });
});

describe("Jira nested mixed lists", () => {
  it("indents under numbered parents by three spaces", () => {
    expect(jiraToMd("# step\n#* detail\n#** deeper")).toBe("1. step\n   - detail\n     - deeper");
  });
});
