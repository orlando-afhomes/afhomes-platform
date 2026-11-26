import { Suspense } from "react";
import { redirectToContractsReview, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";
import { SalesAreaPage } from "@/panels/admin/pages/sales-area-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
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
