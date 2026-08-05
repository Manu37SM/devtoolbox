import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/** Single-line text input, styled to match Textarea's border/bg/focus
 * tokens (UI_GUIDELINES.md §4) — introduced for the Phase 3 auth forms
 * (login/register/account), the first place this codebase needed a plain
 * text field outside a tool's own input area. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-md border border-border-default bg-bg-raised px-3 text-sm text-text-primary outline-none placeholder:text-text-secondary focus-visible:border-accent disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
