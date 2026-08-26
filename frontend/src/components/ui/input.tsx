import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

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
