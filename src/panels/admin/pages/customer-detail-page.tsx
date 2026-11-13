"use client";

import { customerRecordName } from "@/modules/customers/rules";
import { humanize } from "@/shared/lib/humanize";
import { recordLabel } from "@/shared/lib/record-label";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { useApproveCustomer, useContracts, useMemberships, useOperation, useRejectCustomer, useSales, useSendBackCustomer } from "@/data/business-queries";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { canReviewRegistration } from "@/modules/customers/review";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { toast } from "sonner";
import { useCustomers, useMembers } from "@/data/queries";
import { useAuditEvents } from "@/data/queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { buttonVariants, Button } from "@/shared/ui/button";
import { DetailSkeleton } from "@/shared/components/modern/skeletons";
import { AdminPage } from "@/shared/components/admin";
import { PrepareContractDialog } from "../components/prepare-contract-dialog";
import { useContractHref } from "../components/use-contract-href";
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
  const customers = useCustomers();
  const members = useMembers();
  const contracts = useContracts();
  const sales = useSales();
  const memberships = useMemberships();
  const canManage = useOperation("customers.manage");
  const canDraft = useOperation("customers.draft");
  const canApprove = useOperation("customers.approve");
  const approve = useApproveCustomer();
  const sendBack = useSendBackCustomer();
  const reject = useRejectCustomer();
  const [review, setReview] = useState<"approve" | "send_back" | "reject" | null>(null);
  const canPrepare = useOperation("contracts.prepare");
  const canReadAudit = useOperation("audit.read");
  const contractHref = useContractHref();
  const [preparing, setPreparing] = useState(false);
  const [tab, setTab] = useState<CustomerDetailTab>("overview");

  const customer = customers.data?.find((item) => item.id === customerId);
  const contract = contracts.data?.find((item) => item.customerId === customerId && item.status !== "cancelled");
  const sale = sales.data?.find((item) => item.customerId === customerId);
  const membership = memberships.data?.find((item) => item.customerId === customerId);
  const owner = members.data?.find((item) => item.id === customer?.ownerMemberId);
  const recommender = members.data?.find((item) => item.id === (customer?.referrerMemberId || customer?.recommenderMemberId));
  const audit = useAuditEvents({ relatedRecordId: customerId, pageSize: 20 });

  const activity = useMemo(() => {
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
      items.push({ id: `${sale.id}-confirmed`, label: recordLabel("Sale confirmed", customer?.displayName, contract?.productCode), timestamp: sale.confirmedDate });
    }
    for (const event of membership?.history ?? []) {
      items.push({ id: `${membership?.id}-${event.at}-${event.event}`, label: humanize(event.event), timestamp: event.at });
    }
    return items
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 3);
  }, [customer, contract, sale, membership]);

  if (customers.isLoading) {
    return (
      <AdminPage anyOf={["customers"]} title="Customer" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <DetailSkeleton />
      </AdminPage>
    );
  }
  if (!customer) {
    return (
      <AdminPage anyOf={["customers"]} title="Customer not found" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <InfoNote>This customer does not exist or is not visible to this account.</InfoNote>
      </AdminPage>
    );
  }

  const ownRecord = !customer.restricted;
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
  const schemeLabel = contract?.schemeLabel ?? (customer.paymentSchemeId ? humanize(customer.paymentSchemeId) : null);
  const auditEvents = (audit.data?.items ?? []).map((event) => ({
    id: event.id,
    label: humanize(event.action),
    timestamp: event.timestamp,
  }));

  return (
    <AdminPage
      anyOf={["customers"]}
      title={customerRecordName(customer)}
      description="Customer record and related business information."
      crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customerRecordName(customer) }]}
      actions={
        <>
          {ownRecord && (canManage || (canDraft && customer.status === "draft")) && customer.status !== "rejected" ? (
            <Link href={`/admin/customers/${customer.id}/edit`} className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
              <Pencil aria-hidden="true" /> {customer.status === "draft" ? "Edit draft" : customer.status === "sent_back" ? "Fix and resubmit" : "Correct data"}
            </Link>
          ) : null}
          {canApprove && canReviewRegistration(customer.status) ? (
            <>
              <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("approve")}>
                <Check aria-hidden="true" /> Approve
              </Button>
              <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("send_back")}>
                <RotateCcw aria-hidden="true" /> Send back
              </Button>
              <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setReview("reject")}>
                <X aria-hidden="true" /> Reject
              </Button>
            </>
          ) : null}
          {canPrepare && ownRecord && (customer.status === "submitted" || customer.status === "approved") && !contract ? (
            <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setPreparing(true)}>
              Prepare contract
            </Button>
          ) : null}
        </>
      }
    >
      {customer.status === "draft" && ownRecord && !canManage ? <InfoNote title="Draft with the office">The office Clerk completes and submits this draft. You can keep editing it until then.</InfoNote> : null}
      {customer.status === "sent_back" && customer.reviewReason ? <InfoNote title="Sent back to the Clerk">{customer.reviewReason}</InfoNote> : null}
      {customer.status === "rejected" && customer.reviewReason ? <InfoNote title="Rejected">{customer.reviewReason}</InfoNote> : null}
      {customer.restricted ? <InfoNote title="Summary view">This customer belongs to your downline. Contact details, address, government ID and payment details are not shown.</InfoNote> : null}
      <CustomerDetailHero
        displayName={customerRecordName(customer)}
        status={customer.status}
        vipPlan={customer.vipPlan ?? null}
        customerNumber={ownRecord ? (customer.customerNumber ?? null) : null}
        submittedAt={customer.submittedAt ?? null}
        classification={customer.contractClassification ?? null}
        schemeLabel={schemeLabel}
      />
      <CustomerDetailTabs value={tab} onChange={setTab} />
      {tab === "overview" ? (
        <div className="tw:grid tw:gap-6 tw:lg:grid-cols-5">
          <div className="tw:min-w-0 tw:lg:col-span-3 tw:flex tw:flex-col tw:gap-6">
            <CustomerInfoCard customer={viewCustomer} ownerName={ownerName} recommenderName={recommenderName} referralReference={ownRecord ? customer.referralReference : null} />
            <LinkedRecordsCard
              contractLabel={contract ? `${contract.productCode} · ${contract.schemeLabel} · ${humanize(contract.status)}` : customer.status === "submitted" || customer.status === "approved" ? "No contract yet" : "—"}
              contractHref={contract ? contractHref(contract.id) : null}
              saleLabel={sale ? recordLabel(humanize(sale.status), customer.displayName, contract?.productCode) : "No sale yet"}
              membershipLabel={membership ? humanize(membership.status) : "No membership yet"}
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
              { label: "Contract", value: recordLabel("Contract", customer.displayName, contract.productCode) },
              { label: "VIP plan", value: contract.productCode },
              { label: "Scheme", value: contract.schemeLabel },
              { label: "Status", value: humanize(contract.status) },
              { label: "Classification", value: customer.contractClassification === "N" ? "Non-Standard (N)" : customer.contractClassification === "S" ? "Standard (S)" : "—" },
            ]}
            contractHref={contractHref(contract.id)}
          />
        ) : (
          <ContractTabPanel facts={[{ label: "Contract", value: customer.status === "submitted" || customer.status === "approved" ? "No contract yet" : "—" }]} contractHref={null} />
        )
      ) : null}
      {tab === "sales" ? (
        <SalesTabPanel
          facts={[
            { label: "Sale", value: sale ? recordLabel(humanize(sale.status), customer.displayName, contract?.productCode) : "No sale yet" },
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
      {canPrepare && ownRecord && (customer.status === "submitted" || customer.status === "approved") && !contract ? <PrepareContractDialog customer={customer} open={preparing} onClose={() => setPreparing(false)} /> : null}
      <ConfirmDialog
        open={review === "approve"}
        title="Approve this registration?"
        description="The customer registration is approved. This does not activate a VIP membership."
        confirmText="Approve"
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
        title="Send back to the Clerk"
        description="The Clerk sees the reason and can fix and resubmit. Nothing is deleted."
        confirmText="Send back"
        successText="Sent back to the Clerk."
        onClose={() => setReview(null)}
        onSubmit={(reason) => sendBack.mutateAsync({ id: customer.id, reason })}
      />
      <ReasonDialog
        open={review === "reject"}
        title="Reject this registration"
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
