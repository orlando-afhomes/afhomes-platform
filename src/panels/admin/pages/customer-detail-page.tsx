"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { customerRecordName } from "@/modules/customers/rules";
import { humanize } from "@/shared/lib/humanize";
import { recordLabel } from "@/shared/lib/record-label";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useApproveCustomer, useContracts, useDiscardCustomerDraft, useMemberships, useOperation, usePaymentSchemes, useRejectCustomer, useSales, useSendBackCustomer } from "@/data/business-queries";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { canPrepareVipContract, isEditableContractStatus, preferOpenContract } from "@/modules/contracts/rules";
import type { ContractView } from "@/data/contracts/contract-repository";
import { canReviewRegistration } from "@/modules/customers/review";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { toast } from "sonner";
import { useCustomers, useMembers } from "@/data/queries";
import { useAuditEvents } from "@/data/queries";
import { SelectField } from "@/shared/forms/modern";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { buttonVariants, Button } from "@/shared/ui/button";
import { DetailSkeleton } from "@/shared/components/modern/skeletons";
import { AdminPage } from "@/shared/components/admin";
import { PrepareContractDialog } from "../components/prepare-contract-dialog";
import { buildCustomerMenuProps } from "../actions/customer-actions";
import { useContractHref } from "../components/use-contract-href";
import { useTierDisplayName } from "../components/use-tier-display-name";
import { CustomerDetailHero } from "../components/customer-detail-hero";
import { CustomerDetailTabs, type CustomerDetailTab } from "../components/customer-detail-tabs";
import {
  AuditTabPanel,
  ContractTabPanel,
  CustomerInfoCard,
  CustomerProgressCard,
  LinkedRecordsCard,
  MembershipTabPanel,
  RecentActivityCard,
  SalesTabPanel,
} from "../components/customer-detail-panels";

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const customers = useCustomers();
  const tierName = useTierDisplayName();
  const members = useMembers();
  const contracts = useContracts();
  const sales = useSales();
  const memberships = useMemberships();
  const schemes = usePaymentSchemes();
  const canManage = useOperation("customers.manage");
  const canDraft = useOperation("customers.draft");
  const canApprove = useOperation("customers.approve");
  const approve = useApproveCustomer();
  const discard = useDiscardCustomerDraft();
  const sendBack = useSendBackCustomer();
  const reject = useRejectCustomer();
  const [review, setReview] = useState<"approve" | "send_back" | "reject" | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const canPrepare = useOperation("contracts.prepare");
  const canReadAudit = useOperation("audit.read");
  const contractHref = useContractHref();
  const [preparing, setPreparing] = useState<"initial" | "separate" | null>(null);
  const [tab, setTab] = useState<CustomerDetailTab>("overview");

  const customer = customers.data?.find((item) => item.id === customerId);
  const [selectedContractId, setSelectedContractId] = useState("");
  const purchases = (contracts.data ?? []).filter((item) => item.customerId === customerId);
  const currentPurchase = purchases.reduce<ContractView | undefined>(preferOpenContract, undefined);
  const hasPurchaseHistory = purchases.length > 0;
  const contract = purchases.find((item) => item.id === selectedContractId) ?? currentPurchase ?? purchases[0];
  const sale = sales.data?.find((item) => item.contractId === contract?.id);
  const membership = memberships.data?.find((item) => item.contractId === contract?.id);
  const owner = members.data?.find((item) => item.id === customer?.ownerMemberId);
  const recommender = members.data?.find((item) => item.id === (customer?.referrerMemberId || customer?.recommenderMemberId));
  const audit = useAuditEvents({ relatedRecordId: customerId, pageSize: 20 });

  const activity = (() => {
    const items: { id: string; label: string; timestamp: string }[] = [];
    if (customer?.statusHistory?.length) {
      customer.statusHistory.forEach((entry, index) => items.push({ id: `${customer.id}-${index}-${entry.status}`, label: `Registration ${humanize(entry.status).toLowerCase()}`, timestamp: entry.at }));
    } else if (customer?.submittedAt) {
      items.push({ id: `${customer.id}-submitted`, label: "Customer record submitted", timestamp: customer.submittedAt });
    }
    for (const event of contract?.history ?? []) {
      items.push({ id: `${contract?.id}-${event.at}-${event.event}`, label: humanize(event.event), timestamp: event.at });
    }
    if (sale?.confirmedDate) {
      items.push({ id: `${sale.id}-confirmed`, label: recordLabel("Sale confirmed", customer?.displayName, tierName(contract?.productCode)), timestamp: sale.confirmedDate });
    }
    for (const event of membership?.history ?? []) {
      items.push({ id: `${membership?.id}-${event.at}-${event.event}`, label: humanize(event.event), timestamp: event.at });
    }
    return items
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 3);
  })();

  if (customers.isLoading) {
    return (
      <AdminPage anyOf={["customers"]} title="Customer" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <DetailSkeleton />
      </AdminPage>
    );
  }
  if (!customer) {
    return (
      <AdminPage anyOf={["customers"]} title="Customer Not Found" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <InfoNote>This customer does not exist or is not visible to this account.</InfoNote>
      </AdminPage>
    );
  }

  const ownRecord = !customer.restricted;
  const canStartPurchase = canPrepare && ownRecord && contracts.isSuccess && canPrepareVipContract(customer.status);
  const viewCustomer = ownRecord
    ? customer
    : {
        ...customer,
        mobileNumber: null,
        email: null,
        address: null,
        dateOfBirth: null,
        customerNumber: customer.customerNumber,
      };
  const ownerName = owner?.displayName ?? "Company";
  const recommenderName = recommender?.displayName ?? "—";
  const schemeLabel = contract?.schemeLabel ?? schemes.data?.find((item) => item.id === customer.paymentSchemeId)?.label ?? null;
  const auditEvents = (audit.data?.items ?? []).map((event) => ({
    id: event.id,
    label: humanize(event.action),
    timestamp: event.timestamp,
  }));
  // Same gates as the table row menu; the header shows each action once, so only the discard slot is read from it.
  const actionSet = buildCustomerMenuProps(
    customer,
    { canManage, canDraft, canApprove, canPrepare, ownRecord },
    {
      onEdit: () => router.push(`/admin/customers/${customer.id}/edit`),
      onDiscard: () => discard.mutateAsync(customer.id),
      onApprove: () => setReview("approve"),
      onSendBack: () => setReview("send_back"),
      onReject: () => setReview("reject"),
    },
  );

  return (
    <AdminPage
      anyOf={["customers"]}
      title={customerRecordName(customer)}
      crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customerRecordName(customer) }]}
      actions={
        <>
          {canPrepare && ownRecord && currentPurchase && isEditableContractStatus(currentPurchase.status) ? (
            <Link href={contractHref(currentPurchase.id)} className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
              Continue Contract
            </Link>
          ) : null}
          {canStartPurchase ? (
            <Button variant={currentPurchase ? "outline" : "default"} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setPreparing(hasPurchaseHistory ? "separate" : "initial")}>
              {hasPurchaseHistory ? "New VIP Purchase" : "Prepare Contract"}
            </Button>
          ) : null}
          {canApprove && canReviewRegistration(customer.status) ? (
            <Button variant="success" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("approve")}>
              <Check aria-hidden="true" /> Approve
            </Button>
          ) : null}
          {ownRecord && (canManage || (canDraft && customer.status === "draft")) && customer.status !== "rejected" ? (
            <Link href={`/admin/customers/${customer.id}/edit`} className={buttonVariants({ variant: "warning", className: "tw:min-h-11 tw:sm:min-h-8" })}>
              <Pencil aria-hidden="true" /> {customer.status === "draft" ? "Edit Draft" : customer.status === "sent_back" ? "Fix and Resubmit" : "Correct Data"}
            </Link>
          ) : null}
          {canApprove && canReviewRegistration(customer.status) ? (
            <>
              <Button variant="warning" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("send_back")}>
                <RotateCcw aria-hidden="true" /> Send Back
              </Button>
              <Button variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("reject")}>
                <X aria-hidden="true" /> Reject
              </Button>
            </>
          ) : null}
          {actionSet.onDelete ? (
            <Button variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDiscarding(true)}>
              <Trash2 aria-hidden="true" /> Discard Draft
            </Button>
          ) : null}
        </>
      }
    >
      {customer.status === "draft" && ownRecord && !canManage ? <InfoNote title="Draft with the Office">The office Clerk completes and submits this draft. You can keep editing it until then.</InfoNote> : null}
      {customer.status === "sent_back" && customer.reviewReason ? <InfoNote title="Sent Back to the Clerk">{customer.reviewReason}</InfoNote> : null}
      {customer.status === "rejected" && customer.reviewReason ? <InfoNote title="Rejected">{customer.reviewReason}</InfoNote> : null}
      {customer.restricted ? <InfoNote title="Summary View">This customer belongs to someone in your team. Contact details, address, government ID and payment details are not shown.</InfoNote> : null}
      <CustomerDetailHero
        displayName={customerRecordName(customer)}
        status={customer.status}
        vipPlan={tierName(customer.vipPlan)}
        customerNumber={ownRecord ? (customer.customerNumber ?? null) : null}
        submittedAt={customer.submittedAt ?? null}
        classification={customer.contractClassification ?? null}
        schemeLabel={schemeLabel}
      />
      {purchases.length > 1 ? <SelectField label="VIP purchase" value={contract?.id} options={purchases.map((item) => ({ value: item.id, label: recordLabel(item.vipNumber ?? EMPTY, tierName(item.productCode), humanize(item.status)) }))} onChange={(value) => setSelectedContractId(value ?? "")} /> : null}
      <CustomerDetailTabs value={tab} onChange={setTab} />
      {tab === "overview" ? (
        <div className="tw:grid tw:gap-6 tw:lg:grid-cols-5">
          <div className="tw:min-w-0 tw:lg:col-span-3 tw:flex tw:flex-col tw:gap-6">
            <CustomerInfoCard customer={viewCustomer} vipPlanName={tierName(viewCustomer.vipPlan)} ownerName={ownerName} recommenderName={recommenderName} referralReference={ownRecord ? customer.referralReference : null} />
            <LinkedRecordsCard
              contractLabel={contract ? recordLabel(tierName(contract.productCode) ?? EMPTY, contract.schemeLabel, humanize(contract.status)) : "—"}
              contractHref={contract ? contractHref(contract.id) : null}
              saleLabel={sale ? recordLabel(humanize(sale.status), customer.displayName, tierName(contract?.productCode)) : "—"}
              membershipLabel={membership ? humanize(membership.status) : "—"}
              saleValueCentavos={sale?.valueCentavos ?? null}
              showSaleValue={ownRecord && sale != null}
            />
          </div>
          <div className="tw:min-w-0 tw:lg:col-span-2 tw:flex tw:flex-col tw:gap-6">
            <CustomerProgressCard
              submittedAt={customer.submittedAt ?? null}
              contractStatus={contract?.status ?? null}
              membershipStatus={membership?.status ?? null}
            />
            <RecentActivityCard items={activity} onViewAll={() => setTab("audit")} />
          </div>
        </div>
      ) : null}
      {tab === "contract" ? (
        contract ? (
          <ContractTabPanel
            facts={[
              { label: "Contract", value: recordLabel("Contract", customer.displayName, tierName(contract.productCode)) },
              { label: "VIP plan", value: tierName(contract.productCode) ?? EMPTY },
              { label: "Payment plan", value: contract.schemeLabel },
              { label: "Status", value: humanize(contract.status) },
              { label: "Contract type", value: contract.classification === "N" ? "Non-Standard (N)" : "Standard (S)" },
            ]}
            contractHref={contractHref(contract.id)}
          />
        ) : (
          <ContractTabPanel facts={[{ label: "Contract", value: "—" }]} contractHref={null} />
        )
      ) : null}
      {tab === "sales" ? (
        <SalesTabPanel
          facts={[
            { label: "Sale", value: sale ? recordLabel(humanize(sale.status), customer.displayName, tierName(contract?.productCode)) : "—" },
            { label: "Recorded", value: sale?.recordedDate ?? "—" },
            { label: "Confirmed", value: sale?.confirmedDate ?? "—" },
          ]}
          saleValueCentavos={ownRecord ? (sale?.valueCentavos ?? null) : null}
        />
      ) : null}
      {tab === "membership" ? (
        <MembershipTabPanel
          status={membership?.status ?? "pending"}
          cardId={ownRecord ? (membership?.cardId ?? null) : null}
          validUntil={membership?.validityEndDate ?? null}
          onHold={membership?.financialHold ?? false}
        />
      ) : null}
      {tab === "audit" ? <AuditTabPanel events={auditEvents} authorized={canReadAudit && !audit.error} /> : null}
      {preparing && canStartPurchase ? <PrepareContractDialog customer={customer} repeatPurchase={preparing === "separate"} open onClose={() => setPreparing(null)} /> : null}
      <ConfirmDialog
        open={discarding}
        title={actionSet.deleteTitle ?? "Discard this draft?"}
        description={actionSet.deleteDescription ?? "This action cannot be undone."}
        confirmText="Discard Draft"
        danger
        pending={discard.isPending}
        onClose={() => setDiscarding(false)}
        onConfirm={() => {
          discard.mutateAsync(customer.id).then(
            () => {
              setDiscarding(false);
              toast.success(`${actionSet.itemName} deleted successfully.`);
              router.push("/admin/customers");
            },
            (failure) => {
              setDiscarding(false);
              toast.error("Delete failed.", { description: failure instanceof Error ? failure.message : "Request failed." });
            },
          );
        }}
      />
      <ConfirmDialog
        open={review === "approve"}
        title="Approve This Registration?"
        description="The customer registration is approved. This does not activate a VIP membership."
        confirmText="Approve" tone="success"
        pending={approve.isPending}
        onClose={() => setReview(null)}
        onConfirm={() => {
          approve.mutateAsync(customer.id).then(
            () => {
              toast.success("Registration approved.");
              setReview(null);
            },
            (failure) => {
              // Attribution problems (closing seller, referral reference) are listed so the Clerk can fix them.
              const detail = failure instanceof CustomerValidationError ? Object.values(failure.errors).filter(Boolean).join(" ") : failure instanceof Error ? failure.message : "Request failed.";
              toast.error(detail);
              setReview(null);
            },
          );
        }}
      />
      <ReasonDialog
        open={review === "send_back"}
        title="Send Back to the Clerk"
        description="The Clerk sees the reason and can fix and resubmit. Nothing is deleted."
        confirmText="Send Back" tone="warning"
        successText="Sent back to the Clerk."
        onClose={() => setReview(null)}
        onSubmit={(reason) => sendBack.mutateAsync({ id: customer.id, reason })}
      />
      <ReasonDialog
        open={review === "reject"}
        title="Reject This Registration"
        description="Rejecting keeps the record and its history. Nothing is deleted."
        confirmText="Reject"
        successText="Registration rejected."
        danger
        onClose={() => setReview(null)}
        onSubmit={(reason) => reject.mutateAsync({ id: customer.id, reason })}
      />
    </AdminPage>
  );
}
