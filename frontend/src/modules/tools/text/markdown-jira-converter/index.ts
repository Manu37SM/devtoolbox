import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const markdownJiraConverterTool: ToolRegistryEntry = {
  slug: "markdown-jira-converter",
  name: "Markdown to Jira & Slack Converter",
  module: "text",
  description: "Convert Markdown to Jira wiki markup or Slack mrkdwn and Jira markup back to Markdown: headings, nested lists, tasks, code blocks, quotes, tables, links and inline formatting.",
  aliases: ["markdown to jira","jira markup to markdown","confluence wiki markup","markdown to slack","jira text formatting"],
  icon: "ArrowLeftRight",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["markdown to jira","jira markup to markdown","confluence wiki markup","markdown to slack","jira text formatting"] },
};
