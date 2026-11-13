"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { useContractAction, useContracts, useMemberships, useOperation, usePayments } from "@/data/business-queries";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { StatusPill } from "@/shared/components/admin";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import type { ContractView } from "@/data/contracts/contract-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { recordLabel } from "@/shared/lib/record-label";
import { buildContractMenuProps } from "../actions/sales-contract-actions";
import { ApproveArrangementDialog, CancelContractDialog, RaDialog, RequestCancellationDialog, ResolvePaymentCodeDialog, ReturnContractDialog } from "./contract-dialogs";
import { useContractHref } from "./use-contract-href";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "returned", label: "Returned" },
  { value: "finalized", label: "Finalized" },
  { value: "cancelled", label: "Cancelled" },
];

/** Contract list with search and status filter, scoped by the repository to what the viewer may see. */
export function ContractsTable({ initialStatus = "all", contractHref: hrefOverride }: { initialStatus?: string; contractHref?: (id: string) => string }) {
  const router = useRouter();
  const contracts = useContracts();
  const canPrepare = useOperation("contracts.prepare");
  const canApprove = useOperation("contracts.approve");
  const action = useContractAction();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const payments = usePayments();
  const memberships = useMemberships();
  const { identity } = useDevIdentity();
  // Owner decision 2026-11-09: only Super Admin approves a Move arrangement (the repository enforces it too).
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const [target, setTarget] = useState<{ contract: ContractView; kind: "return" | "cancel" | "ra" | "requestCancel" | "approveArrangement" | "resolvePaymentCode" } | null>(null);
  const closeTarget = () => setTarget(null);
  const defaultHref = useContractHref();
  const contractHref = hrefOverride ?? defaultHref;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (contracts.data ?? [])
      .filter((item) => (status === "all" || item.status === status) && (term === "" || item.customerName.toLowerCase().includes(term)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [contracts.data, search, status]);

  const columns = useMemo<ColumnDef<ContractView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.id)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "plan", header: "Plan and scheme", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.productCode} · ${row.original.schemeLabel}` },
      { id: "price", header: "Price", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
      { id: "date", header: "Submitted", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.submittedAt) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "holds", header: "Holds", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (["submitted", "under_review"].includes(row.original.status) && row.original.holds.length > 0 ? <StatusPill tone="warning" icon={Hourglass}>{`${row.original.holds.length} hold${row.original.holds.length > 1 ? "s" : ""}`}</StatusPill> : "—") },
    ],
    [contractHref],
  );

  return (
    <div className="contracts-table__wrap tw:flex tw:flex-col tw:gap-3">
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search contracts" filters={[{ label: "Contract status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]} />
      <QueryState isLoading={contracts.isLoading} error={contracts.error}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No contracts match."
          caption="Contracts"
          onRowOpen={(row) => router.push(contractHref(row.id))}
          getRowLabel={(row) => recordLabel("Open contract", row.customerName, row.productCode)}
          rowActions={(row) => {
            const contractPayments = (payments.data ?? []).filter((payment) => payment.contractId === row.id);
            const membership = (memberships.data ?? []).find((item) => item.contractId === row.id);
            const run = (kind: "startReview" | "finalize", title: string, description: string, success: string) =>
              confirmRun({ title, description, confirmText: title.replace("?", ""), action: () => action.mutateAsync({ id: row.id, action: kind }), successTitle: success, errorTitle: "Action failed" });
            const menu = buildContractMenuProps(row, {
              canPrepare,
              canApprove,
              canSubmitPayment: false,
              isSuperAdmin,
              hasVerifiedMoney: totalVerifiedCentavos(contractPayments) > 0 || row.sale?.status === "confirmed",
              hasActiveMembership: membership?.status === "active",
              hasCard: membership?.cardId != null,
            }, {
              onView: () => router.push(contractHref(row.id)),
              onEdit: canPrepare && ["draft", "returned"].includes(row.status) ? () => router.push(contractHref(row.id)) : undefined,
              onStartReview: () => run("startReview", "Start review?", "The contract moves to Under Admin Review.", "Review started."),
              onFinalize: () => run("finalize", "Finalize this contract?", "The contract terms become fixed and a pending membership is created.", "Contract finalized."),
              onReturn: () => setTarget({ contract: row, kind: "return" }),
              onRecordSignedAgreement: () => setTarget({ contract: row, kind: "ra" }),
              onRecordPaymentCode: () => setTarget({ contract: row, kind: "resolvePaymentCode" }),
              onApproveArrangement: () => setTarget({ contract: row, kind: "approveArrangement" }),
              onCancel: () => setTarget({ contract: row, kind: "cancel" }),
              onRequestCancellation: () => setTarget({ contract: row, kind: "requestCancel" }),
            });
            return <RowActionsMenu {...menu} />;
          }}
        />
      </QueryState>
      {confirmDialog}
      {target?.kind === "ra" ? <RaDialog contract={target.contract} onClose={closeTarget} /> : null}
      {target?.kind === "requestCancel" ? <RequestCancellationDialog contract={target.contract} onClose={closeTarget} /> : null}
      {target ? (
        <>
          <ReturnContractDialog contract={target.contract} open={target.kind === "return"} onClose={closeTarget} />
          <CancelContractDialog contract={target.contract} open={target.kind === "cancel"} onClose={closeTarget} />
          <ApproveArrangementDialog contract={target.contract} open={target.kind === "approveArrangement"} onClose={closeTarget} />
          <ResolvePaymentCodeDialog contract={target.contract} open={target.kind === "resolvePaymentCode"} onClose={closeTarget} />
        </>
      ) : null}
    </div>
  );
}
