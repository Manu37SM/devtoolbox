import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "destructive", "icon"],
    },
    size: { control: "select", options: ["default", "sm", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", children: "Beautify" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Cancel" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Collapse" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete history" },
};

export const Disabled: Story = {
  args: { variant: "primary", children: "Beautify", disabled: true },
};

// Every interactive variant on one canvas — a quick visual diff surface
// and the input `@storybook/addon-a11y` scans for contrast/focus issues
// across all variants in a single story.
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="icon" size="icon" aria-label="Icon button">
        i
      </Button>
    </div>
  ),
};
