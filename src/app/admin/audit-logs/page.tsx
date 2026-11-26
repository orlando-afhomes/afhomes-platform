import { AuditLogsPage } from "@/panels/admin/pages/audit-logs-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return <AuditLogsPage />;
}
