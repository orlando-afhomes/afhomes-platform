"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BadgeDollarSign, Contact, FilePenLine, Hourglass, UserPen, UsersRound } from "lucide-react";
import { useCustomers, useEffectiveModuleIds, useMembers, useMockRepositories } from "@/data/queries";
import { useContracts, useOperation, useSales } from "@/data/business-queries";
import type { DevIdentity } from "@/modules/identity/types";
import { confirmedCountInPeriod, confirmedValueInPeriod, mySales, snapshotCounts, teamSales } from "@/modules/sales/rules";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Money } from "@/shared/components/modern/money";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";
import { DashboardTrendChart, type TrendSeries } from "@/shared/components/dashboard/dashboard-trend-chart";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { getSystemRoleLabel } from "../role-label";
import {
  buildActivityFeed,
  confirmedSalesTierDistribution,
  countCustomerDrafts,
  countReturnedContracts,
  countVisibleCustomers,
  dailyConfirmedSales,
  dateSpan,
  teamContributions,
} from "../dashboard-metrics";
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, tierRows, toActivityEntries } from "./dashboard-presentation";
import { primarySalesRole } from "./resolve-dashboard";
import { SalesTeamOverview } from "./sales-team-overview";

/**
 * Sales Network overview for SVD, SSM, SM and OST. Repositories already scope
 * every list to the member's recording-time team; managers additionally get
 * team figures, while an OST sees only their own sales.
 */
