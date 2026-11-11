"use client";

import { useMemo, useState } from "react";
import { useMemberships } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard, AdminFilterBar } from "@/shared/components/admin";
import { BadgeCheck, CircleCheck, Clock, Hourglass } from "lucide-react";
import { MembershipTable } from "../components/membership-table";

/** All memberships. Activation lives on its own page (Membership / Activation Queue). */
export function MembershipPage() {
  const memberships = useMemberships();
  const [search, setSearch] = useState("");
  const all = useMemo(() => memberships.data ?? [], [memberships.data]);
  const pending = useMemo(() => all.filter((item) => item.status === "pending"), [all]);
  const directory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((item) => term === "" || item.customerName.toLowerCase().includes(term) || (item.cardId ?? "").toLowerCase().includes(term));
  }, [all, search]);

  return (
    <AdminPage anyOf={["membership"]} title="Memberships" description="Card IDs and membership status. A Confirmed sale is not a Fully Paid sale, and Fully Paid is not Active." crumbs={[{ label: "Membership" }, { label: "Memberships" }]}>
      <AdminStatGrid>
        <AdminStatCard label="Active" value={all.filter((item) => item.status === "active").length} icon={BadgeCheck} tone="success" />
        <AdminStatCard label="Pending activation" value={pending.length} icon={Clock} tone="warning" />
        <AdminStatCard label="Ready" value={pending.filter((item) => item.eligible).length} icon={CircleCheck} tone="info" />
        <AdminStatCard label="Financial holds" value={all.filter((item) => item.financialHold).length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <InfoNote title="Expiration boundary">Validity runs from the activation date for the contract term. The exact expiration boundary convention is still an open owner decision, so end dates are provisional.</InfoNote>
      <AdminFilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" />
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        <MembershipTable data={directory} caption="Memberships" emptyText="No memberships match." />
      </QueryState>
    </AdminPage>
  );
}
