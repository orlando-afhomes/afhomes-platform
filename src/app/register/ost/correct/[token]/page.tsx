import { Suspense } from "react";
import { OstCorrectionPage } from "@/panels/public/pages/ost-correction-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

// The private correction link is client state; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <PublicLayout>
      <Suspense fallback={<p role="status">Loading your application…</p>}>
        <OstCorrectionPage />
      </Suspense>
    </PublicLayout>
  );
}