export function SalesDashboard({ identity }: { identity: DevIdentity }) {
  const granted = useEffectiveModuleIds();
  const range = useDashboardRange();
  const isManager = useOperation("sales.viewTeam");
  const canPrepareContracts = useOperation("contracts.prepare");
  const canManageCustomers = useOperation("customers.manage");

  const canSeeSales = granted.has("sales");
  const canSeeCustomers = granted.has("customers");
  const canSeeNetwork = granted.has("sales-network");

  const sales = useSales();
  const contracts = useContracts();
  const customers = useCustomers();
  const members = useMembers();
  const repositories = useMockRepositories();
  const uplines = useQuery({
    queryKey: ["uplines", identity.id],
    queryFn: () => repositories.members.listUplineSummaries(),
  });

  const memberId = identity.memberId;
  const mine = useMemo(() => mySales(sales.data ?? [], memberId), [sales.data, memberId]);
  const team = useMemo(() => (isManager ? teamSales(sales.data ?? [], memberId) : mine), [isManager, sales.data, memberId, mine]);
  const counts = snapshotCounts(team);
  const dates = useMemo(() => (range.valid ? dateSpan(range.from, range.to) : []), [range.valid, range.from, range.to]);
  const series = useMemo(() => {
    const list: TrendSeries[] = [{ key: "mine", label: "My sales", color: SERIES_COLORS.primary, values: dailyConfirmedSales(mine, dates), area: true }];
    if (isManager) list.push({ key: "team", label: "Team sales", color: SERIES_COLORS.secondary, values: dailyConfirmedSales(team, dates) });
    return list;
  }, [mine, team, dates, isManager]);
  const tiers = useMemo(() => tierRows(confirmedSalesTierDistribution(team).rows), [team]);
  const activity = useMemo(
    () =>
      toActivityEntries(
        buildActivityFeed({ customers: canSeeCustomers ? customers.data : [], contracts: contracts.data, sales: team }),
      ),
    [canSeeCustomers, customers.data, contracts.data, team],
  );
  const contributions = useMemo(
    () => (isManager && range.valid ? teamContributions(members.data ?? [], memberId, sales.data ?? [], range.from, range.to) : []),
    [isManager, range.valid, range.from, range.to, members.data, memberId, sales.data],
  );
  const currentMember = (members.data ?? []).find((member) => member.id === memberId) ?? null;
  // Only the member's own records wait on them; downline records are visible but not theirs to correct.
  const ownReturned = countReturnedContracts((contracts.data ?? []).filter((contract) => memberId !== null && contract.sellerMemberId === memberId));
  const ownDrafts = countCustomerDrafts((customers.data ?? []).filter((customer) => memberId !== null && customer.ownerMemberId === memberId));

  const role = primarySalesRole(identity);
  const scopeNoun = isManager ? "team" : "own";
  const showReturned = canSeeSales && canPrepareContracts;
  const showDrafts = canSeeCustomers && canManageCustomers;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${role ? getSystemRoleLabel(role) : "Sales Network"}`}
        description={isManager ? "Your sales and your authorized team's performance." : "Your personal sales performance."}
        actions={canSeeSales ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-5 tw:flex tw:flex-col tw:gap-6">
        {canSeeSales ? (
          <DashboardKpiGrid columns={4}>
            <DashboardKpiCard
              label="My confirmed sales value"
              value={range.valid ? <Money value={confirmedValueInPeriod(mine, range.from, range.to)} /> : "—"}
              icon={BadgeDollarSign}
              scope={periodScope(range)}
              description="Sales you recorded, by Finance confirmation date"
              loading={sales.isLoading}
              error={sales.error}
            />
            {isManager ? (
              <DashboardKpiCard
                label="Team confirmed sales value"
                value={range.valid ? <Money value={confirmedValueInPeriod(team, range.from, range.to)} /> : "—"}
                icon={UsersRound}
                tone="accent"
                scope={periodScope(range)}
                description="Your own plus authorized downline, each sale once"
                loading={sales.isLoading}
                error={sales.error}
              />
            ) : (
              <DashboardKpiCard
                label="My customers"
                value={canSeeCustomers ? countVisibleCustomers(customers.data ?? []).toLocaleString() : "—"}
                icon={Contact}
                tone="info"
                scope={CURRENT_SCOPE}
                description="Customers you own"
                loading={customers.isLoading}
                error={customers.error}
              />
            )}
            <DashboardKpiCard
              label="Confirmed sales"
              value={range.valid ? confirmedCountInPeriod(team, range.from, range.to).toLocaleString() : "—"}
              icon={BadgeCheck}
              tone="soft"
              scope={periodScope(range)}
              description={`Distinct ${scopeNoun} sales confirmed in the period`}
              loading={sales.isLoading}
              error={sales.error}
            />
            <DashboardKpiCard
              label="Pending sales"
              value={counts.pending.toLocaleString()}
              icon={Hourglass}
              tone="accent"
              scope={CURRENT_SCOPE}
              description={`Awaiting confirmation; ${counts.overall.toLocaleString()} recorded in total`}
              loading={sales.isLoading}
              error={sales.error}
            />
          </DashboardKpiGrid>
        ) : (
          <InfoNote title="No sales metrics">Sales figures are not available for this account.</InfoNote>
        )}

        {canSeeSales ? (
          <DashboardSplit
            primary={
              <DashboardTrendChart
                title="Sales performance trend"
                description={
                  isManager
                    ? "Confirmed sales value by Finance confirmation date. Team sales include your own sales."
                    : "Your confirmed sales value by Finance confirmation date."
                }
                dates={dates}
                series={series}
                loading={sales.isLoading}
                error={sales.error}
                invalidRange={!range.valid}
                emptyText="No confirmed sales in this period."
              />
            }
            secondary={
              <DashboardDistributionChart
                title="Confirmed sales by VIP product"
                description={`Currently confirmed ${scopeNoun} sales (current).`}
                rows={tiers}
                unit={["sale", "sales"]}
                loading={sales.isLoading}
                error={sales.error}
                emptyText="No confirmed sales yet."
              />
            }
          />
        ) : null}

        <DashboardSplit
          at="lg"
          primary={
            <DashboardActivityList
              title="Sales activity"
              description="Latest customer submissions, contract updates, and sale confirmations in your scope."
              items={activity}
              loading={sales.isLoading || contracts.isLoading || (canSeeCustomers && customers.isLoading)}
              error={sales.error ?? contracts.error ?? (canSeeCustomers ? customers.error : null)}
              emptyText="No recent sales activity."
              viewAllHref={canSeeSales ? "/admin/sales" : undefined}
            />
          }
          secondary={
            showReturned || showDrafts ? (
              <DashboardPendingActions title="Needs your attention" description="Records waiting on you.">
                {showReturned ? (
                  <DashboardPendingItem
                    href="/admin/sales/contracts"
                    label="My returned contracts"
                    count={ownReturned}
                    icon={FilePenLine}
                    tone="accent"
                    loading={contracts.isLoading}
                    error={contracts.error}
                  />
                ) : null}
                {showDrafts ? (
                  <DashboardPendingItem
                    href="/admin/customers"
                    label="My customer drafts"
                    count={ownDrafts}
                    icon={UserPen}
                    tone="info"
                    loading={customers.isLoading}
                    error={customers.error}
                  />
                ) : null}
              </DashboardPendingActions>
            ) : undefined
          }
        />

        {canSeeNetwork ? (
          <SalesTeamOverview
            currentMember={currentMember}
            members={members.data ?? []}
            uplines={uplines.data ?? []}
            contributions={contributions}
            showTeam={isManager}
            periodLabel={periodScope(range).toLowerCase()}
            loading={members.isLoading || uplines.isLoading}
            error={members.error ?? uplines.error}
            links={{ members: granted.has("sales-network-members"), genealogy: granted.has("sales-network-genealogy") }}
          />
        ) : null}
      </div>
    </>
  );
}
