import { z } from "zod";

export const markdownJiraConverterOptionsSchema = z.object({
  direction: z.enum(["md-to-jira", "jira-to-md", "md-to-slack"]).default("md-to-jira"),
});
export type MarkdownJiraConverterOptions = z.infer<typeof markdownJiraConverterOptionsSchema>;
