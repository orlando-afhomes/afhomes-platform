/**
 * Contract detail side cards (redesign reference: docs/ui-redesign/AFHomes
 * Contracts Dashboard Mockup.png, TOP-RIGHT panel).
 *
 * Presentational components only: every value is passed in as props and the
 * parent page resolves formatting, badges, and derived money before
 * rendering. No data fetching here. Layout utilities use the `tw:` prefix
 * and every color resolves to a design token. No animations, so
 * reduced-motion is safe.
 */
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Calculator,
  CreditCard,
  Crown,
  Layers,
  Scale,
  ShoppingCart,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Money } from "@/shared/components/modern/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

function CardHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <CardHeader className="tw:flex-row tw:items-center tw:gap-2">
      <Icon aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
      <span className="tw:min-w-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </span>
    </CardHeader>
  );
}

function StatusFact({ icon: Icon, term, children }: { icon: LucideIcon; term: string; children: ReactNode }) {
  return (
    <div className="contract-detail__fact tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-2.5 tw:last:border-b-0">
      <dt className="tw:flex tw:w-32 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
        <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" />
        <span className="tw:truncate">{term}</span>
      </dt>
      <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:font-medium tw:text-foreground">{children}</dd>
    </div>
  );
}

/** Lifecycle states for the contract: finalization, sale, and membership. */
export function ContractStatusCard({
  finalized,
  sale,
  membership,
}: {
  /** Pre-formatted finalization value (parent renders "—" when missing). */
  finalized: ReactNode;
  /** Sale state node (parent passes the Pending pill or fallback text). */
  sale: ReactNode;
  /** Membership state node (parent passes status text or "Not created yet"). */
  membership: ReactNode;
}) {
  return (
    <Card className="contract-detail__card tw:rounded-2xl">
      <CardHeading icon={Layers} title="Contract Status" description="Lifecycle states for this contract." />
      <CardContent>
        <dl aria-label="Contract lifecycle states" className="tw:m-0 tw:flex tw:flex-col">
          <StatusFact icon={BadgeCheck} term="Finalized">
            {finalized}
          </StatusFact>
          <StatusFact icon={ShoppingCart} term="Sale">
            {sale}
          </StatusFact>
          <StatusFact icon={Crown} term="Membership">
            {membership}
          </StatusFact>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Key financial information: price, verified money, and outstanding balance. */
export function ContractSummaryCard({
  priceCentavos,
  verifiedCentavos,
  outstandingCentavos,
}: {
  /** Integer centavos; Money never receives floating-point amounts. */
  priceCentavos: number;
  /** Integer centavos of Finance-verified payments. */
  verifiedCentavos: number;
  /** Integer centavos still owed. */
  outstandingCentavos: number;
}) {
  return (
    <Card className="contract-detail__card tw:rounded-2xl">
      <CardHeading icon={Calculator} title="Contract Summary" description="Key financial information." />
      <CardContent>
        <dl aria-label="Contract financial summary" className="tw:m-0 tw:flex tw:flex-col">
          <div className="contract-detail__fact tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-2.5">
            <dt className="tw:flex tw:w-32 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
              <Tag aria-hidden="true" className="tw:size-4 tw:shrink-0" />
              <span className="tw:truncate">Contract price</span>
            </dt>
            <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:text-right tw:text-sm tw:font-semibold tw:text-foreground">
              <Money value={priceCentavos} />
            </dd>
          </div>
          <div className="contract-detail__fact tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-2.5">
            <dt className="tw:flex tw:w-32 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
              <CreditCard aria-hidden="true" className="tw:size-4 tw:shrink-0" />
              <span className="tw:truncate">Verified payments</span>
            </dt>
            <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:text-right tw:text-sm tw:font-semibold tw:text-foreground">
              <Money value={verifiedCentavos} />
            </dd>
          </div>
          <div className="contract-detail__highlight tw:mt-2 tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:bg-[var(--color-brand-soft)] tw:px-3 tw:py-2.5">
            <dt className="tw:flex tw:w-32 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:font-semibold tw:text-foreground">
              <Scale aria-hidden="true" className="tw:size-4 tw:shrink-0" />
              <span className="tw:truncate">Outstanding balance</span>
            </dt>
            <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:text-right tw:text-sm tw:font-bold tw:text-[var(--color-brand-primary)]">
              <Money value={outstandingCentavos} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
