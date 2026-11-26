import { redirect } from "next/navigation";
import type { AreaRedirectPageProps } from "@/panels/admin/area-redirect";
import { CUSTOMER_LOOKUP_HREF } from "@/panels/admin/navigation";
import { Suspense } from "react";
import { CustomersAreaPage } from "@/panels/admin/pages/customers-area-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page({ searchParams }: Partial<AreaRedirectPageProps>) {
  return (
    <Suspense>
      {searchParams ? <CustomersRoute searchParams={searchParams} /> : <CustomersAreaPage />}
    </Suspense>
  );
}

async function CustomersRoute({ searchParams }: AreaRedirectPageProps) {
  if ((await searchParams).tab === "lookup") redirect(CUSTOMER_LOOKUP_HREF);
  return <CustomersAreaPage />;
}
