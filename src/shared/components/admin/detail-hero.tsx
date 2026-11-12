import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DetailHeroMetaItem = {
  label: string;
  value: ReactNode;
  Icon: LucideIcon;
};

/** Sage tint identity banner for admin detail pages, generalised from CustomerDetailHero. */
export function DetailHero({
  avatar,
  name,
  badges,
  subtitle,
  meta,
  ariaLabel,
}: {
  avatar: ReactNode;
  name: string;
  badges?: ReactNode;
  subtitle?: ReactNode;
  meta?: readonly DetailHeroMetaItem[];
  ariaLabel: string;
}) {
  const hasMeta = Boolean(meta && meta.length > 0);

  return (
    <section
      aria-label={ariaLabel}
      className="detail-hero tw:flex tw:flex-col tw:gap-6 tw:rounded-2xl tw:bg-[var(--color-brand-soft)] tw:px-5 tw:py-5 tw:sm:px-6 tw:lg:flex-row tw:lg:items-center"
    >
      <div className="detail-hero__identity tw:flex tw:min-w-0 tw:items-center tw:gap-4 tw:lg:max-w-md tw:lg:flex-1">
        <div className="detail-hero__avatar tw:shrink-0">{avatar}</div>
        <div className="detail-hero__summary tw:min-w-0">
          <h2 className="detail-hero__name tw:truncate tw:text-xl tw:font-bold tw:text-[var(--color-text-primary)]">
            {name}
          </h2>
          {badges ? (
            <div className="detail-hero__badges tw:mt-1.5 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
              {badges}
            </div>
          ) : null}
          {subtitle ? (
            <p className="detail-hero__subtitle tw:mt-1.5 tw:text-sm tw:text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {hasMeta ? (
        <>
          <div
            aria-hidden="true"
            className="detail-hero__divider tw:hidden tw:w-px tw:self-stretch tw:bg-[var(--color-border-default)] tw:lg:block"
          />
          <dl className="detail-hero__meta tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2 tw:lg:flex-1 tw:lg:grid-cols-3">
            {meta?.map(({ label, value, Icon }) => (
              <div key={label} className="detail-hero__meta-item tw:flex tw:min-w-0 tw:items-start tw:gap-2.5">
                <Icon aria-hidden="true" className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:text-[var(--color-brand-primary)]" />
                <div className="tw:min-w-0">
                  <dt className="tw:text-xs tw:font-medium tw:text-[var(--color-text-muted)]">{label}</dt>
                  <dd className="tw:m-0 tw:break-words tw:text-sm tw:font-semibold tw:text-[var(--color-text-primary)]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </section>
  );
}
