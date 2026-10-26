"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tag } from "antd";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers, useMockRepositories } from "@/data/queries";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { countVisibleCustomers, countVisibleMembers, countUplines } from "../dashboard-metrics";
import styles from "./sales-network-panel.module.css";

function roleTitle(roles: string[]) {
  if (roles.includes("svd")) return "Senior Vice Director";
  if (roles.includes("ssm")) return "Senior Sales Manager";
  if (roles.includes("sm")) return "Sales Manager";
  if (roles.includes("ist")) return "Internal Sales";
  if (roles.includes("ost")) return "Outside Sales";
  return "Sales Network";
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
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader title={roleTitle(identity.roles)} description="Authorized Sales Network account context." />

      <div className={styles.kpiGrid}>
        <Card title="Visible team members">
          {membersQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className={styles.kpiValue}>{countVisibleMembers(members)}</p>}
        </Card>
        <Card title="Visible customers">
          {customersQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className={styles.kpiValue}>{countVisibleCustomers(customersQuery.data ?? [])}</p>}
        </Card>
        <Card title="Authorized uplines">
          {uplinesQuery.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : <p className={styles.kpiValue}>{countUplines(uplines)}</p>}
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton active />
          <Skeleton active />
        </div>
      ) : (
        <div className={styles.detailGrid}>
          <Card title="Account context">
            {currentMember ? (
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{currentMember.displayName}</span>
                </div>
                <div className={styles.row}>
                  <span className="text-muted-foreground">Designation</span>
                  <Tag>{currentMember.designation}</Tag>
                </div>
                <div className={styles.row}>
                  <span className="text-muted-foreground">Branch</span>
                  <span>{currentMember.branchId}</span>
                </div>
                <div className={styles.row}>
                  <span className="text-muted-foreground">Status</span>
                  <span>{currentMember.status}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No account context available.</p>
            )}
          </Card>

          <Card title="Authorized upline">
            {uplines.length === 0 ? (
              <p className="text-muted-foreground">No upline members.</p>
            ) : (
              <ul className={styles.rows}>
                {uplines.map((upline) => (
                  <li key={upline.id} className={styles.row}>
                    <span>{upline.displayName}</span>
                    <Tag>{upline.designation}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Authorized team members" className={styles.wide}>
            {members.length === 0 ? (
              <p className="text-muted-foreground">No authorized members found.</p>
            ) : (
              <>
                <p className="text-muted-foreground">{members.length} visible member(s)</p>
                <ul className={styles.rows}>
                  {members.map((member) => (
                    <li key={member.id} className={styles.row}>
                      <span>{member.displayName}</span>
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
