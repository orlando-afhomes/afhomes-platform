"use client";

import { customerRecordName } from "@/modules/customers/rules";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck, FileText, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDiscardCustomerDraft, useOperation } from "@/data/business-queries";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useCustomers, useMembers } from "@/data/queries";
import type { Customer } from "@/modules/customers/types";
import type { ColumnDef } from "@/shared/components/modern/data-table";
import { buttonVariants } from "@/shared/ui/button";
import { AdminPage } from "@/shared/components/admin";
import { AdminFilterBar } from "@/shared/components/admin";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable } from "@/shared/components/modern/data-table";
import { humanize } from "@/shared/lib/humanize";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "active_member", label: "Active Member" },
  { value: "inactive", label: "Inactive" },
];

export function CustomersPage() {
  const router = useRouter();
  const customers = useCustomers();
  const members = useMembers();
  const discard = useDiscardCustomerDraft();
  const canManage = useOperation("customers.manage");
  const canImport = useOperation("customers.import");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const memberName = useMemo(() => new Map((members.data ?? []).map((member) => [member.id, member.displayName])), [members.data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customers.data ?? [])
      .filter((customer) => (status === "all" || customer.status === status) && (term === "" || customerRecordName(customer).toLowerCase().includes(term) || (customer.customerNumber ?? "").toLowerCase().includes(term)))
      .sort((a, b) => customerRecordName(a).localeCompare(customerRecordName(b)));
  }, [customers.data, search, status]);

  const totalCustomers = rows.length;
  const submittedCount = rows.filter((customer) => customer.status === "submitted").length;
  const draftCount = rows.filter((customer) => customer.status === "draft").length;

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Customer",
        cell: ({ row }) => (
          <Link href={`/admin/customers/${row.original.id}`} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">
            {customerRecordName(row.original)}
          </Link>
        ),
      },
      { id: "plan", header: "VIP plan", cell: ({ row }) => (row.original.vipPlan ? humanize(row.original.vipPlan) : "—") },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      {
        id: "owner",
        header: "Seller",
        meta: { className: "tw:hidden tw:sm:table-cell" },
        cell: ({ row }) => (row.original.ownerMemberId ? (memberName.get(row.original.ownerMemberId) ?? "Unknown seller") : "Company"),
      },
    ],
    [memberName],
  );

  return (
    <AdminPage
      anyOf={["customers"]}
      title="Customers"
      description="Customer master records and VIP applications."
      crumbs={[{ label: "Sales" }, { label: "Customers" }]}
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
      <AdminStatGrid columns={3}>
        <AdminStatCard label="Total customers" value={totalCustomers.toLocaleString()} icon={Users} tone="brand" loading={customers.isLoading} error={customers.error} />
        <AdminStatCard
          label="Submitted applications"
          value={submittedCount.toLocaleString()}
          icon={FileCheck}
          tone="info"
          loading={customers.isLoading}
          error={customers.error}
        />
        <AdminStatCard label="Draft records" value={draftCount.toLocaleString()} icon={FileText} tone="accent" loading={customers.isLoading} error={customers.error} />
      </AdminStatGrid>
      <AdminFilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[{ label: "Customer status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]} />
      <QueryState isLoading={customers.isLoading} error={customers.error}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No customers match."
          caption="Customers"
          onRowOpen={(row) => router.push(`/admin/customers/${row.id}`)}
          getRowLabel={(row) => `Open ${customerRecordName(row)}`}
          rowActions={(row) => {
            const editable = canManage && !row.restricted;
            return (
              <RowActionsMenu
                itemName={customerRecordName(row)}
                onView={() => router.push(`/admin/customers/${row.id}`)}
                onEdit={editable ? () => router.push(`/admin/customers/${row.id}/edit`) : undefined}
                onDelete={editable && row.status === "draft" ? () => discard.mutateAsync(row.id) : undefined}
                deleteTitle={`Discard the draft for ${customerRecordName(row)}?`}
                deleteDescription="Only drafts can be discarded. Submitted customers are never deleted."
              />
            );
          }}
        />
      </QueryState>
    </AdminPage>
  );
}
