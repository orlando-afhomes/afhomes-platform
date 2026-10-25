import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-[color-mix(in_oklch,var(--success),transparent_80%)] text-[var(--success)]",
        warning: "border-transparent bg-[color-mix(in_oklch,var(--warning),transparent_80%)] text-[var(--warning)]",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        info: "border-transparent bg-[color-mix(in_oklch,var(--info),transparent_80%)] text-[var(--info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
