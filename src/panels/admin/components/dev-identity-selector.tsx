"use client";

import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

const isDevelopment = process.env.NODE_ENV === "development";

export function DevIdentitySelector() {
  const { identity, identities, setIdentityId } = useDevIdentity();

  if (!isDevelopment) return null;

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm">
      <div className="mb-2 font-medium">Development identity (dev only)</div>
      <select
        className="w-full rounded-md border border-border bg-background px-2 py-1"
        value={identity.id}
        onChange={(event) => setIdentityId(event.target.value)}
      >
        {identities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.displayName} — {item.roles.join(", ")} ({item.status})
          </option>
        ))}
      </select>
    </div>
  );
}
