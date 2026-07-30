import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/tools/CopyButton";

interface OutputPaneProps {
  label?: string;
  value: string;
  error?: string | null;
  placeholder?: string;
}

/** Standardized output pane: read-only CodeEditor-equivalent + copy action
 * in the top-right, per UI_GUIDELINES.md §4/§5. `aria-live="polite"`
 * announces transform completion for screen reader users (§6). */
export function OutputPane({ label = "Output", value, error, placeholder }: OutputPaneProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        <CopyButton value={value} />
      </div>
      <div className="flex-1" aria-live="polite">
        {error ? (
          <div
            role="alert"
            className="h-full overflow-auto rounded-md border border-danger/40 bg-danger/5 p-3 font-mono text-sm text-danger"
          >
            {error}
          </div>
        ) : (
          <Textarea value={value} readOnly placeholder={placeholder} />
        )}
      </div>
    </div>
  );
}
