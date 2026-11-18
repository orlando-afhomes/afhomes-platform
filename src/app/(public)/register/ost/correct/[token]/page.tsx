import { Suspense } from "react";
import { OstCorrectionPage } from "@/panels/public/pages/ost-correction-page";

// The private correction link is client state; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading your application…</p>}>
      <OstCorrectionPage />
    </Suspense>
  );
}
