import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["neutral", "success", "warning", "danger", "info"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { variant: "neutral", children: "P0" } };
export const Success: Story = { args: { variant: "success", children: "Valid" } };
export const Warning: Story = { args: { variant: "warning", children: "Deprecated" } };
export const Danger: Story = { args: { variant: "danger", children: "Invalid" } };
export const Info: Story = { args: { variant: "info", children: "Beta" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};
