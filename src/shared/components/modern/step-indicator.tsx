import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * Progress through a multi-step flow: numbered circles joined by a line, a check
 * mark on finished steps, and the current step filled in the brand color. The
 * current step carries aria-current="step" and every item announces its number,
 * so progress is never conveyed by color alone. With `onStepClick`, every step
 * except the current one becomes a button; the caller decides whether a jump is
 * allowed. Without it the indicator is display-only.
 */
export function StepIndicator({
  steps,
  current,
  className,
  onStepClick,
}: {
  steps: readonly string[];
  current: number;
  className?: string;
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol aria-label="Progress" className={cn("tw:m-0 tw:flex tw:list-none tw:p-0", className)}>
      {steps.map((title, index) => {
        const done = index < current;
        const active = index === current;
        const badge = (
          <span
            className={cn(
              "tw:flex tw:size-9 tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:text-xs tw:font-semibold tw:transition-colors",
              active && "tw:border-primary tw:bg-primary tw:text-primary-foreground tw:shadow-(--shadow-soft)",
              done && "tw:border-primary tw:bg-secondary tw:text-primary",
              !active && !done && "tw:border-border tw:bg-card tw:text-muted-foreground tw:group-hover:border-primary/40",
            )}
          >
            {done ? <Check aria-hidden="true" className="tw:size-4" /> : index + 1}
          </span>
        );
        const label = (
          <span className={cn("tw:text-center tw:text-xs tw:font-medium tw:transition-colors tw:group-hover:text-foreground", active ? "tw:text-foreground" : "tw:text-muted-foreground")}>
            <span className="tw:sr-only">Step {index + 1}: </span>
            {title}
          </span>
        );
        return (
          <li key={title} aria-current={active ? "step" : undefined} className="tw:relative tw:flex tw:flex-1 tw:flex-col tw:items-center tw:gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className={cn("tw:absolute tw:top-4 tw:right-1/2 tw:left-[-50%] tw:h-0.5 tw:-translate-y-1/2", index <= current ? "tw:bg-primary/50" : "tw:bg-border")} />
            ) : null}
            {onStepClick && !active ? (
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className="tw:relative tw:z-[1] tw:flex tw:w-full tw:cursor-pointer tw:flex-col tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-border/70 tw:bg-card tw:px-2 tw:py-2.5 tw:shadow-xs tw:transition-[background-color,border-color,box-shadow,transform] tw:duration-150 tw:hover:-translate-y-0.5 tw:hover:border-primary/30 tw:hover:bg-primary/5 tw:hover:shadow-(--shadow-soft) tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0"
              >
                {badge}
                {label}
              </button>
            ) : (
              <span className="tw:relative tw:z-[1] tw:flex tw:flex-col tw:items-center tw:gap-1.5">
                {badge}
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
