"use client";

import { customerRecordName } from "@/modules/customers/rules";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck, FileText, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApproveCustomer, useContracts, useDiscardCustomerDraft, useOperation, useRejectCustomer, useSendBackCustomer } from "@/data/business-queries";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { toast } from "sonner";
import { PrepareContractDialog } from "../components/prepare-contract-dialog";
import { buildCustomerMenuProps } from "../actions/customer-actions";
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
  { value: "approved", label: "Approved" },
  { value: "sent_back", label: "Sent back" },
  { value: "rejected", label: "Rejected" },
  { value: "active_member", label: "Active Member" },
  { value: "inactive", label: "Inactive" },
];

export function CustomersPage() {
  const router = useRouter();
  const customers = useCustomers();
  const members = useMembers();
  const contracts = useContracts();
  const discard = useDiscardCustomerDraft();
  const approve = useApproveCustomer();
  const sendBack = useSendBackCustomer();
  const reject = useRejectCustomer();
  const canManage = useOperation("customers.manage");
  // Sellers start and edit only their own draft (doc 04 section 5).
  const canDraft = useOperation("customers.draft");
  const canImport = useOperation("customers.import");
  const canApprove = useOperation("customers.approve");
  const canPrepare = useOperation("contracts.prepare");
  const [reviewTarget, setReviewTarget] = useState<{ customer: Customer; action: "approve" | "send_back" | "reject" } | null>(null);
  const [preparingCustomer, setPreparingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const memberName = useMemo(() => new Map((members.data ?? []).map((member) => [member.id, member.displayName])), [members.data]);
  const contractCustomerIds = useMemo(
    () => new Set((contracts.data ?? []).filter((contract) => contract.status !== "cancelled").map((contract) => contract.customerId)),
    [contracts.data],
  );
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
        canDraft || canImport ? (
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            {canImport ? (
              <Link href="/admin/customers/import-export" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
                Import / Export
              </Link>
            ) : null}
            {canDraft ? (
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
            const menu = buildCustomerMenuProps(
              row,
              { canManage, canDraft, canApprove, canPrepare, ownRecord: !row.restricted, hasContract: contractCustomerIds.has(row.id) },
              {
                onView: () => router.push(`/admin/customers/${row.id}`),
                onEdit: () => router.push(`/admin/customers/${row.id}/edit`),
                onDiscard: () => discard.mutateAsync(row.id),
                onApprove: () => setReviewTarget({ customer: row, action: "approve" }),
                onSendBack: () => setReviewTarget({ customer: row, action: "send_back" }),
                onReject: () => setReviewTarget({ customer: row, action: "reject" }),
                onPrepare: () => setPreparingCustomer(row),
              },
            );
            return <RowActionsMenu {...menu} />;
          }}
        />
      </QueryState>
      <ConfirmDialog
        open={reviewTarget?.action === "approve"}
        title="Approve this registration?"
        description="The customer registration is approved. This does not activate a VIP membership."
        confirmText="Approve"
        pending={approve.isPending}
        onClose={() => setReviewTarget(null)}
        onConfirm={() => {
          if (!reviewTarget) return;
          const targetId = reviewTarget.customer.id;
          approve.mutateAsync(targetId).then(
            () => {
              toast.success("Registration approved.");
              setReviewTarget(null);
            },
            (failure) => {
              // Attribution problems (closing seller, referral reference) are listed so the Clerk can fix them.
              const detail = failure instanceof CustomerValidationError ? Object.values(failure.errors).filter(Boolean).join(" ") : failure instanceof Error ? failure.message : "Request failed.";
              toast.error(detail);
              setReviewTarget(null);
            },
          );
        }}
      />
      <ReasonDialog
        open={reviewTarget?.action === "send_back"}
        title="Send back to the Clerk"
        description="The Clerk sees the reason and can fix and resubmit. Nothing is deleted."
        confirmText="Send back"
        successText="Sent back to the Clerk."
        onClose={() => setReviewTarget(null)}
        onSubmit={(reason) => (reviewTarget ? sendBack.mutateAsync({ id: reviewTarget.customer.id, reason }) : Promise.reject(new Error("No customer selected.")))}
      />
      <ReasonDialog
        open={reviewTarget?.action === "reject"}
        title="Reject this registration"
        description="Rejecting keeps the record and its history. Nothing is deleted."
        confirmText="Reject"
        successText="Registration rejected."
        danger
        onClose={() => setReviewTarget(null)}
        onSubmit={(reason) => (reviewTarget ? reject.mutateAsync({ id: reviewTarget.customer.id, reason }) : Promise.reject(new Error("No customer selected.")))}
      />
      {preparingCustomer ? <PrepareContractDialog customer={preparingCustomer} open onClose={() => setPreparingCustomer(null)} /> : null}
    </AdminPage>
  );
}
