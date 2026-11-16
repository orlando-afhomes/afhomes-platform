"use client";

import { FileText, ReceiptText, Users } from "lucide-react";
import { useContracts, usePayments } from "@/data/business-queries";
import { useCustomers } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { DashboardHeader } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";

/** Clerk to-do list: what needs the Clerk's own attention. Each count links to the page where it is handled. */
export function ClerkDashboard() {
  const { identity } = useDevIdentity();
  const payments = usePayments();
  const contracts = useContracts();
  const customers = useCustomers();

  const returnedReceipts = (payments.data ?? []).filter((payment) => payment.status === "returned" && payment.submittedBy === identity.id).length;
  const openContracts = (contracts.data ?? []).filter((contract) => contract.status === "draft" || contract.status === "returned").length;
  const openCustomers = (customers.data ?? []).filter((customer) => customer.status === "draft" || customer.status === "sent_back").length;

  return (
    <>
      <DashboardHeader title="My To-Do List" description="Work waiting for you." />
      <div className="tw:mt-6 tw:max-w-2xl">
        <DashboardPendingActions title="To Do" description="Open an item to finish it">
          <DashboardPendingItem
            href="/admin/sales?tab=contracts"
            label="Returned receipts to correct"
            count={returnedReceipts}
            icon={ReceiptText}
            tone="accent"
            loading={payments.isLoading}
            error={payments.error}
          />
          <DashboardPendingItem
            href="/admin/sales?tab=contracts"
            label="Contracts to finish or fix"
            count={openContracts}
            icon={FileText}
            tone="info"
            loading={contracts.isLoading}
            error={contracts.error}
          />
          <DashboardPendingItem
            href="/admin/customers"
            label="Customers to finish or fix"
            count={openCustomers}
            icon={Users}
            tone="brand"
            loading={customers.isLoading}
            error={customers.error}
          />
        </DashboardPendingActions>
      </div>
    </>
  );
}
