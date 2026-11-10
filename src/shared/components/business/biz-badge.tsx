import { StatusPillForStatus } from "@/shared/components/admin/status-pill";

/** Business status badge: readable text first, icon + tone only reinforce it. */
export function BizBadge({ status, label }: { status: string; label?: string }) {
  return <StatusPillForStatus status={status} label={label} />;
}
