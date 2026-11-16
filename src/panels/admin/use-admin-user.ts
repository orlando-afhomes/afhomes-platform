"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { activeRoles } from "@/data/mock/dev-identities";
import { getRoleDisplayLabel } from "./role-label";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** Signed-in person as the admin shell shows them: name, role, initials and photo. */
export function useAdminUser() {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const roles = useMemo(() => activeRoles(identity), [identity]);
  const avatarUrl = useMemo(() => {
    if (!identity.staffId) return null;
    return store.staff.find((member) => member.id === identity.staffId)?.avatarUrl ?? null;
  }, [store, identity]);
  return { name: identity.displayName, roleLabel: getRoleDisplayLabel(roles), initials: initials(identity.displayName), avatarUrl };
}
