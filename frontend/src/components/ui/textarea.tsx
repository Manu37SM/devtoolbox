import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Plain textarea used as the CodeEditor fallback for tools that don't
 * need syntax highlighting yet. See DEVELOPMENT_GUIDE.md — a CodeMirror 6
 * wrapper (`CodeEditor`) can replace this without changing tool code, since
 * ToolView only depends on the `value`/`onChange` contract. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      spellCheck={false}
      className={cn(
        "h-full w-full resize-none rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm leading-6 text-text-primary outline-none focus-visible:border-accent",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
