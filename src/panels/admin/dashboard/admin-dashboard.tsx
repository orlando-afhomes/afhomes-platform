"use client";

import { useMemo } from "react";
import { BadgeDollarSign, ClipboardCheck, Contact, ListChecks, Users, Wallet } from "lucide-react";
import { useCustomers, useEffectiveModuleIds, useMembers } from "@/data/queries";
import { useContracts, useMemberships, useOperation, usePayments, useSales } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { confirmedValueInPeriod } from "@/modules/sales/rules";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Money } from "@/shared/components/modern/money";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { compactPeso } from "@/shared/components/dashboard/dashboard-chart-model";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";
import { DashboardTrendChart, type TrendSeries } from "@/shared/components/dashboard/dashboard-trend-chart";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { getRoleDisplayLabel } from "../role-label";
import {
  buildActivityFeed,
  contractTierDistribution,
  countPendingContractReviews,
  countPendingMembershipActivations,
  countPendingPaymentVerifications,
  countVisibleCustomers,
  countVisibleMembers,
  dailyCollections,
  dailyConfirmedSales,
  dateSpan,
} from "../dashboard-metrics";
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, tierRows, toActivityEntries } from "./dashboard-presentation";

/** Super Administrator and Administrator overview. Each widget checks its own grant. */
export function AdminDashboard({ roles }: { roles: string[] }) {
  const granted = useEffectiveModuleIds();
  const range = useDashboardRange();
  const canReadAudit = useOperation("audit.read");
  const canApproveContracts = useOperation("contracts.approve");
  const canViewCollections = useOperation("finance.reports.view");
  const canActivate = useOperation("membership.activate");
  const canVerifyPayments = useOperation("finance.verify");

  const canSeeCustomers = granted.has("customers");
  const canSeeMembers = granted.has("sales-network");
  const canSeeSales = granted.has("sales");
  const canSeeContracts = granted.has("vip-products") || canSeeSales;
  const canReview = granted.has("vip-products") && canApproveContracts;
  const canSeePaymentQueue = granted.has("finance") && canVerifyPayments;
  const canSeeActivation = granted.has("membership") && canActivate;
  const canSeeActivity = canSeeContracts || granted.has("finance");

  const customers = useCustomers();
  const members = useMembers();
  const contracts = useContracts();
  const sales = useSales();
  const payments = usePayments();
  const memberships = useMemberships();

  const dates = useMemo(() => (range.valid ? dateSpan(range.from, range.to) : []), [range.valid, range.from, range.to]);
  const series = useMemo(() => {
    const list: TrendSeries[] = [];
    if (canSeeSales) {
      list.push({ key: "sales", label: "Confirmed sales value", color: SERIES_COLORS.primary, values: dailyConfirmedSales(sales.data ?? [], dates), area: true });
    }
    if (canViewCollections) {
      list.push({ key: "collections", label: "Verified collections", color: SERIES_COLORS.secondary, values: dailyCollections(payments.data ?? [], dates).gross });
    }
    return list;
  }, [canSeeSales, canViewCollections, sales.data, payments.data, dates]);
  const adjusted = canViewCollections && range.valid ? periodCollections(payments.data ?? [], range.from, range.to).adjusted : 0;
  const tiers = useMemo(() => tierRows(contractTierDistribution(contracts.data ?? []).rows), [contracts.data]);
  const activity = useMemo(
    () =>
      toActivityEntries(
        buildActivityFeed({
          customers: canSeeCustomers ? customers.data : [],
          contracts: contracts.data,
          payments: payments.data,
          memberships: memberships.data,
        }),
      ),
    [canSeeCustomers, customers.data, contracts.data, payments.data, memberships.data],
  );

  const kpiCount = [canSeeCustomers, canSeeMembers, canReview, canSeeSales].filter(Boolean).length;
  const hasQueues = canReview || canSeePaymentQueue || canSeeActivation;
  const chartLoading = (canSeeSales && sales.isLoading) || (canViewCollections && payments.isLoading);
  const chartError = (canSeeSales ? sales.error : null) ?? (canViewCollections ? payments.error : null);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${getRoleDisplayLabel(roles)}`}
        description="An overview of your sales network, contracts, and operations."
        actions={series.length > 0 ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-5 tw:flex tw:flex-col tw:gap-6">
        {kpiCount > 0 ? (
          <DashboardKpiGrid columns={kpiCount}>
            {canSeeCustomers ? (
              <DashboardKpiCard
                label="Customers"
                value={countVisibleCustomers(customers.data ?? []).toLocaleString()}
                icon={Contact}
                tone="info"
                scope={CURRENT_SCOPE}
                description="Visible to your role"
                loading={customers.isLoading}
                error={customers.error}
              />
            ) : null}
            {canSeeMembers ? (
              <DashboardKpiCard
                label="Sales network members"
                value={countVisibleMembers(members.data ?? []).toLocaleString()}
                icon={Users}
                scope={CURRENT_SCOPE}
                description="Visible to your role"
                loading={members.isLoading}
                error={members.error}
              />
            ) : null}
            {canReview ? (
              <DashboardKpiCard
                label="Contracts requiring review"
                value={countPendingContractReviews(contracts.data ?? []).toLocaleString()}
                icon={ClipboardCheck}
                tone="accent"
                scope={CURRENT_SCOPE}
                description="Submitted or under review"
                loading={contracts.isLoading}
                error={contracts.error}
              />
            ) : null}
            {canSeeSales ? (
              <DashboardKpiCard
                label="Confirmed sales value"
                value={range.valid ? <Money value={confirmedValueInPeriod(sales.data ?? [], range.from, range.to)} /> : "—"}
                icon={BadgeDollarSign}
                tone="soft"
                scope={periodScope(range)}
                description="By Finance confirmation date"
                loading={sales.isLoading}
                error={sales.error}
              />
            ) : null}
          </DashboardKpiGrid>
        ) : (
          <InfoNote title="No dashboard metrics">
            No operational dashboard metrics are available for this role. Authorized modules remain available in the navigation.
          </InfoNote>
        )}

        <DashboardSplit
          primary={
            series.length > 0 ? (
              <DashboardTrendChart
                title="Sales performance"
                description={
                  canViewCollections && canSeeSales
                    ? "Confirmed sales value and verified collections over time. They are separate measures and are never added together."
                    : canSeeSales
                      ? "Confirmed sales value over time, by Finance confirmation date."
                      : "Verified collections over time, by verification date."
                }
                dates={dates}
                series={series}
                loading={chartLoading}
                error={chartError}
                invalidRange={!range.valid}
                emptyText="No confirmed sales or verified collections in this period."
                note={adjusted > 0 ? `Collections are gross; reversals and refunds of ${compactPeso(adjusted)} are reported separately.` : undefined}
              />
            ) : undefined
          }
          secondary={
            canSeeContracts ? (
              <DashboardDistributionChart
                title="Contracts by VIP product"
                description="Visible contracts, cancelled excluded (current)."
                rows={tiers}
                unit={["contract", "contracts"]}
                loading={contracts.isLoading}
                error={contracts.error}
                emptyText="No contracts are visible for your role."
              />
            ) : undefined
          }
        />

        <DashboardSplit
          at="lg"
          primary={
            canSeeActivity ? (
              <DashboardActivityList
                description="Latest customer, contract, payment, and membership events you can access."
                items={activity}
                loading={contracts.isLoading || payments.isLoading || memberships.isLoading || (canSeeCustomers && customers.isLoading)}
                error={contracts.error ?? payments.error ?? memberships.error ?? (canSeeCustomers ? customers.error : null)}
                emptyText="No recent activity is visible for your role."
                viewAllHref={canReadAudit && granted.has("audit-logs") ? "/admin/audit-logs" : undefined}
              />
            ) : undefined
          }
          secondary={
            hasQueues ? (
              <DashboardPendingActions>
                {canReview ? (
                  <DashboardPendingItem
                    href="/admin/sales/contract-review"
                    label="Contract Review"
                    count={countPendingContractReviews(contracts.data ?? [])}
                    icon={ClipboardCheck}
                    loading={contracts.isLoading}
                    error={contracts.error}
                  />
                ) : null}
                {canSeePaymentQueue ? (
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
                {canSeeActivation ? (
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
