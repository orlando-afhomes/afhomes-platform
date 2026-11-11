"use client";

import { useCustomers } from "@/data/queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Skeleton } from "@/shared/ui/skeleton";
import { AdminPage } from "@/shared/components/admin";
import { CustomerApplicationWizard } from "./customer-application-wizard";

/**
 * New and Edit customer share one layout: the same stepped application wizard.
 * Editing pre-fills the wizard from the saved record; submitted customers are
 * saved through the audited correction workflow.
 */
export function CustomerFormPage({ customerId }: { customerId?: string }) {
  const customers = useCustomers();
  const existing = customerId ? customers.data?.find((item) => item.id === customerId) : undefined;
  const loading = Boolean(customerId) && customers.isLoading;
  return (
    <AdminPage anyOf={["customers"]} title={customerId ? "Edit customer" : "New customer"} description={customerId ? "VIP application details. A draft can be saved incomplete." : "Choose a VIP card, then complete the application."} crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customerId ? "Edit" : "New" }]}>
      {loading ? (
        <Skeleton className="tw:h-64 tw:w-full" />
      ) : customerId && !existing ? (
        <InfoNote title="Customer not found">This customer does not exist or is not visible to this account.</InfoNote>
      ) : (
        <CustomerApplicationWizard key={existing?.id ?? "new"} existing={existing} />
      )}
    </AdminPage>
  );
}
