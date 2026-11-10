"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChartColumn, Coins, FilePenLine, Hourglass, Layers, UserPen, UserPlus, UsersRound } from "lucide-react";
import { useCustomers, useEffectiveModuleIds, useMembers, useMockRepositories } from "@/data/queries";
import { useContracts, useOperation, useSales } from "@/data/business-queries";
import type { DevIdentity } from "@/modules/identity/types";
import { confirmedCountInPeriod, confirmedValueInPeriod, mySales, snapshotCounts, teamSales } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { DashboardActivityList } from "@/shared/components/dashboard/dashboard-activity-list";
import { DashboardDateFilter, useDashboardRange } from "@/shared/components/dashboard/dashboard-date-filter";
import { DashboardDistributionChart } from "@/shared/components/dashboard/dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "@/shared/components/dashboard/dashboard-kpi";
import { DashboardHeader, DashboardSplit } from "@/shared/components/dashboard/dashboard-layout";
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
import { CURRENT_SCOPE, SERIES_COLORS, periodScope, periodTrend, tierRows, toActivityEntries } from "./dashboard-presentation";
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
  const { from, to, valid } = range;
  const dates = useMemo(() => (valid ? dateSpan(from, to) : []), [valid, from, to]);
  const series = useMemo(() => {
    const list: TrendSeries[] = [
      { key: "mine", label: "My sales", color: SERIES_COLORS.primary, values: dailyConfirmedSales(mine, dates), emptyText: "You have no confirmed sales in this period." },
    ];
    if (isManager) {
      list.push({ key: "team", label: "Team sales", color: SERIES_COLORS.secondary, values: dailyConfirmedSales(team, dates), emptyText: "Your team has no confirmed sales in this period." });
    }
    return list;
  }, [mine, team, dates, isManager]);
  const trends = useMemo(() => {
    const period = { from, to, valid };
    return {
      mine: periodTrend(period, (start, end) => confirmedValueInPeriod(mine, start, end)),
      team: periodTrend(period, (start, end) => confirmedValueInPeriod(team, start, end)),
      count: periodTrend(period, (start, end) => confirmedCountInPeriod(team, start, end)),
    };
  }, [from, to, valid, mine, team]);
  const tiers = useMemo(() => tierRows(confirmedSalesTierDistribution(team).rows), [team]);
  const activity = useMemo(
    () =>
      toActivityEntries(
        buildActivityFeed({ customers: canSeeCustomers ? customers.data : [], contracts: contracts.data, sales: team }, 3),
      ),
    [canSeeCustomers, customers.data, contracts.data, team],
  );
  const contributions = useMemo(
    () => (isManager && valid ? teamContributions(members.data ?? [], memberId, sales.data ?? [], from, to) : []),
    [isManager, valid, from, to, members.data, memberId, sales.data],
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
      <DashboardHeader
        title={`Welcome back, ${role ? getSystemRoleLabel(role) : "Sales Network"}`}
        description={isManager ? "Here's an overview of your sales and your authorized team's performance." : "Here's an overview of your personal sales performance."}
        actions={canSeeSales ? <DashboardDateFilter range={range} /> : undefined}
      />

      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-6">
        {canSeeSales ? (
          <DashboardKpiGrid columns={4}>
            <DashboardKpiCard
              label="My confirmed sales value"
              value={valid ? <Money value={confirmedValueInPeriod(mine, from, to)} /> : "—"}
              icon={Coins}
              tone="brand"
              scope={periodScope(range)}
              trend={trends.mine}
              loading={sales.isLoading}
              error={sales.error}
            />
            {isManager ? (
              <DashboardKpiCard
                label="Team confirmed sales value"
                value={valid ? <Money value={confirmedValueInPeriod(team, from, to)} /> : "—"}
                icon={UsersRound}
                tone="info"
                scope={periodScope(range)}
                trend={trends.team}
                description="Your own plus authorized downline, each sale once"
                loading={sales.isLoading}
                error={sales.error}
              />
            ) : (
              <DashboardKpiCard
                label="My customers"
                value={canSeeCustomers ? countVisibleCustomers(customers.data ?? []).toLocaleString() : "—"}
                icon={UserPlus}
                tone="info"
                scope={CURRENT_SCOPE}
                loading={customers.isLoading}
                error={customers.error}
              />
            )}
            <DashboardKpiCard
              label="Confirmed sales"
              value={valid ? confirmedCountInPeriod(team, from, to).toLocaleString() : "—"}
              icon={BadgeCheck}
              tone="violet"
              scope={periodScope(range)}
              trend={trends.count}
              description={`Distinct ${scopeNoun} sales`}
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
                title="Sales Performance"
                description={
                  isManager
                    ? "Confirmed sales value by Finance confirmation date. Team sales include your own."
                    : "Your confirmed sales value by Finance confirmation date."
                }
                icon={ChartColumn}
                dates={dates}
                series={series}
                loading={sales.isLoading}
                error={sales.error}
                invalidRange={!valid}
                emptyText="No confirmed sales in this period."
              />
            }
            secondary={
              <DashboardDistributionChart
                title="Sales by VIP Product"
                description={`Currently confirmed ${scopeNoun} sales (current).`}
                icon={Layers}
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
          ratio="1-1"
          primary={
            <DashboardActivityList
              description="Latest customer, contract, and sale updates in your scope"
              items={activity}
              loading={sales.isLoading || contracts.isLoading || (canSeeCustomers && customers.isLoading)}
              error={sales.error ?? contracts.error ?? (canSeeCustomers ? customers.error : null)}
              emptyText="No recent sales activity."
              viewAllHref={canSeeSales ? "/admin/sales" : undefined}
            />
          }
          secondary={
            showReturned || showDrafts ? (
              <DashboardPendingActions title="Needs Your Attention" description="Your records waiting on you">
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
