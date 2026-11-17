import "@/panels/admin/pages/customer-lookup.css";
import { CustomerLookupPage } from "@/panels/admin/pages/customer-lookup-panel";

// The staff identity is resolved by the client-side prototype auth gate.
export const instant = false;

export default function Page() {
  return <CustomerLookupPage />;
}
