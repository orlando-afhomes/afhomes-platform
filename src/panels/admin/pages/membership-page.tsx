"use client";

import { useMemo } from "react";
import { useMemberships } from "@/data/business-queries";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, CircleCheck, Clock, Hourglass } from "lucide-react";
import { MembershipTable } from "../components/membership-table";

/** All memberships. Activation lives on its own page (Membership / Activation Queue). */
export function MembershipPage() {
  const memberships = useMemberships();
  const all = useMemo(() => memberships.data ?? [], [memberships.data]);
  const pending = useMemo(() => all.filter((item) => item.status === "pending"), [all]);

  return (
    <AdminPage anyOf={["membership"]} title="Memberships" description="Card IDs and membership status. A Confirmed sale is not a Fully Paid sale, and Fully Paid is not Active." crumbs={[{ label: "Membership" }, { label: "Memberships" }]}>
      <AdminStatGrid>
        <AdminStatCard label="Active" value={all.filter((item) => item.status === "active").length} icon={BadgeCheck} tone="success" />
        <AdminStatCard label="Pending activation" value={pending.length} icon={Clock} tone="warning" />
        <AdminStatCard label="Ready" value={pending.filter((item) => item.eligible).length} icon={CircleCheck} tone="info" />
        <AdminStatCard label="Financial holds" value={all.filter((item) => item.financialHold).length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        <MembershipTable data={all} caption="Memberships" emptyText="No memberships are available." />
      </QueryState>
    </AdminPage>
  );
}
