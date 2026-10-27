"use client";

import { useMemo, useState } from "react";
import { Alert, Avatar, Button, Form, Input, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { MODULE_CATALOG } from "@/modules/identity/permissions";
import type { StaffMember } from "@/modules/organization/types";
import { MIN_PASSWORD_LENGTH, cleanEmailInput, cleanTitleInput, isValidEmail, isValidName } from "@/shared/utils/input-sanitizers";
import { confirmAction, showError, showSuccess } from "@/shared/utils/feedback";
import { activeRoles } from "@/data/mock/dev-identities";
import type { Account } from "@/modules/accounts/types";
import {
  useCreateStaff,
  useDepartments,
  useDepartmentRoles,
  useEffectiveModuleIds,
  useMockRepositories,
  useStaff,
  useUpdateStaff,
} from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useQueryClient } from "@tanstack/react-query";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** Lazy-loaded staff dialog group: add/edit form and read-only profile. */
export function StaffDialogs({
  open,
  editStaff,
  profileStaff,
  onOpenEdit,
  onCloseForm,
  onCloseProfile,
}: {
  open: boolean;
  editStaff: StaffMember | null;
  profileStaff: StaffMember | null;
  onOpenEdit: (member: StaffMember) => void;
  onCloseForm: () => void;
  onCloseProfile: () => void;
}) {
  const granted = useEffectiveModuleIds();
  return (
    <>
      <Modal
        title={editStaff ? "Edit staff" : "Add staff"}
        open={open}
        onCancel={onCloseForm}
        footer={null}
        destroyOnHidden
      >
        {open ? <StaffForm key={editStaff ? editStaff.id : "new"} editStaff={editStaff} onDone={onCloseForm} /> : null}
      </Modal>
      <StaffProfileDialog profileStaff={profileStaff} canViewRoles={granted.has("roles")} onClose={onCloseProfile} onEdit={onOpenEdit} />
    </>
  );
}

