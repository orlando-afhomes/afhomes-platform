"use client";

import Link from "next/link";
import { ArrowRight, Network } from "lucide-react";
import type { UplineSummary } from "@/data/contracts/member-repository";
import type { OrgMember } from "@/modules/organization/types";
import { aaDisplay, teamDisplayName } from "@/modules/sales-network/display";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { DashboardCard, DashboardEmptyState, DashboardError } from "@/shared/components/dashboard/dashboard-layout";
import { CardGridSkeleton } from "@/shared/components/modern/skeletons";
import type { TeamContribution } from "../dashboard-metrics";

const LINK_CLASS =
  "tw:inline-flex tw:min-h-11 tw:items-center tw:gap-1 tw:whitespace-nowrap tw:rounded-md tw:text-sm tw:font-medium tw:text-primary tw:underline-offset-4 tw:hover:underline tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-8";

function SubHeading({ children }: { children: string }) {
  return <h3 className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-foreground">{children}</h3>;
}

/**
 * Account context, authorized upline, and (for managers) the direct downline's
 * confirmed sales in the period. No commission or customer contact data is shown.
 */
export function SalesTeamOverview({
  currentMember,
  members,
  uplines,
  contributions,
  showTeam,
  periodLabel,
  loading,
  error,
  links,
}: {
  currentMember: OrgMember | null;
  members: readonly OrgMember[];
  uplines: readonly UplineSummary[];
  contributions: readonly TeamContribution[];
  showTeam: boolean;
  periodLabel: string;
  loading: boolean;
  error: unknown;
  links: { members: boolean; genealogy: boolean };
}) {
  const actions =
    links.members || links.genealogy ? (
      <span className="tw:flex tw:flex-wrap tw:gap-x-4">
        {links.members ? (
          <Link href="/admin/sales-network/members" className={LINK_CLASS}>
            Members
            <ArrowRight aria-hidden="true" className="tw:size-3.5" />
          </Link>
        ) : null}
        {links.genealogy ? (
          <Link href="/admin/sales-network/genealogy" className={LINK_CLASS}>
            Genealogy
            <ArrowRight aria-hidden="true" className="tw:size-3.5" />
          </Link>
        ) : null}
      </span>
    ) : undefined;

  return (
    <DashboardCard
      icon={Network}
      title={showTeam ? "Team overview" : "Account overview"}
      description={showTeam ? "Your account, authorized upline, and direct downline." : "Your account and authorized upline."}
      actions={actions}
    >
      {loading ? (
        <CardGridSkeleton cards={2} className="tw:lg:grid-cols-2" />
      ) : error ? (
        <DashboardError error={error} fallback="Could not load your sales network." />
      ) : (
        <div className="tw:grid tw:gap-6 tw:md:grid-cols-2">
          <div className="tw:min-w-0">
            <SubHeading>Account</SubHeading>
            {currentMember ? (
              <DetailList>
                <DetailRow term="Name">{currentMember.displayName}</DetailRow>
                <DetailRow term="Designation">
                  <DesignationBadge designation={currentMember.designation} full />
                </DetailRow>
                <DetailRow term="Team">{teamDisplayName(currentMember, members)}</DetailRow>
                <DetailRow term="AA Number">{aaDisplay(currentMember)}</DetailRow>
              </DetailList>
            ) : (
              <DashboardEmptyState>No account context is available.</DashboardEmptyState>
            )}
          </div>

          <div className="tw:min-w-0">
            <SubHeading>Authorized upline</SubHeading>
            {uplines.length === 0 ? (
              <DashboardEmptyState>No upline members.</DashboardEmptyState>
            ) : (
              <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
                {uplines.map((upline) => (
                  <li key={upline.id} className="tw:flex tw:items-center tw:justify-between tw:gap-2 tw:py-2 tw:text-sm">
                    <span className="tw:min-w-0 tw:truncate">{upline.displayName}</span>
                    <DesignationBadge designation={upline.designation} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showTeam ? (
            <div className="tw:min-w-0 tw:md:col-span-2">
              <SubHeading>{`Direct downline · confirmed sales, ${periodLabel}`}</SubHeading>
              {contributions.length === 0 ? (
                <DashboardEmptyState>No direct downline members.</DashboardEmptyState>
              ) : (
                <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
                  {contributions.map((row) => (
                    <li key={row.member.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:py-2 tw:text-sm">
                      <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
                        <span className="tw:truncate">{row.member.displayName}</span>
                        <DesignationBadge designation={row.member.designation} />
                      </span>
                      <Money value={row.confirmedCentavos} className="tw:font-semibold tw:tabular-nums" />
                    </li>
                  ))}
                </ul>
              )}
              <p className="tw:mt-2 tw:text-xs tw:text-muted-foreground">
                Each figure includes the member&apos;s own and downline sales, credited to the team recorded on each sale.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </DashboardCard>
  );
}
