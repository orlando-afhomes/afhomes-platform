"use client";

import { CalendarDays, Crown, Layers, Tag, User } from "lucide-react";
import { formatDate } from "@/shared/lib/format-date";
import { BizBadge } from "@/shared/components/business/biz-badge";
import type { CustomerStatus } from "@/modules/customers/types";

export type CustomerDetailStatus = CustomerStatus;

/** Sage tint identity banner for the customer detail page (see docs/ui-redesign/customer-detail.png). */
export function CustomerDetailHero({
  displayName,
  status,
  vipPlan,
  customerNumber,
  submittedAt,
  classification,
  schemeLabel,
}: {
  displayName: string;
  status: CustomerDetailStatus;
  vipPlan: string | null;
  customerNumber: string | null;
  submittedAt: string | null;
  classification: "S" | "N" | null | undefined;
  schemeLabel: string | null;
}) {
  const classificationLabel =
    classification === "S" ? "Standard (S)" : classification === "N" ? "Non-Standard (N)" : "—";

  const meta = [
    { label: "Submitted", value: formatDate(submittedAt), Icon: CalendarDays },
    { label: "Classification", value: classificationLabel, Icon: Tag },
    { label: "Scheme", value: schemeLabel ?? "—", Icon: Layers },
  ] as const;

  return (
    <section
      aria-label={`Customer summary for ${displayName}`}
      className="customer-detail-hero tw:flex tw:flex-col tw:gap-6 tw:rounded-2xl tw:bg-[var(--color-brand-soft)] tw:px-5 tw:py-5 tw:sm:px-6 tw:lg:flex-row tw:lg:items-center"
    >
      <div className="customer-detail-hero__identity tw:flex tw:items-center tw:gap-4 tw:lg:max-w-md tw:lg:flex-1">
        <span
          aria-hidden="true"
          className="customer-detail-hero__avatar tw:flex tw:size-16 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-[var(--color-bg-surface-raised)] tw:text-[var(--color-brand-primary)]"
        >
          <User className="tw:size-8" />
        </span>
        <div className="customer-detail-hero__summary tw:min-w-0">
          <h2 className="customer-detail-hero__name tw:truncate tw:text-xl tw:font-bold tw:text-[var(--color-text-primary)]">
            {displayName}
          </h2>
          <p className="customer-detail-hero__pills tw:mt-1.5 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
            <BizBadge status={status} />
            <span className="customer-detail-hero__vip tw:inline-flex tw:min-h-6 tw:items-center tw:gap-1 tw:rounded-full tw:bg-[var(--color-accent-soft)] tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-semibold tw:text-[var(--color-accent-strong)]">
              <Crown aria-hidden="true" className="tw:size-3.5" />
              {vipPlan ? `VIP ${vipPlan}` : "No VIP plan"}
            </span>
          </p>
          <p className="customer-detail-hero__id tw:mt-1.5 tw:text-sm tw:text-[var(--color-text-secondary)]">
            Customer ID: {customerNumber ?? "—"}
          </p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="customer-detail-hero__divider tw:hidden tw:w-px tw:self-stretch tw:bg-[var(--color-border-default)] tw:lg:block"
      />

      <dl className="customer-detail-hero__meta tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-3 tw:lg:flex-1">
        {meta.map(({ label, value, Icon }) => (
          <div key={label} className="customer-detail-hero__meta-item tw:flex tw:items-start tw:gap-2.5">
            <Icon aria-hidden="true" className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:text-[var(--color-brand-primary)]" />
            <div className="tw:min-w-0">
              <dt className="tw:text-xs tw:font-medium tw:text-[var(--color-text-muted)]">{label}</dt>
              <dd className="tw:truncate tw:text-sm tw:font-semibold tw:text-[var(--color-text-primary)]">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
