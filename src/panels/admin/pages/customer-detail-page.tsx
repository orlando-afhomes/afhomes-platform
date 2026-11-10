"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useContracts, useMemberships, useOperation, useSales } from "@/data/business-queries";
import { useCustomers, useMembers } from "@/data/queries";
import { useAuditEvents } from "@/data/queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { buttonVariants, Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
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
  const recommender = members.data?.find((item) => item.id === customer?.recommenderMemberId);
  const audit = useAuditEvents({ relatedRecordId: customerId, pageSize: 20 });

  const activity = useMemo(() => {
    const items: { id: string; label: string; timestamp: string }[] = [];
    if (customer?.submittedAt) {
      items.push({ id: `${customer.id}-submitted`, label: "Customer record submitted", timestamp: customer.submittedAt });
    }
    for (const event of contract?.history ?? []) {
      items.push({ id: `${contract?.id}-${event.at}-${event.event}`, label: event.event.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), timestamp: event.at });
    }
    if (sale?.confirmedDate) {
      items.push({ id: `${sale.id}-confirmed`, label: `Sale confirmed (${sale.id})`, timestamp: sale.confirmedDate });
    }
    for (const event of membership?.history ?? []) {
      items.push({ id: `${membership?.id}-${event.at}-${event.event}`, label: event.event.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), timestamp: event.at });
    }
    return items
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 3);
  }, [customer, contract, sale, membership]);

  if (customers.isLoading) {
    return (
      <AdminPage anyOf={["customers"]} title="Customer" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <Skeleton className="tw:h-48 tw:w-full" />
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
  const schemeLabel = contract?.schemeLabel ?? customer.paymentSchemeId ?? null;
  const auditEvents = (audit.data?.items ?? []).map((event) => ({
    id: event.id,
    label: event.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    timestamp: event.timestamp,
  }));

  return (
    <AdminPage
      anyOf={["customers"]}
      title={customer.displayName}
      description="Customer record and related business information."
      crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customer.displayName }]}
      actions={
        <>
          {canManage && ownRecord ? (
            <Link href={`/admin/customers/${customer.id}/edit`} className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
              <Pencil aria-hidden="true" /> {customer.status === "draft" ? "Edit draft" : "Correct data"}
            </Link>
          ) : null}
          {canPrepare && ownRecord && customer.status === "submitted" && !contract ? (
            <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setPreparing(true)}>
              Prepare contract
            </Button>
          ) : null}
        </>
      }
    >
      {customer.restricted ? <InfoNote title="Summary view">This customer belongs to your downline. Contact details, address, government ID and payment details are not shown.</InfoNote> : null}
      <CustomerDetailHero
        displayName={customer.displayName}
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
            <CustomerInfoCard customer={viewCustomer} ownerName={ownerName} recommenderName={recommenderName} />
            <LinkedRecordsCard
              contractLabel={contract ? `${contract.productCode} · ${contract.schemeLabel} · ${contract.status.replace(/_/g, " ")}` : customer.status === "submitted" ? "No contract yet" : "—"}
              contractHref={contract ? contractHref(contract.id) : null}
              saleLabel={sale ? `${sale.status} · ${sale.id}` : "No sale yet"}
              membershipLabel={membership ? membership.status : "No membership yet"}
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
              { label: "Contract", value: contract.id.toUpperCase() },
              { label: "VIP plan", value: contract.productCode },
              { label: "Scheme", value: contract.schemeLabel },
              { label: "Status", value: contract.status.replace(/_/g, " ") },
              { label: "Classification", value: customer.contractClassification === "N" ? "Non-Standard (N)" : customer.contractClassification === "S" ? "Standard (S)" : "—" },
            ]}
            contractHref={contractHref(contract.id)}
          />
        ) : (
          <ContractTabPanel facts={[{ label: "Contract", value: customer.status === "submitted" ? "No contract yet" : "—" }]} contractHref={null} />
        )
      ) : null}
      {tab === "sales" ? (
        <SalesTabPanel
          facts={[
            { label: "Sale", value: sale ? `${sale.status} · ${sale.id}` : "No sale yet" },
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
      {canPrepare && ownRecord && customer.status === "submitted" && !contract ? <PrepareContractDialog customer={customer} open={preparing} onClose={() => setPreparing(false)} /> : null}
    </AdminPage>
  );
}
