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
              "tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:text-xs tw:font-semibold tw:transition-colors",
              active && "tw:border-primary tw:bg-primary tw:text-primary-foreground tw:shadow-(--shadow-soft)",
              done && "tw:border-primary tw:bg-secondary tw:text-primary",
              !active && !done && "tw:border-border tw:bg-card tw:text-muted-foreground",
            )}
          >
            {done ? <Check aria-hidden="true" className="tw:size-4" /> : index + 1}
          </span>
        );
        const label = (
          <span className={cn("tw:text-center tw:text-xs tw:font-medium", active ? "tw:text-foreground" : "tw:text-muted-foreground")}>
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
              <button type="button" onClick={() => onStepClick(index)} className="tw:relative tw:z-[1] tw:flex tw:cursor-pointer tw:flex-col tw:items-center tw:gap-1.5 tw:rounded-md tw:px-1 tw:outline-none tw:hover:[&_span]:text-foreground tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40">
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
