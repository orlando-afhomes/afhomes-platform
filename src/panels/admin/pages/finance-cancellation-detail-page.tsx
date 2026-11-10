"use client";

import { useState } from "react";
import { useOperation } from "@/data/business-queries";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { formatDate } from "@/shared/lib/format-date";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { DetailList, DetailRow, InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { AdminSection } from "@/shared/components/admin";
import { Button } from "@/shared/ui/button";
import { ConfirmCancellationDialog, DeclineCancellationDialog } from "../components/contract-dialogs";
import { ContractLedgerSection, ContractPageFrame } from "../components/contract-sections";

const CRUMBS = [{ label: "Finance" }, { label: "Cancellation Requests", href: "/admin/finance/cancellations" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Finance decision on a requested cancellation with forfeiture. The requester can never decide it. */
export function FinanceCancellationDetailPage({ contractId }: { contractId: string }) {
  const canDecide = useOperation("finance.refund");
  const { identity } = useDevIdentity();
  const [dialogKind, setDialogKind] = useState<"confirm" | "decline" | null>(null);
  const close = () => setDialogKind(null);

  return (
    <ContractPageFrame
      contractId={contractId}
      anyOf={["finance"]}
      parentCrumbs={CRUMBS}
      actions={({ contract }) => {
        const pending = contract.cancellation?.status === "requested" ? contract.cancellation : null;
        return canDecide && pending && pending.requestedBy !== identity.id ? (
          <>
            <Button variant="destructive" className={BUTTON} onClick={() => setDialogKind("confirm")}>Confirm cancellation</Button>
            <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("decline")}>Decline cancellation</Button>
          </>
        ) : null;
      }}
    >
      {(record) => {
        const { contract } = record;
        const request = contract.cancellation;
        return (
          <>
            {request ? (
              <AdminSection title="Cancellation request" description="Verified payments are forfeited if Finance confirms. The requester cannot decide it (unless Super Admin).">
                <DetailList>
                  <DetailRow term="Status">{request.status === "requested" ? "Awaiting Finance decision" : "Confirmed"}</DetailRow>
                  <DetailRow term="Ground">{CANCELLATION_GROUND_LABELS[request.ground]}</DetailRow>
                  <DetailRow term="Reason">{request.reason}</DetailRow>
                  <DetailRow term="Requested by">{request.requestedBy}</DetailRow>
                  <DetailRow term="Requested on">{formatDate(request.requestedAt)}</DetailRow>
                  <DetailRow term="Amount to forfeit"><Money value={request.status === "confirmed" ? (request.forfeitedCentavos ?? 0) : totalVerifiedCentavos(record.payments)} /></DetailRow>
                </DetailList>
              </AdminSection>
            ) : (
              <InfoNote title="No cancellation request">This contract has no cancellation request.</InfoNote>
            )}
            <ContractLedgerSection record={record} />
            <ConfirmCancellationDialog contract={contract} open={dialogKind === "confirm"} onClose={close} />
            <DeclineCancellationDialog contract={contract} open={dialogKind === "decline"} onClose={close} />
          </>
        );
      }}
    </ContractPageFrame>
  );
}
