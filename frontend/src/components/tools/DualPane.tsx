import type { ReactNode } from "react";

/** Documented dual-pane layout variant (UI_GUIDELINES.md §4/§7): input on
 * the left, output on the right, stacking below `lg`. */
export function DualPane({ input, output }: { input: ReactNode; output: ReactNode }) {
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-h-[240px]">{input}</div>
      <div className="min-h-[240px]">{output}</div>
    </div>
  );
}
