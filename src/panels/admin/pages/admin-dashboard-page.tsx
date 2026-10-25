"use client";

import { useState } from "react";
import { DevIdentitySelector } from "@/panels/admin/components/dev-identity-selector";
import { useCreateCustomerDraft, useCustomers, useMembers, useProducts } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

export function AdminDashboardPage() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const customersQuery = useCustomers();
  const productsQuery = useProducts();
  const createDraft = useCreateCustomerDraft();
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        AFhomes administration foundation. Phase 1B-A centralized mock data is available in development.
      </p>

      {isDevelopment ? <DevIdentitySelector /> : null}

      {isDevelopment ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1 text-sm"
              disabled={createDraft.isPending}
              onClick={() =>
                createDraft.mutate(
                  { displayName: `Browser Test Draft ${Date.now()}` },
                  { onSuccess: (customer) => setLastDraftId(customer.id) },
                )
              }
            >
              Create test draft
            </button>
            {lastDraftId ? <span className="text-xs text-muted-foreground">Last draft: {lastDraftId}</span> : null}
            {createDraft.isError ? <span className="text-xs text-destructive">Draft creation failed.</span> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Current identity</div>
              <div className="font-medium">{identity.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {identity.roles.join(", ")} · {identity.status}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Visible members</div>
              <div className="text-xl font-semibold">{membersQuery.data?.length ?? 0}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Visible customers</div>
              <div className="text-xl font-semibold">{customersQuery.data?.length ?? 0}</div>
            </div>
          </div>

          {membersQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading mock data…</p>
          ) : null}
          {membersQuery.isError || customersQuery.isError || productsQuery.isError ? (
            <p className="text-sm text-destructive">Mock data failed to load.</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold">Visible organization members</h3>
              <ul className="space-y-1 text-sm">
                {(membersQuery.data ?? []).map((member) => (
                  <li key={member.id}>
                    {member.displayName} — {member.designation} ({member.branchId})
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold">Visible customers</h3>
              <ul className="space-y-1 text-sm">
                {(customersQuery.data ?? []).map((customer) => (
                  <li key={customer.id}>
                    {customer.displayName} — {customer.status} ({customer.branchId})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Administration foundation. Development mock diagnostics are unavailable in production.
        </p>
      )}
    </div>
  );
}
