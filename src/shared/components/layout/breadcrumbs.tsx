import Link from "next/link";
import { Breadcrumb } from "antd";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumb
      aria-label="Breadcrumb"
      items={items.map((item, index) => {
        const isLast = index === items.length - 1;
        return {
          key: `${item.label}-${index}`,
          title:
            item.href && !isLast ? (
              <Link href={item.href} className="breadcrumb-link">{item.label}</Link>
            ) : (
              <span className="breadcrumb-current" aria-current={isLast ? "page" : undefined}>{item.label}</span>
            ),
        };
      })}
    />
  );
}
