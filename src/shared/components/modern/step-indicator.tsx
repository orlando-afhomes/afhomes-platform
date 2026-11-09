import { cn } from "@/shared/lib/utils";

/**
 * Progress through a multi-step flow. The current step carries aria-current="step"
 * and every item announces its number, so progress is not conveyed by color alone.
 */
export function StepIndicator({ steps, current, className }: { steps: readonly string[]; current: number; className?: string }) {
  return (
    <ol aria-label="Progress" className={cn("tw:m-0 tw:flex tw:list-none tw:gap-1 tw:p-0", className)}>
      {steps.map((title, index) => (
        <li
          key={title}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "tw:flex-1 tw:border-b-2 tw:pb-1 tw:text-center tw:text-xs tw:font-medium",
            index === current ? "tw:border-primary tw:text-foreground" : index < current ? "tw:border-primary/40 tw:text-muted-foreground" : "tw:border-border tw:text-muted-foreground",
          )}
        >
          <span className="tw:sr-only">Step {index + 1}: </span>
          {title}
        </li>
      ))}
    </ol>
  );
}
