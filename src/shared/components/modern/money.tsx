import { cn } from "@/shared/lib/utils";
import { formatPeso } from "@/shared/lib/money";

/** Peso amount with tabular numerals that never wraps. `value` is centavos. */
export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tw:whitespace-nowrap tw:tabular-nums", className)}>{formatPeso(value)}</span>;
}
