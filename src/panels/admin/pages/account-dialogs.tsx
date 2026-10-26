"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Descriptions, Form, Input, Modal, Select, Tag } from "antd";
import type { Account, AccountStatus } from "@/modules/accounts/types";

const ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ist", "ost"] as const;

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
  onCreate: (data: { displayName: string; email: string; roleIds: string[]; departmentId: string | null }) => Promise<void>;
  onUpdate: (id: string, data: { displayName: string; email: string; departmentId: string | null }) => Promise<void>;
  onAssign: (id: string, role: string) => Promise<void>;
  onRevoke: (id: string, role: string) => Promise<void>;
  onUpdateStatus: (id: string, status: AccountStatus) => Promise<void>;
}) {
  return (
    <>
      <Modal title="Create account" open={mode === "create"} onCancel={close} footer={null} destroyOnHidden>
        <p className="text-muted-foreground">Provision a new synthetic account.</p>
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
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{selected.displayName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
            <Descriptions.Item label="Status">{selected.status}</Descriptions.Item>
            <Descriptions.Item label="Roles">{selected.roleIds.join(", ") || "—"}</Descriptions.Item>
            <Descriptions.Item label="Created">{selected.createdAt}</Descriptions.Item>
          </Descriptions>
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

function AccountForm({ initial, onSubmit, submitLabel }: { initial?: Account; onSubmit: (data: { displayName: string; email: string; roleIds: string[]; departmentId: string | null }) => Promise<void>; submitLabel: string }) {
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
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Checkbox key={role} value={role}>{role}</Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      </Form.Item>
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <Form.Item>
        <div className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={submitting}>{submitLabel}</Button>
        </div>
      </Form.Item>
    </Form>
  );
}

function RoleEditor({ account, onAssign, onRevoke, onClose }: { account: Account; onAssign: (role: string) => Promise<void>; onRevoke: (role: string) => Promise<void>; onClose: () => void }) {
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {account.roleIds.map((r: string) => (
          <Tag key={r} closable onClose={() => handleRevoke(r)}>{r}</Tag>
        ))}
      </div>
      <div className="flex gap-2">
        <Select
          aria-label="Role to assign"
          className="flex-1"
          placeholder="Select role"
          value={role || undefined}
          onChange={(value) => setRole(value)}
          options={ROLES.filter((r) => !account.roleIds.includes(r)).map((r) => ({ value: r, label: r }))}
        />
        <Button onClick={handleAssign} disabled={!role}>Assign</Button>
      </div>
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function StatusEditor({ account, onSave, onClose }: { account: Account; onSave: (status: AccountStatus) => Promise<void>; onClose: () => void }) {
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
    <div className="space-y-3">
      <Select
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
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
      </div>
    </div>
  );
}
