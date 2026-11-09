import type { ReactNode } from "react";

/** Titled group of fields inside a dialog form. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="tw:flex tw:flex-col tw:gap-3">
      <h3 className="tw:border-b tw:border-border tw:pb-1 tw:text-sm tw:font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** One column on phones, two from 640px. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">{children}</div>;
}
