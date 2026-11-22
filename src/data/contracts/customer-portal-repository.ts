import type { PortalContactInput, PortalCustomer, PortalOverview } from "@/modules/customer-portal/types";

/**
 * Browser-memory customer portal. The repository is bound to the signed-in mock
 * customer, so a caller cannot ask for another customer's profile, balances or QR.
 */
export interface CustomerPortalRepository {
  sampleCustomers(): PortalCustomer[];
  findCustomerByEmail(email: string): PortalCustomer | undefined;
  /** Mock sign-in; undefined when the email or password is wrong. */
  authenticate(email: string, password: string): PortalCustomer | undefined;
  /** Sets or (with null) removes the signed-in customer's own profile picture; images only, 2MB or smaller. */
  updateProfilePhoto(photo: { dataUrl: string; fileName: string } | null): PortalOverview;
  /** The signed-in customer's own overview; throws when signed out. */
  overview(): PortalOverview;
  /** Updates only the signed-in customer's contact fields. */
  updateContact(input: PortalContactInput): PortalOverview;
}
