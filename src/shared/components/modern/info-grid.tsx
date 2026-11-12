import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const columnClasses: Record<1 | 2 | 3, string> = {
  1: "tw:grid tw:grid-cols-1",
  2: "tw:grid tw:grid-cols-1 tw:sm:grid-cols-2",
  3: "tw:grid tw:grid-cols-1 tw:sm:grid-cols-2 tw:lg:grid-cols-3",
};

/** Responsive read-only grid of label-above-value items for details views. */
export function InfoGrid({
  children,
  columns = 2,
  label,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  label: string;
  className?: string;
}) {
  return (
    <dl aria-label={label} className={cn(columnClasses[columns], "tw:gap-x-8 tw:gap-y-5", className)}>
      {children}
    </dl>
  );
}

/** One term/value pair inside an InfoGrid; set `wide` to span two columns from sm up. */
export function InfoItem({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("tw:min-w-0", wide && "tw:sm:col-span-2")}>
      <dt className="tw:text-xs tw:font-medium tw:uppercase tw:tracking-wide tw:text-muted-foreground">{term}</dt>
      <dd className="tw:m-0 tw:mt-1 tw:text-sm tw:font-medium tw:text-foreground tw:break-words">{children}</dd>
    </div>
  );
}
