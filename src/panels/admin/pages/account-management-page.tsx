"use client";

import { useState } from "react";
import { useAccounts, useCreateAccount, useUpdateAccount, useAssignAccountRole, useRevokeAccountRole, useUpdateAccountStatus } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { isModuleGranted } from "@/modules/identity/permissions";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Account, AccountStatus } from "@/modules/accounts/types";

const ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ist", "ost"] as const;

export function AccountManagementPage() {
  const { identity } = useDevIdentity();
  const accountsQuery = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const assignMutation = useAssignAccountRole();
  const revokeMutation = useRevokeAccountRole();
  const statusMutation = useUpdateAccountStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Account | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create" | "role" | "status" | null>(null);

  if (!isModuleGranted(identity, "accounts")) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <PageHeader title="Access restricted" description="This account does not have access to Account Management." />
        </div>
      </PageContainer>
    );
  }

  const accounts = accountsQuery.data ?? [];
  const filtered = accounts
    .filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return a.displayName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const openCreate = () => { setSelected(null); setMode("create"); };
  const openView = (a: Account) => { setSelected(a); setMode("view"); };
  const openEdit = (a: Account) => { setSelected(a); setMode("edit"); };
  const openRole = (a: Account) => { setSelected(a); setMode("role"); };
  const openStatus = (a: Account) => { setSelected(a); setMode("status"); };
  const close = () => { setMode(null); setSelected(null); };

  return (
    <PageContainer>
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Accounts and Permissions" }]} />
        <PageHeader title="Accounts and Permissions" description="Manage system accounts, roles, and account status." />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Input placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <Button onClick={openCreate}>Create account</Button>
        </div>

        {accountsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No accounts found.</CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Roles</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2">{a.displayName}</td>
                    <td className="px-3 py-2">{a.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.roleIds.map((r: string) => (
                          <Badge key={r} variant="secondary">{r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={a.status === "active" ? "default" : "outline"}>{a.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(a)}>View</Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => openRole(a)}>Roles</Button>
                        <Button variant="ghost" size="sm" onClick={() => openStatus(a)}>Status</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={mode === "create"} onOpenChange={(o) => !o && close()}>
          <DialogPopup>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>Provision a new synthetic account.</DialogDescription>
            <AccountForm
              onSubmit={async (data) => {
                await createMutation.mutateAsync(data);
                close();
              }}
              submitLabel="Create"
            />
          </DialogPopup>
        </Dialog>

        {/* View dialog */}
        <Dialog open={mode === "view" && !!selected} onOpenChange={(o) => !o && close()}>
          <DialogPopup>
            <DialogTitle>Account details</DialogTitle>
            {selected ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Name: </span>{selected.displayName}</div>
                <div><span className="text-muted-foreground">Email: </span>{selected.email}</div>
                <div><span className="text-muted-foreground">Status: </span>{selected.status}</div>
                <div><span className="text-muted-foreground">Roles: </span>{selected.roleIds.join(", ") || "—"}</div>
                <div><span className="text-muted-foreground">Created: </span>{selected.createdAt}</div>
              </div>
            ) : null}
          </DialogPopup>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={mode === "edit" && !!selected} onOpenChange={(o) => !o && close()}>
          <DialogPopup>
            <DialogTitle>Edit account</DialogTitle>
            {selected ? (
              <AccountForm
                initial={selected}
                onSubmit={async (data) => {
                  await updateMutation.mutateAsync({ id: selected.id, displayName: data.displayName, email: data.email, departmentId: data.departmentId });
                  close();
                }}
                submitLabel="Save"
              />
            ) : null}
          </DialogPopup>
        </Dialog>

        {/* Role dialog */}
        <Dialog open={mode === "role" && !!selected} onOpenChange={(o) => !o && close()}>
          <DialogPopup>
            <DialogTitle>Role assignments</DialogTitle>
            {selected ? (
              <RoleEditor account={selected} assignMutation={assignMutation} revokeMutation={revokeMutation} onClose={close} />
            ) : null}
          </DialogPopup>
        </Dialog>

        {/* Status dialog */}
        <Dialog open={mode === "status" && !!selected} onOpenChange={(o) => !o && close()}>
          <DialogPopup>
            <DialogTitle>Account status</DialogTitle>
            {selected ? (
              <StatusEditor account={selected} statusMutation={statusMutation} onClose={close} />
            ) : null}
          </DialogPopup>
        </Dialog>
      </div>
    </PageContainer>
  );
}

function AccountForm({ initial, onSubmit, submitLabel }: { initial?: Account; onSubmit: (data: { displayName: string; email: string; roleIds: string[]; departmentId: string | null }) => Promise<void>; submitLabel: string }) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role: string) => {
    setRoleIds((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Invalid email format."); return; }
    if (roleIds.length === 0) { setError("At least one role is required."); return; }
    setSubmitting(true);
    try {
      await onSubmit({ displayName: displayName.trim(), email: email.trim(), roleIds, departmentId: initial?.departmentId ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Display name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Roles</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <label key={role} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={roleIds.includes(role)} onChange={() => toggleRole(role)} />
              {role}
            </label>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}

function RoleEditor({ account, assignMutation, revokeMutation, onClose }: { account: Account; assignMutation: ReturnType<typeof useAssignAccountRole>; revokeMutation: ReturnType<typeof useRevokeAccountRole>; onClose: () => void }) {
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!role) return;
    setError(null);
    try {
      await assignMutation.mutateAsync({ id: account.id, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    }
  };

  const handleRevoke = async (r: string) => {
    setError(null);
    try {
      await revokeMutation.mutateAsync({ id: account.id, role: r });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {account.roleIds.map((r: string) => (
          <Badge key={r} variant="secondary">
            {r} <button className="ml-1" onClick={() => handleRevoke(r)}>×</button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select role</option>
          {ROLES.filter((r) => !account.roleIds.includes(r)).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleAssign} disabled={!role}>Assign</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function StatusEditor({ account, statusMutation, onClose }: { account: Account; statusMutation: ReturnType<typeof useUpdateAccountStatus>; onClose: () => void }) {
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      await statusMutation.mutateAsync({ id: account.id, status });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  return (
    <div className="space-y-3">
      <select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="deactivated">Deactivated</option>
      </select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
