import { Suspense } from "react";
import { redirectToContractsReview, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";
import { SalesAreaPage } from "@/panels/admin/pages/sales-area-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

async function SalesContent({ searchParams }: AreaRedirectPageProps) {
  const query = await searchParams;
  if (query.tab === "contract-review") {
    return redirectToContractsReview(query);
  }
  return <SalesAreaPage />;
}

export default function Page({ searchParams }: AreaRedirectPageProps) {
  return (
    <Suspense>
      <SalesContent searchParams={searchParams} />
    </Suspense>
  );
}
