import type { OrgMember } from "@/modules/organization/types";
import { aaDisplay, teamDisplayName, UNASSIGNED_TEAM } from "@/modules/sales-network/display";
import type { GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { formatDate } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

/** Initials chip colors by position; they match the position badges (violet, blue, teal, orange). */
const CHIP_CLASS: Record<OrgMember["designation"], string> = {
  SVD: "tw:bg-(--badge-violet)/15 tw:text-(--badge-violet) tw:dark:text-[color-mix(in_oklch,var(--badge-violet),white_45%)]",
  SSM: "tw:bg-(--badge-blue)/15 tw:text-(--badge-blue) tw:dark:text-[color-mix(in_oklch,var(--badge-blue),white_45%)]",
  SM: "tw:bg-(--badge-teal)/15 tw:text-(--badge-teal) tw:dark:text-[color-mix(in_oklch,var(--badge-teal),white_45%)]",
  OST: "tw:bg-(--badge-orange)/15 tw:text-(--badge-orange) tw:dark:text-[color-mix(in_oklch,var(--badge-orange),white_45%)]",
};

/** The position color as a ring: it stays visible on a real photo, where a tinted background would be hidden. */
export const RING_CLASS: Record<OrgMember["designation"], string> = {
  SVD: "tw:ring-(--badge-violet)",
  SSM: "tw:ring-(--badge-blue)",
  SM: "tw:ring-(--badge-teal)",
  OST: "tw:ring-(--badge-orange)",
};

const number = new Intl.NumberFormat("en-PH");

function initialsOf(name: string): string {
  return name.split(/\s+/).map((part) => part.charAt(0)).slice(0, 2).join("").toUpperCase();
}

/** Member photo (or initials) inside a ring in the position color. `lg` is for the summary panel. */
export function MemberAvatar({ member, size = "sm" }: { member: Pick<OrgMember, "displayName" | "designation" | "sellerProfile">; size?: "sm" | "lg" }) {
  const photo = member.sellerProfile?.profilePhotoUrl;
  return (
    <span aria-hidden="true" className={cn("tw:inline-flex tw:shrink-0 tw:rounded-full tw:bg-card tw:p-0.5 tw:ring-2", RING_CLASS[member.designation])}>
      <Avatar className={cn(size === "lg" ? "tw:size-14 tw:text-base" : "tw:size-8 tw:text-xs", "tw:font-bold", !photo && CHIP_CLASS[member.designation])}>
        {photo ? <AvatarImage src={photo} alt="" /> : null}
        <AvatarFallback className={CHIP_CLASS[member.designation]}>{initialsOf(member.displayName)}</AvatarFallback>
      </Avatar>
    </span>
  );
}

/** "4 SSM · 18 SM · 1,240 OST": the people below a leader, skipping positions with nobody. */
export function levelSummary(node: Pick<GenealogyTreeNode, "levels">): string {
  const { ssm, sm, ost } = node.levels;
  return [ssm ? `${number.format(ssm)} SSM` : "", sm ? `${number.format(sm)} SM` : "", ost ? `${number.format(ost)} OST` : ""].filter(Boolean).join(" · ");
}

/**
 * Shared genealogy node content. Compact mode (the Team Tree) is the ringed avatar and the name only;
 * the AA number, position, team and counts live in the Member Summary panel. A status that is not
 * Active, a seat vacancy and a restricted-leaders note still show, because they are exceptions.
 * Full mode (member detail downline tree) shows AA number, position, team, status and team counts.
 */
export function SalesNetworkTreeNodeTitle({
  node,
  members,
  compact = false,
  vacantSince = null,
}: {
  node: GenealogyTreeNode;
  members?: readonly OrgMember[];
  compact?: boolean;
  /** Date-only start of an open seat vacancy; shows a read-only "Vacant since" indicator. */
  vacantSince?: string | null;
}) {
  const team = node.teamName ?? (members ? teamDisplayName(node.member, members) : UNASSIGNED_TEAM);
  return (
    <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-3">
      <MemberAvatar member={node.member} />
      <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
        <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1">
          <span className="tw:font-semibold">{node.member.displayName}</span>
          {compact ? null : (
            <>
              <span className="tw:text-xs tw:font-medium tw:tabular-nums tw:text-muted-foreground">{aaDisplay(node.member)}</span>
              <DesignationBadge designation={node.member.designation} full />
              <span className="tw:text-xs tw:text-muted-foreground">{team}</span>
            </>
          )}
          {compact ? null : <StatusBadge status={node.member.status} />}
          {compact ? null : vacantSince ? <ToneBadge tone="warning">Vacant since {formatDate(vacantSince)}</ToneBadge> : null}
        </span>
        {compact ? null : (
          <span className="tw:text-xs tw:text-muted-foreground">
            {node.directCount} direct team / {node.totalDescendantCount} whole team
          </span>
        )}
        {node.restrictedParent ? <span className="tw:text-xs tw:text-muted-foreground tw:italic">Leaders above restricted</span> : null}
      </span>
    </span>
  );
}
