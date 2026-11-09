"use client";

import { useMemo } from "react";
import { useMemberships, useOperation } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { MembershipTable } from "../components/membership-table";
import { ModulePage } from "../components/module-page";

/** Activation queue: pending memberships. Activating requires the membership.activate operation. */
export function MembershipActivationPage() {
  const memberships = useMemberships();
  const canActivate = useOperation("membership.activate");
  const pending = useMemo(() => (memberships.data ?? []).filter((item) => item.status === "pending"), [memberships.data]);

  return (
    <ModulePage anyOf={["membership"]} title="Activation Queue" description="Activate eligible memberships and issue Card IDs. Fully Paid is not Active until activation." crumbs={[{ label: "Membership" }, { label: "Activation Queue" }]}>
      {canActivate ? (
        <>
          <StatTiles items={[{ label: "Pending activation", value: pending.length }, { label: "Ready to activate", value: pending.filter((item) => item.eligible).length }]} />
          <QueryState isLoading={memberships.isLoading} error={memberships.error}>
            <Section title="Activation queue" description="Eligible means a finalized contract, Finance-verified full payment, and a valid RA number.">
              <MembershipTable data={pending} caption="Activation queue" emptyText="No memberships are waiting for activation." />
            </Section>
          </QueryState>
        </>
      ) : (
        <InfoNote title="Access restricted">This account is not authorized to activate memberships.</InfoNote>
      )}
    </ModulePage>
  );
}
