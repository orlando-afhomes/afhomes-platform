import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

// Solid brand fill with a soft top-light gradient and a crisp inner highlight.
// The fill stays `bg-primary`; the gradient is an overlay, so the token still drives the color.
const PRIMARY =
  "tw:bg-primary tw:bg-linear-to-b tw:from-white/15 tw:to-black/10 tw:text-primary-foreground tw:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_0_rgb(0_0_0/0.2)] tw:hover:brightness-110 tw:hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22),0_4px_10px_-2px_rgb(0_0_0/0.28)]";
const DANGER =
  "tw:border-destructive/20 tw:bg-destructive/10 tw:text-destructive tw:hover:border-destructive/35 tw:hover:bg-destructive/20 tw:focus-visible:border-destructive/40 tw:focus-visible:ring-destructive/20 tw:dark:bg-destructive/20 tw:dark:hover:bg-destructive/30 tw:dark:focus-visible:ring-destructive/40";

const buttonVariantsBase = cva(
  "tw:group/button tw:bg-transparent tw:inline-flex tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-transparent tw:bg-clip-padding tw:text-sm tw:font-semibold tw:tracking-[0.005em] tw:whitespace-nowrap tw:transition-[background-color,border-color,box-shadow,color,transform,filter] tw:duration-150 tw:ease-out tw:motion-reduce:transition-none tw:outline-none tw:select-none tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:active:not-aria-[haspopup]:translate-y-px tw:active:not-aria-[haspopup]:shadow-none tw:disabled:pointer-events-none tw:disabled:opacity-45 tw:disabled:shadow-none tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:border-destructive/50 tw:dark:aria-invalid:ring-destructive/40 tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: PRIMARY,
        // Semantic aliases: `primary` is the main action (same as `default`);
        // `secondary` in the AFHomes sense is `outline` (cancel, filter,
        // alternate actions). `danger` is the destructive action (same as
        // `destructive`). Prefer primary/outline/danger in new code; `default`
        // and `destructive` remain as deprecated aliases.
        primary: PRIMARY,
        outline:
          "tw:border-border tw:bg-card tw:shadow-xs tw:hover:border-primary/40 tw:hover:bg-muted tw:hover:text-foreground tw:aria-expanded:bg-muted tw:aria-expanded:text-foreground tw:dark:border-input tw:dark:bg-input/30 tw:dark:hover:bg-input/50",
        secondary:
          "tw:border-primary/15 tw:bg-secondary tw:text-secondary-foreground tw:shadow-xs tw:hover:border-primary/30 tw:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] tw:aria-expanded:bg-secondary tw:aria-expanded:text-secondary-foreground",
        ghost:
          "tw:hover:bg-muted tw:hover:text-foreground tw:aria-expanded:bg-muted tw:aria-expanded:text-foreground tw:dark:hover:bg-muted/50",
        destructive: DANGER,
        danger: DANGER,
        link: "tw:font-medium tw:text-primary tw:underline-offset-4 tw:hover:underline",
      },
      size: {
        default:
          "tw:h-10 tw:gap-2 tw:px-4 tw:has-data-[icon=inline-end]:pr-3.5 tw:has-data-[icon=inline-start]:pl-3.5",
        xs: "tw:h-7 tw:gap-1 tw:rounded-[min(var(--radius-md),10px)] tw:px-2.5 tw:text-xs tw:in-data-[slot=button-group]:rounded-lg tw:has-data-[icon=inline-end]:pr-2 tw:has-data-[icon=inline-start]:pl-2 tw:[&_svg:not([class*=size-])]:size-3",
        sm: "tw:h-8 tw:gap-1.5 tw:rounded-[min(var(--radius-md),12px)] tw:px-3 tw:text-[0.8rem] tw:in-data-[slot=button-group]:rounded-lg tw:has-data-[icon=inline-end]:pr-2.5 tw:has-data-[icon=inline-start]:pl-2.5 tw:[&_svg:not([class*=size-])]:size-3.5",
        lg: "tw:h-11 tw:gap-2 tw:px-5 tw:has-data-[icon=inline-end]:pr-4 tw:has-data-[icon=inline-start]:pl-4",
        icon: "tw:size-10",
        "icon-xs":
          "tw:size-7 tw:rounded-[min(var(--radius-md),10px)] tw:in-data-[slot=button-group]:rounded-lg tw:[&_svg:not([class*=size-])]:size-3",
        "icon-sm":
          "tw:size-8 tw:rounded-[min(var(--radius-md),12px)] tw:in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "tw:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Merge conflicting utilities (e.g. base `bg-transparent` vs variant `bg-primary`)
// for every caller, including links styled with `buttonVariants()` directly.
function buttonVariants(props?: Parameters<typeof buttonVariantsBase>[0]) {
  return cn(buttonVariantsBase(props))
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
