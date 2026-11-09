import { Suspense } from "react";
import { AccreditationVerificationPage } from "@/panels/public/pages/accreditation-verification-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

export default function Page() {
  return (
    <PublicLayout>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <AccreditationVerificationPage />
      </Suspense>
    </PublicLayout>
  );
}
