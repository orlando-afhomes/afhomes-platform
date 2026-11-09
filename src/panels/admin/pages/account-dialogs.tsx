"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Account, AccountActionPolicy, AccountStatus } from "@/modules/accounts/types";
import { LINKED_ACCOUNT_RESTRICTION } from "@/data/mock/account-repository";
import { getSystemRoleLabel } from "@/panels/admin/role-label";
import { DetailList, DetailRow, InfoNote } from "@/shared/components/modern/detail-list";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { TextField } from "@/shared/forms/modern";
import { isValidEmail } from "@/shared/utils/input-sanitizers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type AccountDialogMode = "view" | "edit" | "role" | "status" | null;

const STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Pending",
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

const DIALOG_CLASS = "tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-md";
const BUTTON_CLASS = "tw:min-h-11 tw:sm:min-h-8";

type AccountFormData = { displayName: string; email: string; departmentId: string | null };

// Lazy-loaded dialog group for account access in Staff & Access. Role and
// status options come from the actor's account policy; the repository
// re-checks every action. New accounts are created with a staff record.
export function AccountDialogs({
  mode,
  selected,
  policy,
  close,
  onUpdate,
  onAssign,
  onRevoke,
  onUpdateStatus,
}: {
  mode: AccountDialogMode;
  /** Current record from the accounts query, so the dialog reflects every mutation. */
  selected: Account | null;
  policy: AccountActionPolicy | null;
  close: () => void;
  onUpdate: (id: string, data: AccountFormData) => Promise<unknown>;
  onAssign: (id: string, role: string) => Promise<unknown>;
  onRevoke: (id: string, role: string) => Promise<unknown>;
  onUpdateStatus: (id: string, status: AccountStatus) => Promise<unknown>;
}) {
  const onOpenChange = (next: boolean) => (!next ? close() : undefined);
  return (
    <>
      <Dialog open={mode === "view" && !!selected} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Account details</DialogTitle>
            <DialogDescription>Read-only summary of the account.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="tw:flex tw:flex-col tw:gap-3">
              {policy?.restriction ? <InfoNote>{policy.restriction}</InfoNote> : null}
              {policy?.linkedToStaff ? <InfoNote>{LINKED_ACCOUNT_RESTRICTION}</InfoNote> : null}
              <DetailList>
                <DetailRow term="Name">{selected.displayName}</DetailRow>
                <DetailRow term="Email">{selected.email}</DetailRow>
                <DetailRow term="Status">{STATUS_LABELS[selected.status]}</DetailRow>
                <DetailRow term="Roles">{selected.roleIds.map(getSystemRoleLabel).join(", ") || "No system roles"}</DetailRow>
                <DetailRow term="Created">{selected.createdAt}</DetailRow>
              </DetailList>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "edit" && !!selected} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>Update the account display name and email.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <AccountForm
              key={selected.id}
              initial={selected}
              identityReadOnly={policy?.linkedToStaff ?? false}
              onSubmit={async (data) => {
                await onUpdate(selected.id, data);
                close();
              }}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "role" && !!selected} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Role assignments</DialogTitle>
            <DialogDescription>Assign or revoke system roles for this account.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <RoleEditor
              key={selected.id}
              account={selected}
              policy={policy}
              onAssign={(role) => onAssign(selected.id, role)}
              onRevoke={(role) => onRevoke(selected.id, role)}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "status" && !!selected} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Account status</DialogTitle>
            <DialogDescription>Change whether this account can sign in.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <StatusEditor
              key={selected.id}
              account={selected}
              policy={policy}
              onSave={async (status) => {
                await onUpdateStatus(selected.id, status);
                close();
              }}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Edit form for an existing account (identity fields only). */
