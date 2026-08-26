import type { Meta, StoryObj } from "@storybook/react";
import { DualPane } from "./DualPane";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "./OutputPane";

const meta = {
  title: "Tools/DualPane",
  component: DualPane,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DualPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[400px] p-4">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Input</label>
            <Textarea aria-label="Input" placeholder='{"hello":"world"}' />
          </div>
        }
        output={<OutputPane value="" placeholder="Output will appear here" />}
      />
    </div>
  ),
};
