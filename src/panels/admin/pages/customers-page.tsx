"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import { useCustomers, useMembers } from "@/data/queries";
import { ACQUISITION_CHANNELS, type Customer } from "@/modules/customers/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { buttonVariants } from "@/shared/ui/button";
import { ModulePage } from "../components/module-page";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { QueryState } from "@/shared/components/modern/query-state";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "active_member", label: "Active member" },
  { value: "inactive", label: "Inactive" },
];

export function CustomersPage() {
  const customers = useCustomers();
  const members = useMembers();
  const canManage = useOperation("customers.manage");
  const canImport = useOperation("customers.import");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const memberName = useMemo(() => new Map((members.data ?? []).map((member) => [member.id, member.displayName])), [members.data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customers.data ?? [])
      .filter((customer) => (status === "all" || customer.status === status) && (term === "" || customer.displayName.toLowerCase().includes(term) || (customer.customerNumber ?? "").toLowerCase().includes(term)))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [customers.data, search, status]);

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Customer",
        cell: ({ row }) => (
          <Link href={`/admin/customers/${row.original.id}`} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">
            {row.original.displayName}
          </Link>
        ),
      },
      { id: "plan", header: "VIP plan", cell: ({ row }) => row.original.vipPlan ?? "—" },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      {
        id: "owner",
        header: "Seller",
        meta: { className: "tw:hidden tw:sm:table-cell" },
        cell: ({ row }) => (row.original.ownerMemberId ? (memberName.get(row.original.ownerMemberId) ?? row.original.ownerMemberId) : "Company"),
      },
      {
        id: "view",
        header: "Detail",
        meta: { className: "tw:hidden tw:md:table-cell" },
        cell: ({ row }) => (row.original.restricted ? "Summary only" : "Full record"),
      },
    ],
    [memberName],
  );

  return (
    <ModulePage
      anyOf={["customers"]}
      title="Customers"
      description="Customer master records and VIP applications."
      crumbs={[{ label: "Customers" }]}
      actions={
        canManage || canImport ? (
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            {canImport ? (
              <Link href="/admin/customers/import-export" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
                Import / Export
              </Link>
            ) : null}
            {canManage ? (
              <Link href="/admin/customers/new" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
                <Plus aria-hidden="true" /> New customer
              </Link>
            ) : null}
          </div>
        ) : null
      }
    >
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[{ label: "Customer status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]} />
      <QueryState isLoading={customers.isLoading} error={customers.error}>
        <DataTable data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No customers match." caption="Customers" />
      </QueryState>
      <p className="tw:text-xs tw:text-muted-foreground">Acquisition channels in use: {ACQUISITION_CHANNELS.join(", ")}.</p>
    </ModulePage>
  );
}
