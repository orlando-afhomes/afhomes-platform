"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact, Network, Users } from "lucide-react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers, useMockRepositories } from "@/data/queries";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { CardGridSkeleton } from "@/shared/components/modern/skeletons";
import { AdminSection } from "@/shared/components/admin";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin/admin-stat";
import { countVisibleCustomers, countVisibleMembers, countUplines } from "../dashboard-metrics";
import { getSystemRoleLabel } from "../role-label";
import { aaDisplay, teamDisplayName } from "@/modules/sales-network/display";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { humanize } from "@/shared/lib/humanize";

function roleTitle(roles: string[]) {
  const label = getSystemRoleLabel(roles.find((role) => ["svd", "ssm", "sm", "ost"].includes(role)) ?? "");
  return label === "" ? "Sales Network" : label;
}

function Card({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <AdminSection title={title} className={className}>
      {children}
    </AdminSection>
  );
}

export function SalesNetworkPanel() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const customersQuery = useCustomers();
  const repositories = useMockRepositories();
  const uplinesQuery = useQuery({
    queryKey: ["uplines", identity.id],
    queryFn: () => repositories.members.listUplineSummaries(),
  });

  const members = membersQuery.data ?? [];
  const uplines = uplinesQuery.data ?? [];
  const currentMember = members.find((member) => member.id === identity.memberId) ?? null;
  const loading = membersQuery.isLoading || uplinesQuery.isLoading;

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <div>
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <PageHeader title={roleTitle(identity.roles)} description="Authorized Sales Network account context." />
      </div>

      <AdminStatGrid columns={3}>
        <AdminStatCard label="Team members" value={countVisibleMembers(members).toLocaleString()} icon={Users} tone="brand" loading={membersQuery.isLoading} />
        <AdminStatCard label="Visible customers" value={(countVisibleCustomers(customersQuery.data ?? [])).toLocaleString()} icon={Contact} tone="info" loading={customersQuery.isLoading} />
        <AdminStatCard label="Authorized uplines" value={countUplines(uplines).toLocaleString()} icon={Network} tone="neutral" loading={uplinesQuery.isLoading} />
      </AdminStatGrid>

      {loading ? (
        <CardGridSkeleton cards={2} className="tw:lg:grid-cols-2" />
      ) : (
        <div className="tw:grid tw:gap-4 tw:md:grid-cols-2">
          <Card title="Account context">
            {currentMember ? (
              <DetailList>
                <DetailRow term="Name">{currentMember.displayName}</DetailRow>
                <DetailRow term="Designation">
                  <DesignationBadge designation={currentMember.designation} full />
                </DetailRow>
                <DetailRow term="Team">{teamDisplayName(currentMember, members)}</DetailRow>
                <DetailRow term="AA Number">{aaDisplay(currentMember)}</DetailRow>
                <DetailRow term="Status">{humanize(currentMember.status)}</DetailRow>
              </DetailList>
            ) : (
              <p className="tw:text-muted-foreground">No account context available.</p>
            )}
          </Card>

          <Card title="Authorized upline">
            {uplines.length === 0 ? (
              <p className="tw:text-muted-foreground">No upline members.</p>
            ) : (
              <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:p-0">
                {uplines.map((upline) => (
                  <li key={upline.id} className="tw:flex tw:items-center tw:justify-between tw:gap-2">
                    <span>{upline.displayName}</span>
                    <DesignationBadge designation={upline.designation} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Authorized team members" className="tw:md:col-span-2">
            {members.length === 0 ? (
              <p className="tw:text-muted-foreground">No authorized members found.</p>
            ) : (
              <>
                <p className="tw:mb-2 tw:text-muted-foreground">{members.length} visible member(s)</p>
                <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:p-0">
                  {members.map((member) => (
                    <li key={member.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
                      <span>{member.displayName}</span>
                      <span className="tw:inline-flex tw:items-center tw:gap-2">
                        <span className="tw:text-xs tw:text-muted-foreground">{aaDisplay(member)}</span>
                        <DesignationBadge designation={member.designation} />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
