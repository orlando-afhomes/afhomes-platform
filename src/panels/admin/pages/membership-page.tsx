"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActivateMembership, useMemberships, useOperation } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { BizBadge, FilterBar, QueryState, Section, StatTiles, TabBar, formatDate } from "../components/business-ui";
import { ModulePage } from "../components/module-page";
import { useContractHref } from "../components/use-contract-href";

export function MembershipPage() {
  const memberships = useMemberships();
  const activate = useActivateMembership();
  const canActivate = useOperation("membership.activate");
  const { confirmRun, dialog } = useConfirmRun();
  const contractHref = useContractHref();
  const [tab, setTab] = useState(canActivate ? "queue" : "all");
  const [search, setSearch] = useState("");

  const all = useMemo(() => memberships.data ?? [], [memberships.data]);
  const pending = useMemo(() => all.filter((item) => item.status === "pending"), [all]);
  const directory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((item) => term === "" || item.customerName.toLowerCase().includes(term) || (item.cardId ?? "").toLowerCase().includes(term));
  }, [all, search]);

  const columns = useMemo<ColumnDef<MembershipView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${row.original.productName}` },
      { id: "card", header: "Card ID", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => <span className="tw:font-mono">{row.original.cardId ?? "Not issued"}</span> },
      { id: "activation", header: "Activated", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.activationDate) },
      { id: "valid", header: "Valid until", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.validityEndDate) },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.financialHold ? <BizBadge status="on_hold" label="Financial Hold" /> : null}</div> },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          if (!canActivate || item.status !== "pending") return null;
          return item.eligible ? (
            <Button size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => confirmRun({ title: "Activate this membership?", description: `${item.customerName}'s membership becomes Active today and a VIP Card ID is issued. A Card ID is never regenerated.`, confirmText: "Activate", action: () => activate.mutateAsync(item.id), successTitle: "Membership activated and Card ID issued.", errorTitle: "Could not activate" })}>
              Activate
            </Button>
          ) : (
            <ul className="tw:max-w-xs tw:list-disc tw:pl-4 tw:text-xs tw:text-muted-foreground">{item.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          );
        },
      },
    ],
    [canActivate, activate, confirmRun, contractHref],
  );

  return (
    <ModulePage anyOf={["membership"]} title="VIP Membership" description="Activation, Card IDs and membership status. A Confirmed sale is not a Fully Paid sale, and Fully Paid is not Active." crumbs={[{ label: "Membership" }]}>
      {dialog}
      <StatTiles items={[{ label: "Active", value: all.filter((item) => item.status === "active").length }, { label: "Pending activation", value: pending.length }, { label: "Ready to activate", value: pending.filter((item) => item.eligible).length }, { label: "Financial holds", value: all.filter((item) => item.financialHold).length }]} />
      <InfoNote title="Expiration boundary">Validity runs from the activation date for the contract term. The exact expiration boundary convention is still an open owner decision, so end dates are provisional.</InfoNote>
      <TabBar label="Membership views" value={tab} onChange={setTab} tabs={[...(canActivate ? [{ value: "queue", label: "Activation queue", count: pending.length }] : []), { value: "all", label: "All memberships", count: all.length }]} />
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        {tab === "queue" && canActivate ? (
          <Section title="Activation queue" description="Eligible means a finalized contract, Finance-verified full payment, and a valid RA number.">
            <DataTable data={pending} columns={columns} getRowId={(row) => row.id} emptyText="No memberships are waiting for activation." caption="Activation queue" />
          </Section>
        ) : (
          <Section title="All memberships">
            <FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" />
            <DataTable data={directory} columns={columns} getRowId={(row) => row.id} emptyText="No memberships match." caption="Memberships" />
          </Section>
        )}
      </QueryState>
    </ModulePage>
  );
}
