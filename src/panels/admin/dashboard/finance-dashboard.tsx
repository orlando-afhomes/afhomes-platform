"use client";

import { useMemo } from "react";
import { Ban, Coins, HandCoins, Landmark, ListChecks, ReceiptText, ShieldAlert, UserCheck, Wallet } from "lucide-react";
import { useEffectiveModuleIds } from "@/data/queries";
import { useCommissions, useContracts, useEligibleSales, useMemberships, useOperation, usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Money } from "@/shared/components/modern/money";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart, type DistributionRow } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";
import { DashboardTrendChart } from "@/shared/components/dashboard/dashboard-trend-chart";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { formatPeso } from "@/shared/lib/money";
import { manilaToday } from "@/shared/lib/dates";
import {
  buildActivityFeed,
  commissionPayoutSummary,
  countCancellationRequests,
  countFinancialHolds,
  countPendingMembershipActivations,
  countPendingPaymentVerifications,
  dailyCollections,
  dateSpan,
  receivablesBreakdown,
  type DashboardActivityItem,
} from "../dashboard-metrics";
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, toActivityEntries } from "./dashboard-presentation";

const RECEIVABLE_ROWS = [
  { state: "settled", label: "Settled", color: "var(--color-success)" },
  { state: "outstanding", label: "Outstanding, not overdue", color: "var(--color-accent)" },
  { state: "overdue", label: "Overdue", color: "var(--color-danger)" },
] as const;

/** Finance activity: payment events and commission payouts; approvals and holds stay on their own pages. */
function isFinanceEvent(item: DashboardActivityItem) {
  return item.kind === "payment" || item.action === "COMMISSION_PAID" || item.action === "COMMISSION_PAYOUT_RECORDED";
}

