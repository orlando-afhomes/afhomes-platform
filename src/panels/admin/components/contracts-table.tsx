"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { useApproveDeal, useContracts, useMemberships, useOperation, usePayments } from "@/data/business-queries";
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
import { recordLabel } from "@/shared/lib/record-label";
import { approveDealConfirm, buildContractMenuProps, needsNonStandardApproval } from "../actions/sales-contract-actions";
import { nonStandardStage } from "@/modules/contracts/rules";
import { ApproveArrangementDialog, ApproveNonStandardDealDialog, CancelContractDialog, RequestCancellationDialog, ResolvePaymentCodeDialog, ReturnContractDialog } from "./contract-dialogs";
import { useContractHref } from "./use-contract-href";
import { useTierDisplayName } from "./use-tier-display-name";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "needs-review", label: "Needs review" },
  { value: "waiting-finance", label: "Non-Standard, waiting for Finance" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "returned", label: "Returned" },
  { value: "finalized", label: "Finalized" },
  { value: "cancelled", label: "Cancelled" },
];

/** Contract list with search and status filter, scoped by the repository to what the viewer may see. */
export function ContractsTable({ initialStatus = "all" }: { initialStatus?: string }) {
  const router = useRouter();
  const contracts = useContracts();
  const tierName = useTierDisplayName();
  const canPrepare = useOperation("contracts.prepare");
  const canApprove = useOperation("contracts.approve");
  const canApproveCustomer = useOperation("customers.approve");
  const approveDeal = useApproveDeal();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const payments = usePayments();
  const memberships = useMemberships();
  const { identity } = useDevIdentity();
  // Owner decision 2026-11-09: only Super Admin approves a Move arrangement (the repository enforces it too).
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const [target, setTarget] = useState<{ contract: ContractView; kind: "return" | "cancel" | "requestCancel" | "approveArrangement" | "resolvePaymentCode" | "approveNonStandard" } | null>(null);
  const closeTarget = () => setTarget(null);
  const contractHref = useContractHref();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => STATUS_OPTIONS.find((option) => option.value === initialStatus)?.value ?? "all");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (contracts.data ?? [])
      .filter((item) => {
        const matchesStatus = status === "all" || item.status === status ||
          (status === "needs-review" && (item.status === "submitted" || item.status === "under_review")) ||
          (status === "waiting-finance" && (item.status === "submitted" || item.status === "under_review") && nonStandardStage(item) === "finance");
        return matchesStatus && (term === "" || item.customerName.toLowerCase().includes(term));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [contracts.data, search, status]);

  const columns = useMemo<ColumnDef<ContractView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => tierName(row.original.productCode) },
      { id: "price", header: "Price", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "holds", header: "Holds", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (["submitted", "under_review"].includes(row.original.status) && row.original.holds.length > 0 ? <StatusPill tone="warning" icon={Hourglass}>{`${row.original.holds.length} hold${row.original.holds.length > 1 ? "s" : ""}`}</StatusPill> : "—") },
    ],
    [tierName],
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
          getRowLabel={(row) => recordLabel("Open contract", row.customerName, tierName(row.productCode))}
          rowActions={(row) => {
            const contractPayments = (payments.data ?? []).filter((payment) => payment.contractId === row.id);
            const membership = (memberships.data ?? []).find((item) => item.contractId === row.id);
            const menu = buildContractMenuProps(row, {
              canPrepare,
              canApprove,
              canApproveCustomer,
              canSubmitPayment: false,
              isSuperAdmin,
              hasVerifiedMoney: totalVerifiedCentavos(contractPayments) > 0 || row.sale?.status === "confirmed",
              hasActiveMembership: membership?.status === "active",
              hasCard: membership?.cardId != null,
            }, {
              onEdit: canPrepare && ["draft", "returned"].includes(row.status) ? () => router.push(contractHref(row.id)) : undefined,
              onApproveDeal: () => needsNonStandardApproval(row) ? setTarget({ contract: row, kind: "approveNonStandard" }) : confirmRun(approveDealConfirm(() => approveDeal.mutateAsync({ contractId: row.id }))),
              onReturn: () => setTarget({ contract: row, kind: "return" }),
              onRecordPaymentCode: () => setTarget({ contract: row, kind: "resolvePaymentCode" }),
              onApproveArrangement: () => setTarget({ contract: row, kind: "approveArrangement" }),
              onCancel: () => setTarget({ contract: row, kind: "cancel" }),
              onRequestCancellation: () => setTarget({ contract: row, kind: "requestCancel" }),
            });
            return <RowActionsMenu {...menu} itemName={recordLabel("contract", row.customerName, tierName(row.productCode))} />;
          }}
        />
      </QueryState>
      {confirmDialog}
      {target?.kind === "requestCancel" ? <RequestCancellationDialog contract={target.contract} onClose={closeTarget} /> : null}
      {target?.kind === "approveNonStandard" ? <ApproveNonStandardDealDialog contract={target.contract} onClose={closeTarget} /> : null}
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
