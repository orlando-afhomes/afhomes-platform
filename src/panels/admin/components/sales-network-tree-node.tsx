import type { OrgMember } from "@/modules/organization/types";
import { aaDisplay, teamDisplayName } from "@/modules/sales-network/display";
import type { GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { DesignationBadge } from "./sales-badges";

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
}: {
  node: GenealogyTreeNode;
  members: readonly OrgMember[];
  compact?: boolean;
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
      {node.restrictedParent ? <span className="tw:text-xs tw:text-muted-foreground tw:italic">Restricted upline</span> : null}
    </span>
  );
}
