import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/** Titled card: accessible heading, optional description/actions, and body. */
export function CardSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <section aria-label={title} className="tw:flex tw:flex-col tw:gap-3">
        <CardHeader>
          <div className="tw:flex tw:flex-col tw:gap-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </section>
    </Card>
  );
}
