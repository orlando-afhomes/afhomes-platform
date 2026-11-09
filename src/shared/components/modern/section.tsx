"use client";

import { useId, type ReactNode } from "react";

/** Titled page section with heading, optional description, and actions. */
export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:flex tw:flex-col tw:gap-2 tw:sm:flex-row tw:sm:items-end tw:sm:justify-between">
        <div>
          <h2 id={id} className="tw:text-lg tw:font-semibold">
            {title}
          </h2>
          {description ? <p className="tw:text-sm tw:text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
