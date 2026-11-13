"use client";

import { useMemo } from "react";
import { Ban, ChartColumn, Coins, HandCoins, Landmark, ListChecks, PieChart, ReceiptText, ShieldAlert, Wallet } from "lucide-react";
import { useEffectiveModuleIds } from "@/data/queries";
import { useCommissions, useContracts, useMemberships, useOperation, usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { Money } from "@/shared/components/modern/money";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart, type DistributionRow } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardHeader, DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";
import { DashboardTrendChart } from "@/shared/components/dashboard/dashboard-trend-chart";
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
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, periodTrend, toActivityEntries } from "./dashboard-presentation";

const RECEIVABLE_ROWS = [
  { state: "settled", label: "Settled", color: "var(--color-brand-primary)" },
  { state: "outstanding", label: "Outstanding, not overdue", color: "var(--color-accent-light)" },
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
  const { from, to, valid } = range;
  const today = manilaToday();
  const canViewCollections = useOperation("finance.reports.view");
  const canVerify = useOperation("finance.verify");
  const canDecideCancellations = useOperation("finance.refund");
  const canReconcile = useOperation("finance.reconcile");
  const canPayout = useOperation("commission.payout");
  const canActivate = useOperation("membership.activate");

  const hasFinance = granted.has("finance");
  const hasCommissions = granted.has("commissions");

  const payments = usePayments();
  const contracts = useContracts();
  const commissions = useCommissions();
  const memberships = useMemberships();

  const dates = useMemo(() => (valid ? dateSpan(from, to) : []), [valid, from, to]);
  const daily = useMemo(() => dailyCollections(payments.data ?? [], dates), [payments.data, dates]);
  const collections = valid ? periodCollections(payments.data ?? [], from, to) : null;
  const collectionsTrend = useMemo(
    () => (canViewCollections ? periodTrend({ from, to, valid }, (start, end) => periodCollections(payments.data ?? [], start, end).gross) : undefined),
    [canViewCollections, from, to, valid, payments.data],
  );
  const receivables = useMemo(() => receivablesBreakdown(contracts.data ?? [], payments.data ?? [], today), [contracts.data, payments.data, today]);
  const payouts = useMemo(() => commissionPayoutSummary(commissions.data ?? [], today), [commissions.data, today]);
  const activity = useMemo(
    () => toActivityEntries(buildActivityFeed({ payments: payments.data, commissions: commissions.data }, 5, isFinanceEvent)),
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
    payouts: hasCommissions && canPayout,
    cancellations: hasFinance && canDecideCancellations,
    holds: hasFinance && canReconcile,
    activation: granted.has("membership") && canActivate,
  };
  const hasQueues = Object.values(queues).some(Boolean);

  return (
    <>
      <DashboardHeader
        title="Finance overview"
        description="Verified collections, receivables, commissions, and the Finance queues you can act on."
        actions={canViewCollections ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-6">
        {kpiCount > 0 ? (
          <DashboardKpiGrid columns={kpiCount}>
            {hasFinance ? (
              <DashboardKpiCard
                label="Pending payment verifications"
                value={countPendingPaymentVerifications(payments.data ?? []).toLocaleString()}
                icon={Wallet}
                tone="accent"
                scope={CURRENT_SCOPE}
                loading={payments.isLoading}
                error={payments.error}
              />
            ) : null}
            {canViewCollections ? (
              <DashboardKpiCard
                label="Verified collections"
                value={collections ? <Money value={collections.gross} /> : "—"}
                icon={Landmark}
                tone="brand"
                scope={periodScope(range)}
                trend={collectionsTrend}
                description={collections && collections.adjusted !== 0 ? `Net ${formatPeso(collections.net)} after reversals and refunds` : undefined}
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
                description={receivables.overdueCentavos > 0 ? `${formatPeso(receivables.overdueCentavos)} overdue` : undefined}
                loading={receivablesLoading}
                error={receivablesError}
              />
            ) : null}
            {hasCommissions ? (
              <DashboardKpiCard
                label="Approved unpaid commissions"
                value={<Money value={payouts.approvedUnpaidCentavos} />}
                icon={Coins}
                tone="violet"
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
                title="Collections Performance"
                description="Finance-verified collections, reversals and refunds, and net collections, each on its own event date."
                icon={ChartColumn}
                dates={dates}
                series={[
                  { key: "gross", label: "Verified", color: SERIES_COLORS.primary, values: daily.gross, emptyText: "No verified collections in this period." },
                  { key: "adjustments", label: "Reversals & refunds", color: SERIES_COLORS.secondary, values: daily.adjustments, emptyText: "No reversals or refunds in this period." },
                  { key: "net", label: "Net", color: SERIES_COLORS.tertiary, values: daily.net, emptyText: "No net collections in this period." },
                ]}
                loading={payments.isLoading}
                error={payments.error}
                invalidRange={!valid}
                emptyText="No verified collections, reversals, or refunds in this period."
              />
            ) : undefined
          }
          secondary={
            hasFinance ? (
              <DashboardDistributionChart
                title="Receivables Overview"
                description="Finalized contracts by collection state (current). Amounts are remaining balances."
                icon={PieChart}
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
          ratio="1-1"
          primary={
            hasFinance ? (
              <DashboardActivityList
                description="Latest payment events and commission payouts"
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
              <DashboardPendingActions>
                {queues.payments ? (
                  <DashboardPendingItem
                    href="/admin/finance"
                    label="Payment Verification"
                    count={countPendingPaymentVerifications(payments.data ?? [])}
                    icon={Wallet}
                    tone="info"
                    loading={payments.isLoading}
                    error={payments.error}
                  />
                ) : null}
                {queues.payouts ? (
                  <DashboardPendingItem
                    href="/admin/commissions/payouts"
                    label="Commission Payouts"
                    count={payouts.ready + payouts.awaitingConfirmation}
                    icon={HandCoins}
                    tone="violet"
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
                    tone="accent"
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
                    tone="brand"
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
