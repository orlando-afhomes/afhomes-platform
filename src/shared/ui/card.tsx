import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const cardVariants = cva("tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:p-4 tw:shadow-(--shadow-soft)", {
  variants: {
    variant: {
      default: "tw:border-border tw:bg-card tw:text-card-foreground",
      muted: "tw:border-border tw:bg-muted/40 tw:text-card-foreground",
      interactive:
        "tw:border-border tw:bg-card tw:text-card-foreground tw:transition-[background-color,box-shadow,border-color] tw:hover:bg-muted/40 tw:hover:shadow-(--shadow-raised) tw:focus-within:border-ring",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Card({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return <div data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("tw:flex tw:flex-col tw:gap-1 tw:sm:flex-row tw:sm:items-start tw:sm:justify-between", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("tw:text-base tw:font-semibold tw:leading-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("tw:text-sm tw:text-muted-foreground", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-action" className={cn("tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:sm:justify-end", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("tw:flex tw:flex-col tw:gap-3 tw:min-w-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-footer" className={cn("tw:flex tw:flex-wrap tw:items-center tw:gap-2", className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, cardVariants };
