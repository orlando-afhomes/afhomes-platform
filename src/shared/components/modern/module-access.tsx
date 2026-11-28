"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, Check, Gift, Minus, Network, UsersRound, Wallet } from "lucide-react";
import { MODULE_CATALOG, MODULE_GROUPS, type ModuleGroup } from "@/modules/identity/permissions";
import { humanize } from "@/shared/lib/humanize";
import { cn } from "@/shared/lib/utils";
import { ToneBadge, type BadgeTone } from "./status-badge";

const GROUP_META: Record<ModuleGroup, { icon: LucideIcon; tone: BadgeTone }> = {
  Organization: { icon: Building2, tone: "brand" },
  "Sales Network": { icon: Network, tone: "indigo" },
  "Customers and Sales": { icon: UsersRound, tone: "teal" },
  Finance: { icon: Wallet, tone: "green" },
  "Member Programs": { icon: Gift, tone: "violet" },
  "Reports and Audit": { icon: BarChart3, tone: "amber" },
};

/** Grouped, colour-coded module chips. `showAll` marks modules the role does not hold. */
export function ModuleAccessList({
  moduleIds,
  showAll = false,
  label = "Module access",
  emptyText = "No modules granted.",
  className,
}: {
  moduleIds: readonly string[];
  showAll?: boolean;
  label?: string;
  emptyText?: string;
  className?: string;
}) {
  const granted = new Set(moduleIds);
  const groups = MODULE_GROUPS.map((group) => {
    const modules = MODULE_CATALOG.filter((entry) => entry.group === group);
    return {
      group,
      modules: showAll ? modules : modules.filter((entry) => granted.has(entry.id)),
      count: modules.filter((entry) => granted.has(entry.id)).length,
      total: modules.length,
    };
  }).filter((group) => showAll || group.modules.length > 0);
  const unknown = moduleIds.filter((id) => !MODULE_CATALOG.some((entry) => entry.id === id));

  if (groups.length === 0 && unknown.length === 0) {
    return <p className="tw:text-sm tw:text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div role="group" aria-label={label} className={cn("tw:flex tw:flex-col tw:gap-2", className)}>
      {groups.map(({ group, modules, count, total }) => {
        const { icon: Icon, tone } = GROUP_META[group];
        return (
          <section key={group} aria-label={group} className="tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border tw:border-border/70 tw:bg-muted/20 tw:p-2.5">
            <div className="tw:flex tw:items-center tw:gap-1.5">
              <Icon aria-hidden="true" className="tw:size-3.5 tw:text-primary" />
              <span className="tw:text-xs tw:font-semibold">{group}</span>
              <span className="tw:ml-auto tw:text-[11px] tw:text-muted-foreground" aria-label={`${count} of ${total} modules granted`}>
                {count}/{total}
              </span>
            </div>
            <div className="tw:flex tw:flex-wrap tw:gap-1">
              {modules.map((entry) => {
                const isGranted = granted.has(entry.id);
                return (
                  <ToneBadge
                    key={entry.id}
                    tone={isGranted ? tone : "neutral"}
                    treatment={isGranted ? "filled" : "outline"}
                    icon={isGranted ? Check : Minus}
                  >
                    {entry.label}
                    {showAll ? <span className="tw:sr-only">{isGranted ? " granted" : " not granted"}</span> : null}
                  </ToneBadge>
                );
              })}
            </div>
          </section>
        );
      })}
      {unknown.length > 0 ? (
        <section aria-label="Other stored grants" className="tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border tw:border-border/70 tw:bg-muted/20 tw:p-2.5">
          <span className="tw:text-xs tw:font-semibold">Other stored grants</span>
          <div className="tw:flex tw:flex-wrap tw:gap-1">
            {unknown.map((id) => (
              <ToneBadge key={id} tone="neutral" treatment="outline" icon={Minus}>
                {humanize(id)}
              </ToneBadge>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
