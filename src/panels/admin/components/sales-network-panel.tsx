"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tag } from "antd";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers, useMockRepositories } from "@/data/queries";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { countVisibleCustomers, countVisibleMembers, countUplines } from "../dashboard-metrics";
import { getSystemRoleLabel } from "../role-label";

function roleTitle(roles: string[]) {
  const label = getSystemRoleLabel(
    roles.find((role) => ["svd", "ssm", "sm", "ost"].includes(role)) ?? "",
  );
  return label === "" ? "Sales Network" : label;
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
    <div className="sales-network">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader title={roleTitle(identity.roles)} description="Authorized Sales Network account context." />

      <div className="sales-network__stats-grid">
        <Card title="Visible team members">
          {membersQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className="sales-network__stat-value">{countVisibleMembers(members)}</p>}
        </Card>
        <Card title="Visible customers">
          {customersQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className="sales-network__stat-value">{countVisibleCustomers(customersQuery.data ?? [])}</p>}
        </Card>
        <Card title="Authorized uplines">
          {uplinesQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className="sales-network__stat-value">{countUplines(uplines)}</p>}
        </Card>
      </div>

      {loading ? (
        <div className="sales-network__loading">
          <Skeleton active />
          <Skeleton active />
        </div>
      ) : (
        <div className="sales-network__detail-grid">
          <Card title="Account context">
            {currentMember ? (
              <div className="sales-network__rows">
                <div className="sales-network__row">
                  <span className="sales-network__context-label">Name</span>
                  <span className="sales-network__context-name">{currentMember.displayName}</span>
                </div>
                <div className="sales-network__row">
                  <span className="sales-network__context-label">Designation</span>
                  <Tag>{currentMember.designation}</Tag>
                </div>
                <div className="sales-network__row">
                  <span className="sales-network__context-label">Branch</span>
                  <span className="sales-network__context-value">{currentMember.branchId}</span>
                </div>
                <div className="sales-network__row">
                  <span className="sales-network__context-label">Status</span>
                  <span className="sales-network__context-value">{currentMember.status}</span>
                </div>
              </div>
            ) : (
              <p className="sales-network__empty-text">No account context available.</p>
            )}
          </Card>

          <Card title="Authorized upline">
            {uplines.length === 0 ? (
              <p className="sales-network__empty-text">No upline members.</p>
            ) : (
              <ul className="sales-network__rows">
                {uplines.map((upline) => (
                  <li key={upline.id} className="sales-network__row">
                    <span className="sales-network__member-name">{upline.displayName}</span>
                    <Tag>{upline.designation}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Authorized team members" className="sales-network__detail-wide">
            {members.length === 0 ? (
              <p className="sales-network__empty-text">No authorized members found.</p>
            ) : (
              <>
                <p className="sales-network__member-count">{members.length} visible member(s)</p>
                <ul className="sales-network__rows">
                  {members.map((member) => (
                    <li key={member.id} className="sales-network__row">
                      <span className="sales-network__member-name">{member.displayName}</span>
                      <Tag>{member.designation}</Tag>
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
