import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        /**
         * Material 3 – Filled button (Primary)
         */
        filled:
          "rounded-md bg-[hsl(var(--md-sys-color-primary))] text-[hsl(var(--md-sys-color-on-primary))] shadow-sm hover:bg-[hsl(var(--md-sys-color-primary))]/90 md-elev-1",

        /**
         * Backwards-compatible alias for existing usage (variant="default")
         */
        default:
          "rounded-md bg-[hsl(var(--md-sys-color-primary))] text-[hsl(var(--md-sys-color-on-primary))] shadow-sm hover:bg-[hsl(var(--md-sys-color-primary))]/90 md-elev-1",

        /**
         * Material 3 – Tonal button (Primary container)
         */
        tonal:
          "rounded-md bg-[hsl(var(--md-sys-color-primary-container))] text-[hsl(var(--md-sys-color-on-primary-container))] hover:bg-[hsl(var(--md-sys-color-primary-container))]/90 md-elev-0",

        /**
         * Material 3 – Outlined button
         */
        outline:
          "rounded-md border border-[hsl(var(--md-sys-color-outline))] bg-transparent text-[hsl(var(--md-sys-color-primary))] hover:bg-[hsl(var(--md-sys-color-surface-variant))]/40",

        /**
         * Material 3 – Text button
         */
        text:
          "rounded-md bg-transparent text-[hsl(var(--md-sys-color-primary))] hover:bg-[hsl(var(--md-sys-color-on-surface))]/5",

        /**
         * Contextual variants (mantidos para compatibilidade, ajustados ao M3)
         */
        destructive:
          "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary:
          "rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "rounded-md hover:bg-[hsl(var(--md-sys-color-on-surface))]/5 hover:text-[hsl(var(--md-sys-color-on-surface))]",
        link: "rounded-none text-[hsl(var(--md-sys-color-primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[44px] px-4 py-2 md:min-h-[40px]",
        sm: "h-9 min-h-[44px] rounded-md px-3 md:min-h-[36px]",
        lg: "h-11 min-h-[44px] rounded-md px-8",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
