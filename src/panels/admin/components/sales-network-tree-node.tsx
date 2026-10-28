import { Tag } from "antd";
import type { OrgMember } from "@/modules/organization/types";
import {
  aaDisplay,
  DESIGNATION_COLORS,
  teamDisplayName,
} from "@/modules/sales-network/display";
import type { GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { StatusBadge } from "@/shared/components/layout/status-badge";
import "./sales-network-tree-node.css";

/**
 * Shared genealogy node content (the equivalent of one
 * `.ant-tree-list-holder-inner` row). Full mode shows name, official AA
 * number, designation, inherited Team, member status, and downline counts
 * (member detail downline tree). Compact mode (genealogy tree) hides counts,
 * AA number, and status, and shows the Team name on SVD roots only.
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
    <span className="genealogy-node">
      <span className="genealogy-node__name">{node.member.displayName}</span>
      {compact ? null : <span className="genealogy-node__aa">{aaDisplay(node.member)}</span>}
      <Tag color={DESIGNATION_COLORS[node.member.designation]} className="genealogy-node__designation">
        {node.member.designation}
      </Tag>
      {showTeam ? <span className="genealogy-node__team">{teamDisplayName(node.member, members)}</span> : null}
      {compact ? null : (
        <StatusBadge status={node.member.status} className="genealogy-node__status" />
      )}
      {compact ? null : (
        <span className="genealogy-node__counts">
          {node.directCount} direct / {node.totalDescendantCount} total
        </span>
      )}
      {node.restrictedParent ? <span className="genealogy-node__restricted">Restricted upline</span> : null}
    </span>
  );
}