/** Finance overview. Each KPI, chart, and queue checks its own module or operation grant. */
export function FinanceDashboard() {
  const granted = useEffectiveModuleIds();
  const range = useDashboardRange();
  const today = manilaToday();
  const canViewCollections = useOperation("finance.reports.view");
  const canVerify = useOperation("finance.verify");
  const canDecideCancellations = useOperation("finance.refund");
  const canReconcile = useOperation("finance.reconcile");
  const canAssign = useOperation("commission.approve");
  const canPayout = useOperation("commission.payout");
  const canActivate = useOperation("membership.activate");

  const hasFinance = granted.has("finance");
  const hasCommissions = granted.has("commissions");

  const payments = usePayments();
  const contracts = useContracts();
  const commissions = useCommissions();
  const memberships = useMemberships();
  const eligible = useEligibleSales(hasCommissions && canAssign);

  const dates = useMemo(() => (range.valid ? dateSpan(range.from, range.to) : []), [range.valid, range.from, range.to]);
  const daily = useMemo(() => dailyCollections(payments.data ?? [], dates), [payments.data, dates]);
  const collections = range.valid ? periodCollections(payments.data ?? [], range.from, range.to) : null;
  const receivables = useMemo(() => receivablesBreakdown(contracts.data ?? [], payments.data ?? [], today), [contracts.data, payments.data, today]);
  const payouts = useMemo(() => commissionPayoutSummary(commissions.data ?? [], today), [commissions.data, today]);
  const activity = useMemo(
    () => toActivityEntries(buildActivityFeed({ payments: payments.data, commissions: commissions.data }, 6, isFinanceEvent)),
    [payments.data, commissions.data],
  );
  const receivableRows: DistributionRow[] = RECEIVABLE_ROWS.map((row) => {
    const totals = receivables.rows.find((item) => item.state === row.state);
    return {
      key: row.state,
      label: row.label,
      count: totals?.count ?? 0,
      color: row.color,
      amountCentavos: row.state === "settled" ? undefined : (totals?.balanceCentavos ?? 0),
    };
  });

  const receivablesLoading = contracts.isLoading || payments.isLoading;
  const receivablesError = contracts.error ?? payments.error;
  const kpiCount = [hasFinance, canViewCollections, hasFinance, hasCommissions].filter(Boolean).length;
  const queues = {
    payments: hasFinance && canVerify,
    assignment: hasCommissions && canAssign,
    payouts: hasCommissions && canPayout,
    cancellations: hasFinance && canDecideCancellations,
    holds: hasFinance && canReconcile,
    activation: granted.has("membership") && canActivate,
  };
  const hasQueues = Object.values(queues).some(Boolean);

  return (
    <>
      <PageHeader
        title="Finance overview"
        description="Verified collections, receivables, commissions, and the Finance queues you can act on."
        actions={canViewCollections ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-5 tw:flex tw:flex-col tw:gap-6">
        {kpiCount > 0 ? (
          <DashboardKpiGrid columns={kpiCount}>
            {hasFinance ? (
              <DashboardKpiCard
                label="Pending payment verifications"
                value={countPendingPaymentVerifications(payments.data ?? []).toLocaleString()}
                icon={Wallet}
                tone="accent"
                scope={CURRENT_SCOPE}
                description="Submitted or under review"
                loading={payments.isLoading}
                error={payments.error}
              />
            ) : null}
            {canViewCollections ? (
              <DashboardKpiCard
                label="Verified collections"
                value={collections ? <Money value={collections.gross} /> : "—"}
                icon={Landmark}
                scope={periodScope(range)}
                description={
                  collections && collections.adjusted !== 0
                    ? `Net ${formatPeso(collections.net)} after reversals and refunds`
                    : "Gross, by Finance verification date"
                }
                loading={payments.isLoading}
                error={payments.error}
              />
            ) : null}
            {hasFinance ? (
              <DashboardKpiCard
                label="Outstanding receivables"
                value={<Money value={receivables.outstandingCentavos} />}
                icon={ReceiptText}
                tone="info"
                scope={CURRENT_SCOPE}
                description={
                  receivables.overdueCentavos > 0 ? `${formatPeso(receivables.overdueCentavos)} overdue` : "Finalized contracts, none overdue"
                }
                loading={receivablesLoading}
                error={receivablesError}
              />
            ) : null}
            {hasCommissions ? (
              <DashboardKpiCard
                label="Approved unpaid commissions"
                value={<Money value={payouts.approvedUnpaidCentavos} />}
                icon={Coins}
                tone="soft"
                scope={CURRENT_SCOPE}
                description={`${payouts.approvedCount} approved, ${payouts.awaitingConfirmation} awaiting disbursement confirmation`}
                loading={commissions.isLoading}
                error={commissions.error}
              />
            ) : null}
          </DashboardKpiGrid>
        ) : (
          <InfoNote title="No dashboard metrics">
            No Finance dashboard metrics are available for this account. Authorized modules remain available in the navigation.
          </InfoNote>
        )}

        <DashboardSplit
          primary={
            canViewCollections ? (
              <DashboardTrendChart
                title="Collections performance"
                description="Finance-verified collections, reversals and refunds, and net collections, each on its own event date."
                dates={dates}
                series={[
                  { key: "gross", label: "Verified collections", color: SERIES_COLORS.primary, values: daily.gross, area: true },
                  { key: "adjustments", label: "Reversals and refunds", color: SERIES_COLORS.secondary, values: daily.adjustments },
                  { key: "net", label: "Net collections", color: SERIES_COLORS.tertiary, values: daily.net },
                ]}
                loading={payments.isLoading}
                error={payments.error}
                invalidRange={!range.valid}
                emptyText="No verified collections, reversals, or refunds in this period."
              />
            ) : undefined
          }
          secondary={
            hasFinance ? (
              <DashboardDistributionChart
                title="Receivables overview"
                description="Finalized contracts by collection state (current). Amounts are remaining balances."
                rows={receivableRows}
                unit={["contract", "contracts"]}
                loading={receivablesLoading}
                error={receivablesError}
                emptyText="No finalized contracts yet."
              />
            ) : undefined
          }
        />

        <DashboardSplit
          at="lg"
          primary={
            hasFinance ? (
              <DashboardActivityList
                description="Latest payment events and commission payouts."
                items={activity}
                loading={payments.isLoading || commissions.isLoading}
                error={payments.error ?? commissions.error}
                emptyText="No recent Finance activity."
                viewAllHref="/admin/finance/payments"
              />
            ) : undefined
          }
          secondary={
            hasQueues ? (
              <DashboardPendingActions title="Pending Finance actions">
                {queues.payments ? (
                  <DashboardPendingItem
                    href="/admin/finance"
                    label="Payment Verification"
                    count={countPendingPaymentVerifications(payments.data ?? [])}
                    icon={Wallet}
                    tone="accent"
                    loading={payments.isLoading}
                    error={payments.error}
                  />
                ) : null}
                {queues.assignment ? (
                  <DashboardPendingItem
                    href="/admin/commissions/assignment"
                    label="Commission Assignment"
                    count={eligible.data?.length ?? 0}
                    icon={UserCheck}
                    loading={eligible.isLoading}
                    error={eligible.error}
                  />
                ) : null}
                {queues.payouts ? (
                  <DashboardPendingItem
                    href="/admin/commissions/payouts"
                    label="Commission Payouts"
                    count={payouts.ready + payouts.awaitingConfirmation}
                    icon={HandCoins}
                    tone="soft"
                    loading={commissions.isLoading}
                    error={commissions.error}
                  />
                ) : null}
                {queues.cancellations ? (
                  <DashboardPendingItem
                    href="/admin/finance/cancellations"
                    label="Cancellation Requests"
                    count={countCancellationRequests(contracts.data ?? [])}
                    icon={Ban}
                    tone="info"
                    loading={contracts.isLoading}
                    error={contracts.error}
                  />
                ) : null}
                {queues.holds ? (
                  <DashboardPendingItem
                    href="/admin/finance/holds"
                    label="Financial Holds"
                    count={countFinancialHolds(memberships.data ?? [])}
                    icon={ShieldAlert}
                    tone="accent"
                    loading={memberships.isLoading}
                    error={memberships.error}
                  />
                ) : null}
                {queues.activation ? (
                  <DashboardPendingItem
                    href="/admin/membership/activation"
                    label="Membership Activation"
                    count={countPendingMembershipActivations(memberships.data ?? [])}
                    icon={ListChecks}
                    tone="soft"
                    loading={memberships.isLoading}
                    error={memberships.error}
                  />
                ) : null}
              </DashboardPendingActions>
            ) : undefined
          }
        />
      </div>
    </>
  );
}
