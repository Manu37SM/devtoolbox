import type { Meta, StoryObj } from "@storybook/react";
import { CopyButton } from "./CopyButton";

const meta = {
  title: "Tools/CopyButton",
  component: CopyButton,
  tags: ["autodocs"],
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Click it in the Storybook canvas to see the Copy -> Copied transition
// (navigator.clipboard.writeText, real browser API — works in Storybook's
// iframe since it's a genuine browser context, unlike jsdom-based unit
// tests where clipboard access would need mocking).
export const Default: Story = {
  args: { value: '{"hello":"world"}' },
};

export const EmptyValue: Story = {
  args: { value: "" },
};
