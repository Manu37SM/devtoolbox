import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: {
    // Textarea needs real vertical space to be usable/testable visually —
    // Storybook's default centered layout squashes it.
    layout: "padded",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="h-64">
      <Textarea placeholder="Paste text here…" aria-label="Example input" />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- story render fn, not a component
    const [value, setValue] = useState("Hello, DevToolbox!");
    return (
      <div className="h-64">
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} aria-label="Example input" />
      </div>
    );
  },
};

export const ReadOnly: Story = {
  render: () => (
    <div className="h-64">
      <Textarea value="Read-only output text." readOnly aria-label="Example output" />
    </div>
  ),
};
