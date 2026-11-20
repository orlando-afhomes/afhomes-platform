import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/** Breadcrumb trail for migrated screens. Any item with an href is a link, including the current page. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="tw:flex tw:flex-wrap tw:items-center tw:gap-1 tw:text-sm tw:text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="tw:flex tw:items-center tw:gap-1">
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "tw:rounded-sm tw:underline-offset-2 tw:hover:text-foreground tw:hover:underline tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none",
                    isLast && "tw:font-medium tw:text-foreground",
                  )}
                >
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
