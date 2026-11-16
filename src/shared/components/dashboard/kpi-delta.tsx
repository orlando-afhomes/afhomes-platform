import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const DELTA_STYLES = {
  up: { icon: ArrowUpRight, className: "tw:bg-success/10 tw:text-(--color-success-strong)" },
  down: { icon: ArrowDownRight, className: "tw:bg-destructive/10 tw:text-destructive" },
  flat: { icon: Minus, className: "tw:bg-muted tw:text-muted-foreground" },
};

export function KpiDelta({ direction, value, label }: {
  direction: keyof typeof DELTA_STYLES;
  value: string;
  label: string;
}) {
  const { icon: Icon, className } = DELTA_STYLES[direction];
  return (
    <span className={cn("tw:inline-flex tw:items-center tw:gap-1 tw:rounded-full tw:px-2 tw:py-1 tw:text-xs tw:leading-none tw:font-semibold tw:whitespace-nowrap tw:tabular-nums", className)}>
      <Icon aria-hidden="true" className="tw:size-3.5" strokeWidth={2.25} />
      <span aria-hidden="true">{value}</span>
      <span className="tw:sr-only">{label}</span>
    </span>
  );
}
