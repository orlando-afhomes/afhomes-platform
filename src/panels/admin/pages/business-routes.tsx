"use client";

import { useParams } from "next/navigation";
import { ContractDetailPage } from "./contract-detail-page";
import { CustomerDetailPage } from "./customer-detail-page";
import { CustomerFormPage } from "./customer-form-page";

/** Route-level adapters: read the dynamic segment on the client, as the member detail page does. */
export function CustomerDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <CustomerDetailPage customerId={id} />;
}

export function CustomerEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <CustomerFormPage customerId={id} />;
}

export function ContractDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ContractDetailPage contractId={id} />;
}
