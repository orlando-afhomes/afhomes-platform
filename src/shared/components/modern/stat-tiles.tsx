import type { ReactNode } from "react";
import { Card } from "@/shared/ui/card";

/** Summary figures row. */
export function StatTiles({ items }: { items: Array<{ label: string; value: ReactNode; hint?: string }> }) {
  return (
    <dl className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="tw:gap-1">
          <dt className="tw:text-sm tw:text-muted-foreground">{item.label}</dt>
          <dd className="tw:m-0 tw:mt-1 tw:text-2xl tw:font-semibold">{item.value}</dd>
          {item.hint ? <p className="tw:mt-1 tw:text-xs tw:text-muted-foreground">{item.hint}</p> : null}
        </Card>
      ))}
    </dl>
  );
}
