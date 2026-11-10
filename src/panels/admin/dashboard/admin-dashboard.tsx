"use client";

import { useMemo } from "react";
import { ChartColumn, ClipboardCheck, Coins, FileText, Layers, ListChecks, UserPlus, Users, Wallet } from "lucide-react";
import { useCustomers, useEffectiveModuleIds, useMembers } from "@/data/queries";
import { useContracts, useMemberships, useOperation, usePayments, useSales } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { confirmedValueInPeriod } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { compactPeso } from "@/shared/components/dashboard/dashboard-chart-model";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardHeader, DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";
import { DashboardTrendChart, type TrendSeries } from "@/shared/components/dashboard/dashboard-trend-chart";
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
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, periodTrend, tierRows, toActivityEntries } from "./dashboard-presentation";

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
      list.push({
        key: "sales",
        label: "Sales",
        color: SERIES_COLORS.primary,
        values: dailyConfirmedSales(sales.data ?? [], dates),
        emptyText: "No confirmed sales in this period.",
      });
    }
    if (canViewCollections) {
      list.push({
        key: "collections",
        label: "Collections",
        color: SERIES_COLORS.secondary,
        values: dailyCollections(payments.data ?? [], dates).gross,
        emptyText: "No verified collections in this period.",
      });
    }
    return list;
  }, [canSeeSales, canViewCollections, sales.data, payments.data, dates]);
  const { from, to, valid } = range;
  const salesTrend = useMemo(
    () => (canSeeSales ? periodTrend({ from, to, valid }, (start, end) => confirmedValueInPeriod(sales.data ?? [], start, end)) : undefined),
    [canSeeSales, from, to, valid, sales.data],
  );
  const adjusted = canViewCollections && range.valid ? periodCollections(payments.data ?? [], range.from, range.to).adjusted : 0;
  const tiers = useMemo(() => tierRows(contractTierDistribution(contracts.data ?? []).rows), [contracts.data]);
  const activity = useMemo(
    () =>
      toActivityEntries(
        buildActivityFeed(
          {
            customers: canSeeCustomers ? customers.data : [],
            contracts: contracts.data,
            payments: payments.data,
            memberships: memberships.data,
          },
          3,
        ),
      ),
    [canSeeCustomers, customers.data, contracts.data, payments.data, memberships.data],
  );

  const kpiCount = [canSeeCustomers, canSeeMembers, canReview, canSeeSales].filter(Boolean).length;
  const hasQueues = canReview || canSeePaymentQueue || canSeeActivation;
  const chartLoading = (canSeeSales && sales.isLoading) || (canViewCollections && payments.isLoading);
  const chartError = (canSeeSales ? sales.error : null) ?? (canViewCollections ? payments.error : null);

  return (
    <>
      <DashboardHeader
        title={`Welcome back, ${getRoleDisplayLabel(roles)}`}
        description="Here's an overview of your organization, sales network, and operations."
        actions={series.length > 0 ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-6">
        {kpiCount > 0 ? (
          <DashboardKpiGrid columns={kpiCount}>
            {canSeeMembers ? (
              <DashboardKpiCard
                label="Sales network members"
                value={countVisibleMembers(members.data ?? []).toLocaleString()}
                icon={Users}
                tone="brand"
                scope={CURRENT_SCOPE}
                loading={members.isLoading}
                error={members.error}
              />
            ) : null}
            {canSeeCustomers ? (
              <DashboardKpiCard
                label="Customers"
                value={countVisibleCustomers(customers.data ?? []).toLocaleString()}
                icon={UserPlus}
                tone="info"
                scope={CURRENT_SCOPE}
                loading={customers.isLoading}
                error={customers.error}
              />
            ) : null}
            {canReview ? (
              <DashboardKpiCard
                label="Contracts requiring review"
                value={countPendingContractReviews(contracts.data ?? []).toLocaleString()}
                icon={FileText}
                tone="accent"
                scope={CURRENT_SCOPE}
                loading={contracts.isLoading}
                error={contracts.error}
              />
            ) : null}
            {canSeeSales ? (
              <DashboardKpiCard
                label="Confirmed sales value"
                value={range.valid ? <Money value={confirmedValueInPeriod(sales.data ?? [], range.from, range.to)} /> : "—"}
                icon={Coins}
                tone="violet"
                scope={periodScope(range)}
                trend={salesTrend}
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
                title="Sales Performance"
                description={
                  series.length > 1
                    ? "Confirmed sales value or verified collections over time"
                    : "Confirmed sales value over time, by Finance confirmation date."
                }
                icon={ChartColumn}
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
                title="Contracts by VIP Product"
                description="Distribution of visible contracts, cancelled excluded (current)."
                icon={Layers}
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
          ratio="1-1"
          primary={
            canSeeActivity ? (
              <DashboardActivityList
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
                    tone="accent"
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
                    tone="info"
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
