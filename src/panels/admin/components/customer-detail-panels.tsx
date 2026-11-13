/**
 * Customer detail record panels (redesign reference: docs/ui-redesign/customer-detail.png).
 *
 * Presentational components only: every value is passed in as props and the
 * parent page resolves permissions, projections, and restricted views before
 * rendering. Restricted mode is handled by the parent (it passes "—" or omits
 * sections); these components render exactly what they receive.
 *
 * Companion stylesheet: customer-detail-panels.css (imported at the owning
 * route by the main agent). All custom classes are namespaced
 * `customer-detail__*`; layout utilities use the `tw:` prefix and every color
 * resolves to a design token. No animations, so reduced-motion is safe.
 */
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  Crown,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldAlert,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Customer } from "@/modules/customers/types";
import { formatDate } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { Money } from "@/shared/components/modern/money";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/** Asia/Manila timestamp such as "Sep 29, 2026, 10:24 AM". Raw value on parse failure. */
export function formatManilaDateTime(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return new Date(time).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isStepDone(status: string | null | undefined): boolean {
  if (status == null) return false;
  const normalized = status.trim().toLowerCase();
  return normalized !== "" && normalized !== "pending";
}

function CardHeading({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: React.ReactNode }) {
  return (
    <CardHeader className="tw:flex-row tw:items-center tw:justify-between tw:gap-2">
      <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
        <Icon aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
        <CardTitle>{title}</CardTitle>
      </span>
      {action}
    </CardHeader>
  );
}

function Fact({
  icon: Icon,
  term,
  children,
}: {
  icon: LucideIcon;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="customer-detail__fact tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5 tw:last:border-b-0">
      <dt className="tw:flex tw:w-32 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
        <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" />
        <span className="tw:truncate">{term}</span>
      </dt>
      <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:font-medium tw:text-foreground">{children}</dd>
    </div>
  );
}

function FactList({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl aria-label={label} className="tw:m-0 tw:flex tw:flex-col">
      {children}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* CustomerInfoCard                                                    */
/* ------------------------------------------------------------------ */

export function CustomerInfoCard({
  customer,
  ownerName,
  recommenderName,
  referralReference,
}: {
  customer: Customer;
  /** Pre-resolved closing seller display name (parent substitutes "—" when withheld). */
  ownerName: string;
  /** Pre-resolved referrer display name (parent substitutes "—" when withheld). */
  recommenderName: string;
  /** Dated referral reference, shown only when recorded. */
  referralReference?: string | null;
}) {
  const addressLines = customer.address
    ? [
        customer.address.street,
        [customer.address.barangay, customer.address.city, customer.address.province].filter(Boolean).join(", "),
      ].filter((line) => line.trim() !== "")
    : [];
  return (
    <Card className="customer-detail__card tw:rounded-2xl">
      <CardHeading icon={User} title="Customer Information" />
      <CardContent>
        <div className="customer-detail__facts tw:grid tw:gap-x-8 tw:md:grid-cols-2">
          <FactList label="Contact details">
            <Fact icon={BadgeCheck} term="VIP Plan">
              {customer.vipPlan ? <ToneBadge tone="success">{customer.vipPlan}</ToneBadge> : "—"}
            </Fact>
            <Fact icon={Phone} term="Mobile">
              {customer.mobileNumber ?? "—"}
            </Fact>
            <Fact icon={Mail} term="Email">
              {customer.email ?? "—"}
            </Fact>
            <Fact icon={MapPin} term="Address">
              {addressLines.length > 0 ? (
                <span>
                  {addressLines.map((line) => (
                    <span key={line} className="tw:block">
                      {line}
                    </span>
                  ))}
                </span>
              ) : (
                "—"
              )}
            </Fact>
          </FactList>
          <FactList label="Origin details">
            <Fact icon={CalendarDays} term="Date of Birth">
              {formatDate(customer.dateOfBirth)}
            </Fact>
            <Fact icon={Share2} term="Channel">
              {customer.acquisitionChannel ?? "—"}
            </Fact>
            <Fact icon={User} term="Referrer">
              {recommenderName}
            </Fact>
            {referralReference ? (
              <Fact icon={Share2} term="Referral reference">
                {referralReference}
              </Fact>
            ) : null}
            <Fact icon={Briefcase} term="Closing seller">
              {ownerName}
            </Fact>
          </FactList>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* CustomerProgressCard                                                */
/* ------------------------------------------------------------------ */

function ProgressStep({
  done,
  title,
  date,
  pill,
  last,
}: {
  done: boolean;
  title: string;
  date?: string;
  pill?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="customer-detail__step tw:flex tw:gap-3">
      <span aria-hidden="true" className="tw:flex tw:flex-col tw:items-center">
        <span
          className={cn(
            "tw:flex tw:size-6 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border-2",
            done ? "tw:border-success tw:bg-success tw:text-white" : "tw:border-border tw:bg-card",
          )}
        >
          {done ? <Check className="tw:size-3.5" strokeWidth={3} /> : null}
        </span>
        {last ? null : <span className="customer-detail__rail tw:min-h-6 tw:flex-1" />}
      </span>
      <span className="tw:min-w-0 tw:flex-1 tw:pb-5 tw:last:pb-0">
        <span className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
          <span className="tw:text-sm tw:font-semibold tw:text-foreground">{title}</span>
          {pill}
        </span>
        {date ? <span className="tw:mt-0.5 tw:block tw:text-xs tw:text-muted-foreground">{date}</span> : null}
      </span>
    </li>
  );
}

export function CustomerProgressCard({
  submittedAt,
  contractStatus,
  membershipStatus,
}: {
  submittedAt: string | null | undefined;
  /** Null (or "pending") renders the amber Pending pill; any other value renders Done. */
  contractStatus: string | null;
  /** Null (or "pending") renders the amber Pending pill; any other value renders Done. */
  membershipStatus: string | null;
}) {
  const contractDone = isStepDone(contractStatus);
  const membershipDone = isStepDone(membershipStatus);
  return (
    <Card className="customer-detail__card tw:rounded-2xl">
      <CardHeading icon={BadgeCheck} title="Customer Progress" />
      <CardContent>
        <ol className="tw:m-0 tw:list-none tw:p-0">
          <ProgressStep done title="Application Submitted" date={formatDate(submittedAt ?? undefined)} />
          <ProgressStep
            done={contractDone}
            title="Contract Finalization"
            pill={contractDone ? <ToneBadge tone="success">Done</ToneBadge> : <ToneBadge tone="warning">Pending</ToneBadge>}
          />
          <ProgressStep
            done={membershipDone}
            last
            title="Membership Activation"
            pill={membershipDone ? <ToneBadge tone="success">Done</ToneBadge> : <ToneBadge tone="warning">Pending</ToneBadge>}
          />
        </ol>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* LinkedRecordsCard                                                   */
/* ------------------------------------------------------------------ */

export function LinkedRecordsCard({
  contractLabel,
  contractHref,
  saleLabel,
  membershipLabel,
  saleValueCentavos,
  showSaleValue,
}: {
  contractLabel: string;
  /** Null when there is no contract to open; the row still renders without the link. */
  contractHref: string | null;
  saleLabel: string;
  membershipLabel: string;
  /** Integer centavos; Money never receives floating-point amounts. */
  saleValueCentavos: number | null;
  /** Parent hides the value for viewers without finance visibility. */
  showSaleValue: boolean;
}) {
  return (
    <Card className="customer-detail__card tw:rounded-2xl">
      <CardHeading icon={Link2} title="Linked Records" />
      <CardContent>
        <CardDescription className="tw:-mt-2">Contract, sale and membership connected to this customer.</CardDescription>
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
          <li className="customer-detail__linked-row tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-3">
            <FileText aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
            <span className="tw:w-32 tw:shrink-0 tw:text-sm tw:font-semibold tw:text-foreground">Contract</span>
            <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-sm tw:text-muted-foreground">
              {contractLabel}{" "}
              {contractHref ? (
                <Link href={contractHref} className="tw:font-medium tw:text-primary tw:underline-offset-4 tw:hover:underline">
                  Open contract
                </Link>
              ) : null}
            </span>
            <ToneBadge tone="success">Linked</ToneBadge>
            <ChevronRight aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" />
          </li>
          <li className="customer-detail__linked-row tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-3">
            <ShoppingCart aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
            <span className="tw:w-32 tw:shrink-0 tw:text-sm tw:font-semibold tw:text-foreground">Sale</span>
            <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-sm tw:text-muted-foreground">{saleLabel}</span>
            <ToneBadge tone="success">Linked</ToneBadge>
            <ChevronRight aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" />
          </li>
          <li className="customer-detail__linked-row tw:flex tw:items-center tw:gap-3 tw:py-3">
            <Crown aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
            <span className="tw:w-32 tw:shrink-0 tw:text-sm tw:font-semibold tw:text-foreground">VIP Membership</span>
            <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-sm tw:text-muted-foreground">{membershipLabel}</span>
            <ToneBadge tone="success">Linked</ToneBadge>
            <ChevronRight aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" />
          </li>
        </ul>
        {showSaleValue && saleValueCentavos != null ? (
          <p className="customer-detail__valuebar tw:m-0 tw:mt-1 tw:flex tw:items-center tw:gap-2 tw:rounded-xl tw:px-4 tw:py-3">
            <Coins aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">Sale Value</span>
            <Money value={saleValueCentavos} className="tw:text-base tw:font-bold tw:text-primary" />
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* RecentActivityCard                                                  */
/* ------------------------------------------------------------------ */

export type CustomerDetailActivity = {
  id: string;
  label: string;
  /** ISO timestamp; rendered as an Asia/Manila date and time. */
  timestamp: string;
};

export function RecentActivityCard({
  items,
  viewAllHref,
  onViewAll,
}: {
  items: readonly CustomerDetailActivity[];
  viewAllHref?: string;
  onViewAll?: () => void;
}) {
  const action = onViewAll ? (
    <button
      type="button"
      onClick={onViewAll}
      className="tw:inline-flex tw:min-h-8 tw:items-center tw:gap-0.5 tw:text-sm tw:font-semibold tw:text-primary tw:underline-offset-4 tw:hover:underline"
    >
      View all
      <ChevronRight aria-hidden="true" className="tw:size-4" />
    </button>
  ) : viewAllHref ? (
    <Link
      href={viewAllHref}
      className="tw:inline-flex tw:min-h-8 tw:items-center tw:gap-0.5 tw:text-sm tw:font-semibold tw:text-primary tw:underline-offset-4 tw:hover:underline"
    >
      View all
      <ChevronRight aria-hidden="true" className="tw:size-4" />
    </Link>
  ) : undefined;
  return (
    <Card className="customer-detail__card tw:rounded-2xl">
      <CardHeading
        icon={Clock3}
        title="Recent Activity"
        action={action}
      />
      <CardContent>
        {items.length === 0 ? (
          <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
            {items.map((item, index) => (
              <li key={item.id} className="customer-detail__activity tw:flex tw:gap-3">
                <span aria-hidden="true" className="tw:flex tw:flex-col tw:items-center">
                  <span
                    className={cn(
                      "tw:mt-1.5 tw:size-2.5 tw:shrink-0 tw:rounded-full",
                      index === 0 ? "tw:bg-success" : "tw:bg-border",
                    )}
                  />
                  {index === items.length - 1 ? null : <span className="customer-detail__rail tw:min-h-4 tw:flex-1" />}
                </span>
                <span className="tw:min-w-0 tw:flex-1 tw:pb-4 tw:last:pb-0">
                  <span className="tw:block tw:text-sm tw:font-medium tw:text-foreground">{item.label}</span>
                  <time dateTime={item.timestamp} className="tw:mt-0.5 tw:block tw:text-xs tw:text-muted-foreground">
                    {formatManilaDateTime(item.timestamp)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tab panels                                                          */
/* ------------------------------------------------------------------ */

export type CustomerDetailFact = {
  label: string;
  value: string;
};

function TabPanelShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="customer-detail__card tw:rounded-2xl tw:border tw:p-5 tw:sm:p-6">
      {children}
    </section>
  );
}

function FactsTable({ rows }: { rows: readonly CustomerDetailFact[] }) {
  return (
    <dl className="tw:m-0 tw:flex tw:flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5 tw:last:border-b-0"
        >
          <dt className="tw:w-40 tw:shrink-0 tw:text-sm tw:text-muted-foreground">{row.label}</dt>
          <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:font-medium tw:text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ContractTabPanel({ facts, contractHref }: { facts: readonly CustomerDetailFact[]; contractHref: string | null }) {
  return (
    <TabPanelShell label="Contract">
      <FactsTable rows={facts} />
      {contractHref ? (
        <p className="tw:m-0 tw:mt-3">
          <Link href={contractHref} className="tw:text-sm tw:font-semibold tw:text-primary tw:underline-offset-4 tw:hover:underline">
            Open contract
            <ChevronRight aria-hidden="true" className="tw:inline tw:size-4" />
          </Link>
        </p>
      ) : null}
    </TabPanelShell>
  );
}

export function SalesTabPanel({
  facts,
  saleValueCentavos,
}: {
  facts: readonly CustomerDetailFact[];
  /** Integer centavos; null hides the value line. */
  saleValueCentavos: number | null;
}) {
  return (
    <TabPanelShell label="Sales">
      <FactsTable rows={facts} />
      {saleValueCentavos != null ? (
        <p className="customer-detail__valuebar tw:m-0 tw:mt-3 tw:flex tw:items-center tw:gap-2 tw:rounded-xl tw:px-4 tw:py-3">
          <Coins aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:text-primary" />
          <span className="tw:text-sm tw:font-semibold tw:text-foreground">Sale Value</span>
          <Money value={saleValueCentavos} className="tw:text-base tw:font-bold tw:text-primary" />
        </p>
      ) : null}
    </TabPanelShell>
  );
}

export function MembershipTabPanel({
  status,
  cardId,
  validUntil,
  onHold,
}: {
  status: string;
  cardId: string | null;
  /** Date-only value; null renders an em dash. */
  validUntil: string | null;
  onHold: boolean;
}) {
  return (
    <TabPanelShell label="Membership">
      <dl className="tw:m-0 tw:flex tw:flex-col">
        <div className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5">
          <dt className="tw:flex tw:w-40 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
            <BadgeCheck aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            Status
          </dt>
          <dd className="tw:m-0 tw:min-w-0 tw:flex-1">
            <StatusBadge status={status} />
          </dd>
        </div>
        <div className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5">
          <dt className="tw:flex tw:w-40 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
            <CreditCard aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            Card ID
          </dt>
          <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:font-medium tw:text-foreground">
            {cardId ?? "—"}
          </dd>
        </div>
        <div className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5">
          <dt className="tw:flex tw:w-40 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
            <CalendarDays aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            Valid Until
          </dt>
          <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:font-medium tw:text-foreground">
            {formatDate(validUntil)}
          </dd>
        </div>
        <div className="tw:flex tw:items-start tw:gap-3 tw:py-2.5">
          <dt className="tw:flex tw:w-40 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground">
            <ShieldAlert aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            Hold
          </dt>
          <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:text-sm tw:font-medium tw:text-foreground">
            {onHold ? <ToneBadge tone="warning">On hold</ToneBadge> : "Not on hold"}
          </dd>
        </div>
      </dl>
    </TabPanelShell>
  );
}

export function AuditTabPanel({
  events,
  authorized,
}: {
  events: readonly CustomerDetailActivity[];
  /** False renders the restriction note instead of the list. */
  authorized: boolean;
}) {
  if (!authorized) {
    return (
      <TabPanelShell label="Audit log">
        <InfoNote>Audit history is restricted.</InfoNote>
      </TabPanelShell>
    );
  }
  return (
    <TabPanelShell label="Audit log">
      {events.length === 0 ? (
        <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No audit events.</p>
      ) : (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
          {events.map((event) => (
            <li
              key={event.id}
              className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-0.5 tw:border-b tw:border-border tw:py-2 tw:last:border-b-0"
            >
              <span className="tw:min-w-0 tw:flex-1 tw:text-sm tw:font-medium tw:text-foreground">{event.label}</span>
              <time dateTime={event.timestamp} className="tw:shrink-0 tw:text-xs tw:text-muted-foreground">
                {formatManilaDateTime(event.timestamp)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </TabPanelShell>
  );
}
