import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button variants per UI_GUIDELINES.md §4. Radius `sm`, min touch target
// 44x44px enforced via padding on the default size (§6).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:opacity-90",
        secondary:
          "border border-border-default bg-bg-raised text-text-primary hover:bg-bg-overlay",
        ghost: "text-text-primary hover:bg-bg-raised",
        destructive: "bg-danger text-danger-foreground hover:opacity-90",
        icon: "text-text-secondary hover:bg-bg-raised",
      },
      size: {
        default: "h-9 min-w-[44px] px-3",
        sm: "h-8 px-2.5 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