function StaffForm({ editStaff, onDone }: { editStaff: StaffMember | null; onDone: () => void }) {
  const { identity } = useDevIdentity();
  const departmentsQuery = useDepartments();
  const rolesQuery = useDepartmentRoles();
  const staffQuery = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();

  const [name, setName] = useState(editStaff?.displayName ?? "");
  const [email, setEmail] = useState(editStaff?.email ?? "");
  const [departmentId, setDepartmentId] = useState(editStaff?.departmentId ?? "");
  const [departmentRoleId, setDepartmentRoleId] = useState(editStaff?.departmentRoleId ?? "");
  const [tempPassword, setTempPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(editStaff?.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeRolesList = useMemo(() => activeRoles(identity), [identity]);
  const canProvisionAccounts = activeRolesList.includes("super_admin") || activeRolesList.includes("admin");
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const selectableDepartments = editStaff ? departments : departments.filter((dept) => dept.status === "active");
  const availableRoles = useMemo(
    () => roles.filter((role) => role.departmentId === departmentId && role.status === "active"),
    [roles, departmentId],
  );

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    const current = roles.find((role) => role.id === departmentRoleId);
    if (!current || current.departmentId !== value) {
      setDepartmentRoleId("");
    }
  };

  const handleAvatarFile = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Unsupported image format.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be 2MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!isValidName(name)) {
      setError("Full name must contain letters only.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!departmentId) {
      setError("Department is required.");
      return;
    }
    if (!departmentRoleId) {
      setError("Department role is required.");
      return;
    }
    if (canProvisionAccounts && !editStaff) {
      if (!tempPassword) {
        setError("Temporary password is required.");
        return;
      }
      if (tempPassword.length < MIN_PASSWORD_LENGTH) {
        setError(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const duplicate = staff.find(
        (member) => member.email.toLowerCase() === email.trim().toLowerCase() && member.id !== editStaff?.id,
      );
      if (duplicate) throw new Error("An employee with this email already exists.");
      if (!editStaff) {
        const accounts = (await repositories.accounts.list()) as Account[];
        if (accounts.some((account) => account.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error("An account with this email already exists.");
        }
      }
      const dept = departments.find((item) => item.id === departmentId);
      if (!dept || dept.status !== "active") throw new Error("Selected department is not active.");
      const role = roles.find((item) => item.id === departmentRoleId);
      if (!role || role.departmentId !== departmentId) {
        throw new Error("Selected role does not belong to the selected department.");
      }
      if (role.status !== "active") throw new Error("Selected role is not active.");

      // Single concept: Position mirrors the assigned department Role name.
      const position = role.name;

      if (editStaff) {
        const proceed = await confirmAction({
          title: `Save changes to ${name.trim()}?`,
          text: "The staff record will be updated.",
          confirmText: "Save",
        });
        if (!proceed) return;
        await updateStaff.mutateAsync({
          id: editStaff.id,
          displayName: name.trim(),
          position,
          departmentId,
          departmentRoleId,
          email: email.trim(),
          avatarUrl,
        });
        onDone();
        await showSuccess("Staff updated successfully.", `${name.trim()} has been saved.`);
      } else {
        let createdId: string | null = null;
        try {
          const created = await createStaff.mutateAsync({
            displayName: name.trim(),
            position,
            departmentId,
            departmentRoleId,
            email: email.trim(),
            avatarUrl,
            accountId: null,
          });
          createdId = created.id;
          if (canProvisionAccounts) {
            // Single Roles concept: access derives from the assigned department
            // Role's module grants. Provisioned accounts start least-privilege;
            // system classification is managed separately in Account Management.
            const account = await repositories.accounts.create({
              displayName: name.trim(),
              email: email.trim(),
              roleIds: [],
              departmentId,
            });
            await repositories.staff.update(created.id, { accountId: account.id });
            queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
          }
        } catch (err) {
          if (createdId) {
            try {
              await repositories.staff.delete(createdId);
            } catch {
              /* best-effort rollback */
            }
          }
          throw err;
        }
      }
      onDone();
      await showSuccess("Staff added successfully.", `${name.trim()} has been added.`);
    } catch (err) {
      await showError(editStaff ? "Update failed." : "Add failed.", err instanceof Error ? err.message : "Failed to save staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={() => void handleFinish()} className="staff-dialog__form">
      <Form.Item label="Profile picture">
        <div className="staff-dialog__avatar-row">
          <Avatar size={64} src={avatarUrl ?? undefined}>
            {avatarUrl ? null : initials(name || "Staff")}
          </Avatar>
          <div className="staff-dialog__avatar-controls">
            <div className="staff-dialog__avatar-buttons">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleAvatarFile(file as unknown as File);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Select image</Button>
              </Upload>
              {avatarUrl ? (
                <Button type="primary" danger onClick={() => setAvatarUrl(null)}>Remove</Button>
              ) : null}
            </div>
            {avatarError ? <Alert type="error" message={avatarError} showIcon /> : null}
          </div>
        </div>
      </Form.Item>
      <Form.Item label="Full Name" required>
        <Input
          placeholder="Full Name"
          value={name}
          maxLength={80}
          showCount
          onChange={(event) => setName(cleanTitleInput(event.target.value))}
        />
      </Form.Item>
      <Form.Item label="Department" required>
        <Select
          aria-label="Staff department"
          placeholder="Select department"
          value={departmentId || undefined}
          onChange={handleDepartmentChange}
          options={selectableDepartments.map((dept) => ({ value: dept.id, label: dept.name }))}
          loading={departmentsQuery.isLoading}
        />
      </Form.Item>
      <Form.Item label="Role" required>
        {availableRoles.length === 0 ? (
          <div className="staff-dialog__empty-roles">
            {departmentId
              ? "No active roles in this department. Ask an administrator to create one first."
              : "Select a department first to see its available roles."}
          </div>
        ) : (
          <Select
            aria-label="Staff role"
            placeholder="Select role"
            value={departmentRoleId || undefined}
            onChange={setDepartmentRoleId}
            options={availableRoles.map((role) => ({ value: role.id, label: role.name }))}
            loading={rolesQuery.isLoading}
          />
        )}
      </Form.Item>
      <Form.Item label="Email" required>
        <Input
          placeholder="Email"
          value={email}
          maxLength={120}
          onChange={(event) => setEmail(cleanEmailInput(event.target.value))}
        />
      </Form.Item>
      {canProvisionAccounts && !editStaff ? (
        <Form.Item label="Temporary Password">
          <Input.Password
            placeholder="Temporary Password"
            value={tempPassword}
            onChange={(event) => setTempPassword(event.target.value)}
            visibilityToggle
          />
        </Form.Item>
      ) : null}
      {error ? <Alert type="error" message={error} showIcon /> : null}
      <Form.Item>
        <div className="staff-dialog__form-actions">
          <Button onClick={onDone}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editStaff ? "Save" : "Add"}
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}

function StaffProfileDialog({
  profileStaff,
  canViewRoles,
  onClose,
  onEdit,
}: {
  profileStaff: StaffMember | null;
  canViewRoles: boolean;
  onClose: () => void;
  onEdit: (member: StaffMember) => void;
}) {
  const departmentsQuery = useDepartments();
  const rolesQuery = useDepartmentRoles();
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  return (
    <Modal title="Employee profile" open={profileStaff !== null} onCancel={onClose} footer={null} destroyOnHidden>
      {profileStaff ? (
        <div className="staff-profile">
          <div className="staff-profile__header">
            <Avatar size={64} src={profileStaff.avatarUrl ?? undefined}>
              {profileStaff.avatarUrl ? null : initials(profileStaff.displayName)}
            </Avatar>
            <div className="staff-profile__identity">
              <div className="staff-profile__name">{profileStaff.displayName}</div>
              <div className="staff-profile__position">{profileStaff.position}</div>
            </div>
          </div>
          <dl className="staff-profile__details">
            <div className="staff-profile__detail-row">
              <dt className="staff-profile__detail-term">Email</dt>
              <dd className="staff-profile__detail-value">{profileStaff.email}</dd>
            </div>
            <div className="staff-profile__detail-row">
              <dt className="staff-profile__detail-term">Department</dt>
              <dd className="staff-profile__detail-value">
                {departments.find((item) => item.id === profileStaff.departmentId)?.name ?? "—"}
              </dd>
            </div>
            <div className="staff-profile__detail-row">
              <dt className="staff-profile__detail-term">Role</dt>
              <dd className="staff-profile__detail-value">
                {roles.find((item) => item.id === profileStaff.departmentRoleId)?.name ?? "—"}
              </dd>
            </div>
            {canViewRoles && profileStaff.departmentRoleId ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Authorized modules</dt>
                <dd className="staff-profile__detail-value">
                  {moduleLabels(roles.find((item) => item.id === profileStaff.departmentRoleId)?.moduleIds ?? []).join(", ") || "—"}
                </dd>
              </div>
            ) : null}
            <div className="staff-profile__detail-row">
              <dt className="staff-profile__detail-term">Status</dt>
              <dd className="staff-profile__detail-value">{profileStaff.status}</dd>
            </div>
            <div className="staff-profile__detail-row">
              <dt className="staff-profile__detail-term">Linked account</dt>
              <dd className="staff-profile__detail-value">{profileStaff.accountId ?? "—"}</dd>
            </div>
          </dl>
          <div className="staff-profile__actions">
            <Button type="primary" onClick={() => onEdit(profileStaff)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function moduleLabels(moduleIds: string[]): string[] {
  return moduleIds.map((moduleId) => {
    const entry = MODULE_CATALOG.find((item) => item.id === moduleId);
    return entry ? entry.label : moduleId;
  });
}
