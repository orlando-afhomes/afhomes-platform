"use client";

import { useMemo, useState } from "react";
import { useMemberships } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { MembershipTable } from "../components/membership-table";
import { ModulePage } from "../components/module-page";

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
    <ModulePage anyOf={["membership"]} title="Memberships" description="Card IDs and membership status. A Confirmed sale is not a Fully Paid sale, and Fully Paid is not Active." crumbs={[{ label: "Membership" }, { label: "Memberships" }]}>
      <StatTiles items={[{ label: "Active", value: all.filter((item) => item.status === "active").length }, { label: "Pending activation", value: pending.length }, { label: "Ready to activate", value: pending.filter((item) => item.eligible).length }, { label: "Financial holds", value: all.filter((item) => item.financialHold).length }]} />
      <InfoNote title="Expiration boundary">Validity runs from the activation date for the contract term. The exact expiration boundary convention is still an open owner decision, so end dates are provisional.</InfoNote>
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        <Section title="All memberships">
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" />
          <MembershipTable data={directory} caption="Memberships" emptyText="No memberships match." />
        </Section>
      </QueryState>
    </ModulePage>
  );
}
