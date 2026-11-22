import type { Metadata } from "next";
import { CustomerPortalProvider } from "@/shared/providers/customer-portal-provider";

export const metadata: Metadata = {
  title: "Customer Portal | AFhomes",
  description: "Prototype customer portal for AFhomes VIP membership, points and contact information.",
};

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  return <CustomerPortalProvider>{children}</CustomerPortalProvider>;
}
