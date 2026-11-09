"use client";

import { useParams } from "next/navigation";
import { ContractReviewDetailPage } from "./contract-review-detail-page";
import { CustomerDetailPage } from "./customer-detail-page";
import { CustomerFormPage } from "./customer-form-page";
import { FinanceCancellationDetailPage } from "./finance-cancellation-detail-page";
import { FinanceCollectionDetailPage } from "./finance-collection-detail-page";
import { SalesContractDetailPage } from "./sales-contract-detail-page";

/** Route-level adapters: read the dynamic segment on the client, as the member detail page does. */
export function CustomerDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <CustomerDetailPage customerId={id} />;
}

export function CustomerEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <CustomerFormPage customerId={id} />;
}

export function SalesContractDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <SalesContractDetailPage contractId={id} />;
}

export function ContractReviewDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ContractReviewDetailPage contractId={id} />;
}

export function FinanceCollectionDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <FinanceCollectionDetailPage contractId={id} />;
}

export function FinanceCancellationDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <FinanceCancellationDetailPage contractId={id} />;
}
