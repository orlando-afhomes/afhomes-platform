"use client";

import { useMemo } from "react";
import { useMemberships, useOperation } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { BadgeCheck, Clock } from "lucide-react";
import { MembershipTable } from "../components/membership-table";

/** Activation queue: pending memberships. Activating requires the membership.activate operation. */
export function MembershipActivationPage() {
  const memberships = useMemberships();
  const canActivate = useOperation("membership.activate");
  const pending = useMemo(() => (memberships.data ?? []).filter((item) => item.status === "pending"), [memberships.data]);

  return (
    <AdminPage anyOf={["membership"]} title="Activation Queue" description="Activate eligible memberships and issue Card IDs. Fully Paid is not Active until activation." crumbs={[{ label: "Membership" }, { label: "Activation Queue" }]}>
      {canActivate ? (
        <>
          <AdminStatGrid columns={2}>
            <AdminStatCard label="Pending activation" value={pending.length} icon={Clock} tone="warning" />
            <AdminStatCard label="Ready to activate" value={pending.filter((item) => item.eligible).length} icon={BadgeCheck} tone="success" />
          </AdminStatGrid>
          <QueryState isLoading={memberships.isLoading} error={memberships.error}>
            <AdminSection title="Activation queue" description="Eligible means a finalized contract, Finance-verified full payment, and a valid RA number.">
              <MembershipTable data={pending} caption="Activation queue" emptyText="No memberships are waiting for activation." />
            </AdminSection>
          </QueryState>
        </>
      ) : (
        <InfoNote title="Access restricted">This account is not authorized to activate memberships.</InfoNote>
      )}
    </AdminPage>
  );
}
