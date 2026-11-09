"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useContracts, useMemberships, useOperation, useSales } from "@/data/business-queries";
import { useCustomers, useMembers } from "@/data/queries";
import { InfoNote, DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { buttonVariants, Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { LinkedBusinessRecords, type LinkedRecordItem } from "../components/linked-business-records";
import { ModulePage } from "../components/module-page";
import { BizBadge, Money, Section, formatDate } from "../components/business-ui";
import { PrepareContractDialog } from "../components/prepare-contract-dialog";
import { useContractHref } from "../components/use-contract-href";

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const customers = useCustomers();
  const members = useMembers();
  const contracts = useContracts();
  const sales = useSales();
  const memberships = useMemberships();
  const canManage = useOperation("customers.manage");
  const canPrepare = useOperation("contracts.prepare");
  const contractHref = useContractHref();
  const [preparing, setPreparing] = useState(false);

  const customer = customers.data?.find((item) => item.id === customerId);
  const contract = contracts.data?.find((item) => item.customerId === customerId && item.status !== "cancelled");
  const sale = sales.data?.find((item) => item.customerId === customerId);
  const membership = memberships.data?.find((item) => item.customerId === customerId);
  const owner = members.data?.find((item) => item.id === customer?.ownerMemberId);
  const recommender = members.data?.find((item) => item.id === customer?.recommenderMemberId);

  if (customers.isLoading) {
    return (
      <ModulePage anyOf={["customers"]} title="Customer" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <Skeleton className="tw:h-48 tw:w-full" />
      </ModulePage>
    );
  }
  if (!customer) {
    return (
      <ModulePage anyOf={["customers"]} title="Customer not found" crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "Detail" }]}>
        <InfoNote>This customer does not exist or is not visible to this account.</InfoNote>
      </ModulePage>
    );
  }

  const ownRecord = !customer.restricted;
  const linked: LinkedRecordItem[] = [
    {
      key: "contract",
      label: "Contract",
      state: contract ? "linked" : customer.status === "submitted" ? "not-linked" : "missing",
      content: contract ? `${contract.productCode} · ${contract.schemeLabel} · ${contract.status.replace(/_/g, " ")}` : undefined,
      href: contract ? contractHref(contract.id) : undefined,
      linkLabel: "Open contract",
    },
    { key: "sale", label: "Sale", state: sale ? "linked" : "not-linked", content: sale ? `${sale.status} · ${sale.id}` : undefined },
    {
      key: "membership",
      label: "VIP membership",
      state: membership ? "linked" : "not-linked",
      content: membership ? `${membership.status}${membership.cardId ? ` · Card ${membership.cardId}` : ""}` : undefined,
    },
  ];

  return (
    <ModulePage
      anyOf={["customers"]}
      title={customer.displayName}
      description="Customer record"
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
      <Section title="Summary">
        <DetailList>
          <DetailRow term="Status">
            <BizBadge status={customer.status} />
          </DetailRow>
          <DetailRow term="VIP plan">{customer.vipPlan ?? "—"}</DetailRow>
          {ownRecord ? (
            <>
              <DetailRow term="Customer ID">{customer.customerNumber ?? "Not assigned"}</DetailRow>
              <DetailRow term="Scheme">{contract?.schemeLabel ?? customer.paymentSchemeId ?? "—"}</DetailRow>
              <DetailRow term="Classification">{customer.contractClassification === "N" ? "Non-Standard (N)" : customer.contractClassification === "S" ? "Standard (S)" : "—"}</DetailRow>
              <DetailRow term="Mobile">{customer.mobileNumber ?? "—"}</DetailRow>
              <DetailRow term="Email">{customer.email ?? "—"}</DetailRow>
              <DetailRow term="Address">{customer.address ? [customer.address.street, customer.address.barangay, customer.address.city, customer.address.province].filter(Boolean).join(", ") : "—"}</DetailRow>
              <DetailRow term="Date of birth">{formatDate(customer.dateOfBirth)}</DetailRow>
              <DetailRow term="Channel">{customer.acquisitionChannel ?? "—"}</DetailRow>
              <DetailRow term="Recommender">{recommender?.displayName ?? "—"}</DetailRow>
              <DetailRow term="Submitted">{formatDate(customer.submittedAt)}</DetailRow>
            </>
          ) : null}
          <DetailRow term="Seller">{owner?.displayName ?? "Company"}</DetailRow>
        </DetailList>
      </Section>
      <Section title="Linked records" description="Contract, sale and membership connected to this customer.">
        <LinkedBusinessRecords items={linked} />
      </Section>
      {sale && ownRecord ? (
        <p className="tw:text-sm tw:text-muted-foreground">
          Sale value <Money value={sale.valueCentavos} />
        </p>
      ) : null}
      {canPrepare && ownRecord && customer.status === "submitted" && !contract ? <PrepareContractDialog customer={customer} open={preparing} onClose={() => setPreparing(false)} /> : null}
    </ModulePage>
  );
}
