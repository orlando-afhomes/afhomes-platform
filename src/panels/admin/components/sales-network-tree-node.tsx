import type { OrgMember } from "@/modules/organization/types";
import { aaDisplay, teamDisplayName } from "@/modules/sales-network/display";
import type { GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { formatDate } from "@/shared/lib/format-date";
import { DesignationBadge } from "@/shared/components/business/designation-badge";

/**
 * Shared genealogy node content. Full mode shows name, official AA number,
 * designation, inherited Team, member status, and downline counts (member
 * detail downline tree). Compact mode (genealogy tree) hides counts, AA
 * number, and status, and shows the Team name on SVD roots only.
 */
export function SalesNetworkTreeNodeTitle({
  node,
  members,
  compact = false,
  vacantSince = null,
}: {
  node: GenealogyTreeNode;
  members: readonly OrgMember[];
  compact?: boolean;
  /** Date-only start of an open seat vacancy; shows a read-only "Vacant since" indicator. */
  vacantSince?: string | null;
}) {
  const showTeam = !compact || node.member.designation === "SVD";
  return (
    <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1">
      <span className="tw:font-medium">{node.member.displayName}</span>
      {compact ? null : <span className="tw:text-xs tw:text-muted-foreground">{aaDisplay(node.member)}</span>}
      <DesignationBadge designation={node.member.designation} />
      {showTeam ? <span className="tw:text-xs tw:text-muted-foreground">{teamDisplayName(node.member, members)}</span> : null}
      {compact ? null : <StatusBadge status={node.member.status} />}
      {compact ? null : (
        <span className="tw:text-xs tw:text-muted-foreground">
          {node.directCount} direct / {node.totalDescendantCount} total
        </span>
      )}
      {vacantSince ? <ToneBadge tone="warning">Vacant since {formatDate(vacantSince)}</ToneBadge> : null}
      {node.restrictedParent ? <span className="tw:text-xs tw:text-muted-foreground tw:italic">Restricted upline</span> : null}
    </span>
  );
}
