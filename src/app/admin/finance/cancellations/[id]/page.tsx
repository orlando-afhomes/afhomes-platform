import { FinanceCancellationDetailRoute } from "@/panels/admin/pages/business-routes";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return <FinanceCancellationDetailRoute />;
}
