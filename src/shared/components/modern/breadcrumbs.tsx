import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/** Breadcrumb trail for migrated screens. The last item is the current page. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="tw:flex tw:flex-wrap tw:items-center tw:gap-1 tw:text-sm tw:text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="tw:flex tw:items-center tw:gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="tw:rounded-sm tw:hover:text-foreground tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "tw:text-foreground" : undefined} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {isLast ? null : <ChevronRight aria-hidden="true" className="tw:size-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
