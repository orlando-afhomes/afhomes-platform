"use client";

import { useMemo } from "react";
import { useMemberships } from "@/data/business-queries";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminStatGrid, AdminStatCard, AreaPage } from "@/shared/components/admin";
import { BadgeCheck, CircleCheck, Clock, Hourglass } from "lucide-react";
import { MembershipTable } from "../components/membership-table";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { ActivationQueuePanel } from "./membership-activation-page";

/** Membership area: Memberships and Activation queue tabs, gated like the sidebar (ADMIN_AREA_TABS.membership). */
export function MembershipAreaPage() {
  const access = useAdminAreaTabAccess("membership");
  return (
    <AreaPage
      anyOf={["membership"]}
      title="Membership"
      tabs={[
        { value: "memberships", label: "Memberships", allowed: access.memberships, render: () => <MembershipsPanel /> },
        { value: "activation", label: "Ready to Activate", allowed: access.activation, render: () => <ActivationQueuePanel /> },
      ]}
    />
  );
}

/** All memberships with their status counts. */
export function MembershipsPanel() {
  const memberships = useMemberships();
  const all = useMemo(() => memberships.data ?? [], [memberships.data]);
  const pending = useMemo(() => all.filter((item) => item.status === "pending"), [all]);

  return (
    <>
      <AdminStatGrid>
        <AdminStatCard label="Active" value={all.filter((item) => item.status === "active").length} icon={BadgeCheck} tone="success" />
        <AdminStatCard label="Pending Activation" value={pending.length} icon={Clock} tone="violet" />
        <AdminStatCard label="Ready" value={pending.filter((item) => item.eligible).length} icon={CircleCheck} tone="info" />
        <AdminStatCard label="Payment Holds" value={all.filter((item) => item.financialHold).length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        <MembershipTable data={all} caption="Memberships" emptyText="No memberships are available." />
      </QueryState>
    </>
  );
}
