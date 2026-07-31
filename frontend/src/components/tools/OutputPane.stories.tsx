import type { Meta, StoryObj } from "@storybook/react";
import { OutputPane } from "./OutputPane";

const meta = {
  title: "Tools/OutputPane",
  component: OutputPane,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof OutputPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithValue: Story = {
  render: () => (
    <div className="h-64">
      <OutputPane label="Output" value={'{\n  "hello": "world"\n}'} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="h-64">
      <OutputPane label="Output" value="" placeholder="Formatted JSON will appear here" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="h-64">
      <OutputPane label="Output" value="" error="Unexpected token at line 3, column 5" />
    </div>
  ),
};
