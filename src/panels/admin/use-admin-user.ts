"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { activeRoles } from "@/modules/identity/active-roles";
import { getRoleDisplayLabel } from "./role-label";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** Signed-in person as the admin shell shows them: name, role and initials. */
export function useAdminUser() {
  const { identity } = useDevIdentity();
  const roles = useMemo(() => activeRoles(identity), [identity]);
  return { name: identity.displayName, roleLabel: getRoleDisplayLabel(roles), initials: initials(identity.displayName) };
}
