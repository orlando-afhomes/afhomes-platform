"use client";

import { useMemo } from "react";
import { useMemberships, useOperation } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, Clock } from "lucide-react";
import { MembershipTable } from "../components/membership-table";

/** Activation queue: pending memberships. Activating requires the membership.activate operation. */
export function MembershipActivationPage() {
  const memberships = useMemberships();
  const canActivate = useOperation("membership.activate");
  const pending = useMemo(() => (memberships.data ?? []).filter((item) => item.status === "pending"), [memberships.data]);

  return (
    <AdminPage anyOf={["membership"]} title="Activation Queue" description="Activate eligible memberships using their issued VIP Numbers." crumbs={[{ label: "Membership" }, { label: "Activation Queue" }]}>
      {canActivate ? (
        <>
          <AdminStatGrid columns={2}>
            <AdminStatCard label="Pending activation" value={pending.length} icon={Clock} tone="warning" />
            <AdminStatCard label="Ready" value={pending.filter((item) => item.eligible).length} icon={BadgeCheck} tone="success" />
          </AdminStatGrid>
          <QueryState isLoading={memberships.isLoading} error={memberships.error}>
            <MembershipTable data={pending} caption="Activation queue" emptyText="No memberships are waiting for activation." />
          </QueryState>
        </>
      ) : (
        <InfoNote title="Access restricted">This account is not authorized to activate memberships.</InfoNote>
      )}
    </AdminPage>
  );
}
