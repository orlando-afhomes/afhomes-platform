import { Suspense } from "react";
import { AccreditationVerificationPage } from "@/panels/public/pages/accreditation-verification-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import { FormSkeleton } from "@/shared/components/modern/skeletons";
import { Skeleton } from "@/shared/ui/skeleton";
import "@/panels/public/public.css";

export default function Page() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div role="status" aria-busy="true" className="tw:mx-auto tw:flex tw:w-full tw:max-w-xl tw:flex-col tw:gap-4 tw:px-4 tw:py-10">
            <span className="tw:sr-only">Loading…</span>
            <Skeleton className="tw:h-8 tw:w-2/3" />
            <FormSkeleton fields={1} />
          </div>
        }
      >
        <AccreditationVerificationPage />
      </Suspense>
    </PublicLayout>
  );
}
