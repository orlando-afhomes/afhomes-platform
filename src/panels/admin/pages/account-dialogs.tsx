"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Form, Input, Modal, Select, Tag } from "antd";
import type { Account, AccountStatus } from "@/modules/accounts/types";
import { getSystemRoleLabel } from "@/panels/admin/role-label";

export const ACCOUNT_SYSTEM_ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ost"] as const;

export type AccountDialogMode = "view" | "edit" | "create" | "role" | "status" | null;

// Lazy-loaded dialog group for Account Management. State and validation rules
// are unchanged from the previous implementation; only presentation uses antd.
export function AccountDialogs({
  mode,
  selected,
  close,
  onCreate,
  onUpdate,
  onAssign,
  onRevoke,
  onUpdateStatus,
}: {
  mode: AccountDialogMode;
  selected: Account | null;
  close: () => void;
  onCreate: (data: { displayName: string; email: string; roleIds: string[]; departmentId: string | null }) => Promise<unknown>;
  onUpdate: (id: string, data: { displayName: string; email: string; departmentId: string | null }) => Promise<unknown>;
  onAssign: (id: string, role: string) => Promise<unknown>;
  onRevoke: (id: string, role: string) => Promise<unknown>;
  onUpdateStatus: (id: string, status: AccountStatus) => Promise<unknown>;
}) {
  return (
    <>
      <Modal title="Create account" open={mode === "create"} onCancel={close} footer={null} destroyOnHidden>
        <p className="account-dialog__description">Provision a new synthetic account.</p>
        <AccountForm
          key="create"
          onSubmit={async (data) => {
            await onCreate(data);
            close();
          }}
          submitLabel="Create"
        />
      </Modal>

      <Modal title="Account details" open={mode === "view" && !!selected} onCancel={close} footer={null} destroyOnHidden>
        {selected ? (
          <dl className="account-dialog__details">
            <div className="account-dialog__detail-row">
              <dt className="account-dialog__detail-term">Name</dt>
              <dd className="account-dialog__detail-value">{selected.displayName}</dd>
            </div>
            <div className="account-dialog__detail-row">
              <dt className="account-dialog__detail-term">Email</dt>
              <dd className="account-dialog__detail-value">{selected.email}</dd>
            </div>
            <div className="account-dialog__detail-row">
              <dt className="account-dialog__detail-term">Status</dt>
              <dd className="account-dialog__detail-value">{selected.status}</dd>
            </div>
            <div className="account-dialog__detail-row">
              <dt className="account-dialog__detail-term">Roles</dt>
              <dd className="account-dialog__detail-value">{selected.roleIds.join(", ") || "—"}</dd>
            </div>
            <div className="account-dialog__detail-row">
              <dt className="account-dialog__detail-term">Created</dt>
              <dd className="account-dialog__detail-value">{selected.createdAt}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal title="Edit account" open={mode === "edit" && !!selected} onCancel={close} footer={null} destroyOnHidden>
        {selected ? (
          <AccountForm
            key={selected.id}
            initial={selected}
            onSubmit={async (data) => {
              await onUpdate(selected.id, { displayName: data.displayName, email: data.email, departmentId: data.departmentId });
              close();
            }}
            submitLabel="Save"
          />
        ) : null}
      </Modal>

      <Modal title="Role assignments" open={mode === "role" && !!selected} onCancel={close} footer={null} destroyOnHidden>
        {selected ? (
          <RoleEditor
            key={selected.id}
            account={selected}
            onAssign={(role) => onAssign(selected.id, role)}
            onRevoke={(role) => onRevoke(selected.id, role)}
            onClose={close}
          />
        ) : null}
      </Modal>

      <Modal title="Account status" open={mode === "status" && !!selected} onCancel={close} footer={null} destroyOnHidden>
        {selected ? (
          <StatusEditor
            key={selected.id}
            account={selected}
            onSave={async (status) => {
              await onUpdateStatus(selected.id, status);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </Modal>
    </>
  );
}

function AccountForm({ initial, onSubmit, submitLabel }: { initial?: Account; onSubmit: (data: { displayName: string; email: string; roleIds: string[]; departmentId: string | null }) => Promise<unknown>; submitLabel: string }) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
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
    <Form layout="vertical" onFinish={handleFinish}>
      <Form.Item label="Display name" required htmlFor="account-display-name">
        <Input id="account-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </Form.Item>
      <Form.Item label="Email" required htmlFor="account-email">
        <Input id="account-email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Form.Item>
      <Form.Item label="Roles" required>
        <Checkbox.Group value={roleIds} onChange={(values) => setRoleIds(values as string[])}>
          <div className="account-dialog__role-tags">
            {ACCOUNT_SYSTEM_ROLES.map((role) => (
              <Checkbox key={role} value={role}>{getSystemRoleLabel(role)}</Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      </Form.Item>
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <Form.Item>
        <div className="account-dialog__form-actions">
          <Button type="primary" htmlType="submit" loading={submitting}>{submitLabel}</Button>
        </div>
      </Form.Item>
    </Form>
  );
}

function RoleEditor({ account, onAssign, onRevoke, onClose }: { account: Account; onAssign: (role: string) => Promise<unknown>; onRevoke: (role: string) => Promise<unknown>; onClose: () => void }) {
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!role) return;
    setError(null);
    try {
      await onAssign(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    }
  };

  const handleRevoke = async (r: string) => {
    setError(null);
    try {
      await onRevoke(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role.");
    }
  };

  return (
    <div className="account-dialog__form-section">
      <div className="account-dialog__role-tags">
        {account.roleIds.map((r: string) => (
          <Tag key={r} closable onClose={() => handleRevoke(r)}>{getSystemRoleLabel(r)}</Tag>
        ))}
      </div>
      <div className="account-dialog__role-row">
        <Select virtual={false}
          aria-label="Role to assign"
          className="account-dialog__role-select"
          placeholder="Select role"
          value={role || undefined}
          onChange={(value) => setRole(value)}
          options={ACCOUNT_SYSTEM_ROLES.filter((r) => !account.roleIds.includes(r)).map((r) => ({ value: r, label: getSystemRoleLabel(r) }))}
        />
        <Button onClick={handleAssign} disabled={!role}>Assign</Button>
      </div>
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <div className="account-dialog__form-actions">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function StatusEditor({ account, onSave, onClose }: { account: Account; onSave: (status: AccountStatus) => Promise<unknown>; onClose: () => void }) {
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-dialog__form-section">
      <Select virtual={false}
        aria-label="Account status"
        className="w-full"
        value={status}
        onChange={(value) => setStatus(value)}
        options={[
          { value: "pending", label: "Pending" },
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
          { value: "deactivated", label: "Deactivated" },
        ]}
      />
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <div className="account-dialog__actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
      </div>
    </div>
  );
}
