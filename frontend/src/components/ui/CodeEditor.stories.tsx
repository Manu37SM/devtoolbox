import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CodeEditor, type CodeEditorLanguage } from "./CodeEditor";

const meta = {
  title: "UI/CodeEditor",
  component: CodeEditor,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    language: {
      control: "select",
      options: ["json", "javascript", "typescript", "css", "html", "xml", "yaml", "markdown", "plain"],
    },
  },
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLES: Record<CodeEditorLanguage, string> = {
  json: '{\n  "name": "DevToolbox",\n  "tools": 29\n}',
  javascript: "function greet(name) {\n  return `Hello, ${name}!`;\n}",
  typescript: "function greet(name: string): string {\n  return `Hello, ${name}!`;\n}",
  css: "a {\n  color: var(--color-accent);\n}",
  html: "<div>\n  <p>Hello, world</p>\n</div>",
  xml: "<root>\n  <item>value</item>\n</root>",
  yaml: "name: DevToolbox\ntools: 29",
  markdown: "# Hello\n\nThis is **Markdown**.",
  plain: "Plain text, no syntax highlighting.",
};

// Controlled wrapper so the Storybook control panel can drive `language`
// while state (`value`) still lives in the story, matching how every
// ToolView actually uses this component.
function ControlledCodeEditor({ language }: { language: CodeEditorLanguage }) {
  const [value, setValue] = useState(SAMPLES[language]);
  return (
    <div className="h-72">
      <CodeEditor value={value} onChange={(e) => setValue(e.target.value)} language={language} aria-label="Example code" />
    </div>
  );
}

export const Json: Story = { render: () => <ControlledCodeEditor language="json" /> };
export const JavaScript: Story = { render: () => <ControlledCodeEditor language="javascript" /> };
export const TypeScript: Story = { render: () => <ControlledCodeEditor language="typescript" /> };
export const Css: Story = { render: () => <ControlledCodeEditor language="css" /> };
export const Html: Story = { render: () => <ControlledCodeEditor language="html" /> };
export const Xml: Story = { render: () => <ControlledCodeEditor language="xml" /> };
export const Yaml: Story = { render: () => <ControlledCodeEditor language="yaml" /> };
export const Markdown: Story = { render: () => <ControlledCodeEditor language="markdown" /> };

export const ReadOnly: Story = {
  render: () => (
    <div className="h-72">
      <CodeEditor value={SAMPLES.json} onChange={() => {}} language="json" readOnly aria-label="Read-only example" />
    </div>
  ),
};
