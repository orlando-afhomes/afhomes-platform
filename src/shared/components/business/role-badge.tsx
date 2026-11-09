import { Badge } from "@/shared/ui/badge";
import { getRoleBadgeStyle } from "@/shared/utils/role-badge";

/**
 * Distinct pastel badge per role id with dark, readable text. The label is
 * supplied by the caller so shared components never import panel helpers.
 */
export function RoleBadge({ roleId, label, className }: { roleId: string; label: string; className?: string }) {
  return (
    <Badge variant="outline" style={getRoleBadgeStyle(roleId)} className={className}>
      {label}
    </Badge>
  );
}