function AccountForm({
  initial,
  identityReadOnly,
  onSubmit,
  onClose,
}: {
  initial: Account;
  /** Staff-linked accounts show Staff-authoritative values read-only. */
  identityReadOnly?: boolean;
  onSubmit: (data: AccountFormData) => Promise<unknown>;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [email, setEmail] = useState(initial.email);
  const [errors, setErrors] = useState<{ displayName?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!displayName.trim()) found.displayName = "Display name is required.";
    if (!email.trim()) found.email = "Email is required.";
    else if (!isValidEmail(email.trim())) found.email = "Invalid email format.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ displayName: displayName.trim(), email: email.trim(), departmentId: initial.departmentId });
    } catch (err) {
      // The dialog stays open with the entered values so the user can correct them.
      toast.error("Save failed.", { description: err instanceof Error ? err.message : "Failed to save account." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="tw:flex tw:flex-col tw:gap-4">
      {identityReadOnly ? <InfoNote>{LINKED_ACCOUNT_RESTRICTION}</InfoNote> : null}
      <TextField
        id="account-display-name"
        label="Display name"
        required
        value={displayName}
        onChange={(value) => {
          setDisplayName(value);
          setErrors((current) => ({ ...current, displayName: undefined }));
        }}
        disabled={identityReadOnly}
        error={errors.displayName}
      />
      <TextField
        id="account-email"
        label="Email"
        required
        value={email}
        onChange={(value) => {
          setEmail(value);
          setErrors((current) => ({ ...current, email: undefined }));
        }}
        disabled={identityReadOnly}
        error={errors.email}
      />
      <DialogFooter>
        {identityReadOnly ? (
          <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={onClose}>
            Close
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} className={BUTTON_CLASS}>
            Save
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

function RoleEditor({
  account,
  policy,
  onAssign,
  onRevoke,
  onClose,
}: {
  account: Account;
  policy: AccountActionPolicy | null;
  onAssign: (role: string) => Promise<unknown>;
  onRevoke: (role: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [role, setRole] = useState("");
  const assignable = policy?.assignableRoles ?? [];
  const revocable = new Set<string>(policy?.revocableRoles ?? []);
  const roleItems = assignable.map((value) => ({ value, label: getSystemRoleLabel(value) }));

  const handleAssign = async () => {
    if (!role) return;
    try {
      await onAssign(role);
      setRole("");
    } catch (err) {
      toast.error("Assign failed.", { description: err instanceof Error ? err.message : "Failed to assign role." });
    }
  };

  const handleRevoke = async (value: string) => {
    try {
      await onRevoke(value);
    } catch (err) {
      toast.error("Revoke failed.", { description: err instanceof Error ? err.message : "Failed to revoke role." });
    }
  };

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      {policy?.restriction ? <InfoNote>{policy.restriction}</InfoNote> : null}
      <div className="tw:flex tw:flex-wrap tw:gap-1.5">
        {account.roleIds.length === 0 ? <span className="tw:text-muted-foreground">No system roles assigned.</span> : null}
        {account.roleIds.map((value: string) => (
          <Badge key={value} variant="outline" className="tw:h-auto tw:gap-1 tw:py-1">
            {getSystemRoleLabel(value)}
            {/* Raw button exception: inline icon-only remove control inside a Badge. */}
            {revocable.has(value) ? (
              <button
                type="button"
                aria-label={`Revoke ${getSystemRoleLabel(value)}`}
                className="tw:inline-flex tw:size-5 tw:items-center tw:justify-center tw:rounded-full tw:hover:bg-muted"
                onClick={() => void handleRevoke(value)}
              >
                <X aria-hidden="true" className="tw:size-3" />
              </button>
            ) : null}
          </Badge>
        ))}
      </div>
      {policy?.canManageRoles && assignable.length > 0 ? (
        <div className="tw:flex tw:gap-2">
          <Select items={roleItems} value={role || null} onValueChange={(next) => setRole(next ?? "")}>
            <SelectTrigger aria-label="Role to assign" className="tw:h-11 tw:flex-1 tw:sm:h-8">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roleItems.map((item) => (
                <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => void handleAssign()} disabled={!role}>
            Assign
          </Button>
        </div>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

function StatusEditor({
  account,
  policy,
  onSave,
  onClose,
}: {
  account: Account;
  policy: AccountActionPolicy | null;
  onSave: (status: AccountStatus) => Promise<unknown>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const allowed = policy?.allowedStatuses ?? [];
  const statusItems = allowed.map((value) => ({ value, label: STATUS_LABELS[value] }));

  const handleSave = async () => {
    if (!status) return;
    setSaving(true);
    try {
      await onSave(status);
    } catch (err) {
      toast.error("Status update failed.", { description: err instanceof Error ? err.message : "Failed to update status." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <p className="tw:flex tw:items-center tw:gap-2 tw:text-muted-foreground">
        Current status: <StatusBadge status={account.status} />
      </p>
      {allowed.length > 0 ? (
        <Select items={statusItems} value={status} onValueChange={(next) => setStatus(next as AccountStatus | null)}>
          <SelectTrigger aria-label="Account status" className="tw:h-11 tw:w-full tw:sm:h-8">
            <SelectValue placeholder="Select new status" />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <InfoNote>{policy?.restriction ?? "No status change is available for this account."}</InfoNote>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" className={BUTTON_CLASS} onClick={() => void handleSave()} disabled={!status || saving}>
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}
