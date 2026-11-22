import type { PortalContactInput, PortalCustomer, PortalOverview } from "@/modules/customer-portal/types";

/** Browser-memory customer portal. Every read takes an already-resolved customer id. */
export interface CustomerPortalRepository {
  sampleCustomers(): PortalCustomer[];
  findCustomerByEmail(email: string): PortalCustomer | undefined;
  overview(customerId: string): PortalOverview;
  updateContact(customerId: string, input: PortalContactInput): PortalOverview;
}
