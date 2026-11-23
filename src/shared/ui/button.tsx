import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"
import { Spinner } from "@/shared/ui/spinner"

// Solid brand fill with a soft top-light gradient and a crisp inner highlight.
// The fill stays `bg-primary`; the gradient is an overlay, so the token still drives the color.
const PRIMARY =
  "tw:bg-primary tw:bg-linear-to-b tw:from-white/15 tw:to-black/10 tw:text-primary-foreground tw:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_0_rgb(0_0_0/0.2)] tw:hover:brightness-110 tw:hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22),0_4px_10px_-2px_rgb(0_0_0/0.28)]";
// Semantic action colors, built only from the --success/--warning/--info/--destructive
// tokens. Success and danger are solid (the decisive actions); warning and info are
// soft tints so they read as secondary. Dark mode lifts the tinted text toward white.
const SOLID_SHADOW =
  "tw:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_0_rgb(0_0_0/0.2)] tw:hover:brightness-110";
const SUCCESS = `tw:border-success tw:bg-success tw:text-success-foreground tw:focus-visible:border-success tw:focus-visible:ring-success/30 ${SOLID_SHADOW}`;
const DANGER = `tw:border-destructive tw:bg-destructive tw:text-white tw:focus-visible:border-destructive tw:focus-visible:ring-destructive/30 ${SOLID_SHADOW}`;
const WARNING =
  "tw:border-warning/40 tw:bg-warning/10 tw:text-warning tw:hover:border-warning/60 tw:hover:bg-warning/20 tw:focus-visible:border-warning tw:focus-visible:ring-warning/30 tw:dark:bg-warning/20 tw:dark:text-[color-mix(in_oklch,var(--warning),white_45%)] tw:dark:hover:bg-warning/30";
const INFO =
  "tw:border-info/40 tw:bg-info/10 tw:text-info tw:hover:border-info/60 tw:hover:bg-info/20 tw:focus-visible:border-info tw:focus-visible:ring-info/30 tw:dark:bg-info/20 tw:dark:text-[color-mix(in_oklch,var(--info),white_45%)] tw:dark:hover:bg-info/30";
// Soft colored actions beside each other (for example a row of page actions) each get their own hue.
const VIOLET =
  "tw:border-(--color-dashboard-violet)/40 tw:bg-(--color-dashboard-violet-soft) tw:text-(--color-dashboard-violet) tw:hover:border-(--color-dashboard-violet)/60 tw:hover:brightness-95 tw:focus-visible:border-(--color-dashboard-violet) tw:focus-visible:ring-(--color-dashboard-violet)/30 tw:dark:bg-(--color-dashboard-violet)/20 tw:dark:text-[color-mix(in_oklch,var(--color-dashboard-violet),white_45%)]";
const TEAL =
  "tw:border-(--color-teal)/40 tw:bg-(--color-teal)/10 tw:text-(--color-teal) tw:hover:border-(--color-teal)/60 tw:hover:bg-(--color-teal)/20 tw:focus-visible:border-(--color-teal) tw:focus-visible:ring-(--color-teal)/30 tw:dark:bg-(--color-teal)/20 tw:dark:text-[color-mix(in_oklch,var(--color-teal),white_45%)]";
const ROSE =
  "tw:border-(--color-rose)/40 tw:bg-(--color-rose)/10 tw:text-(--color-rose) tw:hover:border-(--color-rose)/60 tw:hover:bg-(--color-rose)/20 tw:focus-visible:border-(--color-rose) tw:focus-visible:ring-(--color-rose)/30 tw:dark:bg-(--color-rose)/20 tw:dark:text-[color-mix(in_oklch,var(--color-rose),white_45%)]";
// Secondary actions (Cancel, Details, filters): soft brand wash so they read as
// real buttons without competing with the solid primary action (owner choice,
// 2026-11-20). `secondary` is kept as a deprecated alias of this same style.
const OUTLINE =
  "tw:border-primary/25 tw:bg-primary/10 tw:text-primary tw:shadow-xs tw:hover:border-primary/40 tw:hover:bg-primary/15 tw:aria-expanded:border-primary/40 tw:aria-expanded:bg-primary/15 tw:dark:border-primary/30 tw:dark:bg-primary/15 tw:dark:text-primary tw:dark:hover:bg-primary/20 tw:dark:aria-expanded:bg-primary/20";

const buttonVariantsBase = cva(
  "tw:group/button tw:bg-transparent tw:inline-flex tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-transparent tw:bg-clip-padding tw:text-sm tw:font-semibold tw:tracking-[0.005em] tw:whitespace-nowrap tw:transition-[background-color,border-color,box-shadow,color,transform,filter] tw:duration-150 tw:ease-out tw:motion-reduce:transition-none tw:outline-none tw:select-none tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:active:not-aria-[haspopup]:translate-y-px tw:active:not-aria-[haspopup]:shadow-none tw:disabled:pointer-events-none tw:disabled:opacity-45 tw:disabled:shadow-none tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:border-destructive/50 tw:dark:aria-invalid:ring-destructive/40 tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: PRIMARY,
        // Semantic aliases: `primary` is the main action (same as `default`);
        // `secondary` in the AFHomes sense is `outline` (cancel, filter,
        // alternate actions). `danger` is the solid red destructive action (same as
        // `destructive`). `success`, `warning` and `info` are the other semantic colors. Prefer primary/outline/danger in new code; `default`
        // and `destructive` remain as deprecated aliases.
        primary: PRIMARY,
        // Neutral button for Cancel, Close and filters: soft brand wash with a
        // primary-tinted border (owner choice, 2026-11-20). `secondary` below is
        // its deprecated alias so existing call sites keep working.
        outline: OUTLINE,
        secondary: OUTLINE,
        ghost:
          "tw:hover:bg-muted tw:hover:text-foreground tw:aria-expanded:bg-muted tw:aria-expanded:text-foreground tw:dark:hover:bg-muted/50",
        destructive: DANGER,
        danger: DANGER,
        success: SUCCESS,
        warning: WARNING,
        info: INFO,
        violet: VIOLET,
        teal: TEAL,
        rose: ROSE,
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
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
  /** Shows a spinner, blocks clicks, and keeps the label so the width does not jump. */
  loading?: boolean
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner aria-hidden="true" /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
