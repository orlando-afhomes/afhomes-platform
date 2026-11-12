import { Suspense } from "react";
import { SalesLoginPage } from "@/panels/public/pages/sales-login-page";

// Sign-in state is client-side; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading sign in…</p>}>
      <SalesLoginPage />
    </Suspense>
  );
}
