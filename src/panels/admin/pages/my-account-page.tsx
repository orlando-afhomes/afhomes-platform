"use client";

import { useMemo, useState } from "react";
import { Alert, Avatar, Button, Empty, Form, Input, Select, Skeleton, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { Account } from "@/modules/accounts/types";
import type { StaffMember } from "@/modules/organization/types";
import { activeRoles } from "@/data/mock/dev-identities";
import {
  useDepartments,
  useDepartmentRoles,
  useEffectiveModuleIds,
  useUpdateAccount,
  useUpdateStaff,
} from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import {
  MIN_PASSWORD_LENGTH,
  cleanEmailInput,
  cleanTitleInput,
  formatStatusLabel,
  isValidEmail,
  isValidName,
} from "@/shared/utils/input-sanitizers";
import { confirmAction, showError, showSuccess } from "@/shared/utils/feedback";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** Self-service profile page: name, email, avatar, and password for the
 *  signed-in identity; department and one role for admins. */
export function MyAccountPage() {
  const { identity } = useDevIdentity();

  if (identity.status !== "active") {
    return (
      <div className="my-account-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to My Account." />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="my-account-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "My Account" }]} />
        <PageHeader title="My Account" description="View and update your profile information." />
        <MyAccountForm key={identity.id} />
      </PageContainer>
    </div>
  );
}

function MyAccountForm() {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = useEffectiveModuleIds();
  const departmentsQuery = useDepartments();
  const rolesQuery = useDepartmentRoles();
  const updateStaff = useUpdateStaff();
  const updateAccount = useUpdateAccount();

  const staff: StaffMember | null = useMemo(
    () => (identity.staffId ? (store.staff.find((item) => item.id === identity.staffId) ?? null) : null),
    [store, identity],
  );
  const account: Account | null = useMemo(
    () => (staff?.accountId ? (store.accounts.find((item) => item.id === staff.accountId) ?? null) : null),
    [store, staff],
  );

  const rolesList = useMemo(() => activeRoles(identity), [identity]);
  const isAdmin = rolesList.includes("super_admin") || rolesList.includes("admin");
  const canEditProfile = granted.has("staff") || isAdmin;

  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const [name, setName] = useState(staff?.displayName ?? account?.displayName ?? identity.displayName);
  const [email, setEmail] = useState(staff?.email ?? account?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(staff?.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departmentId, setDepartmentId] = useState(staff?.departmentId ?? "");
  const [departmentRoleId, setDepartmentRoleId] = useState(staff?.departmentRoleId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = useMemo(
    () => roles.filter((role) => role.departmentId === departmentId && role.status === "active"),
    [roles, departmentId],
  );

  if (!staff && !account) {
    return (
      <div className="my-account-page__empty">
        <Empty description="No linked staff or account record found for this identity." />
      </div>
    );
  }

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
    if (email.trim() && !isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    if (isAdmin) {
      if (!departmentId) {
        setError("Department is required.");
        return;
      }
      if (!departmentRoleId) {
        setError("Department role is required.");
        return;
      }
    }
    const proceed = await confirmAction({
      title: "Save changes to your account?",
      text: "Your profile information will be updated.",
      confirmText: "Save",
    });
    if (!proceed) return;
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      if (staff && trimmedEmail && trimmedEmail.toLowerCase() !== staff.email.toLowerCase()) {
        const staffAccounts = store.staff.filter((member) => member.id !== staff.id);
        if (staffAccounts.some((member) => member.email.toLowerCase() === trimmedEmail.toLowerCase())) {
          throw new Error("An employee with this email already exists.");
        }
        const systemAccounts = store.accounts.filter((item) => item.id !== staff.accountId);
        if (systemAccounts.some((item) => item.email.toLowerCase() === trimmedEmail.toLowerCase())) {
          throw new Error("An account with this email already exists.");
        }
      }
      if (staff && canEditProfile) {
        const payload: {
          displayName: string;
          email: string;
          avatarUrl: string | null;
          departmentId?: string | null;
          departmentRoleId?: string | null;
          position?: string;
        } = { displayName: name.trim(), email: trimmedEmail || staff.email, avatarUrl };
        if (isAdmin) {
          const role = roles.find((item) => item.id === departmentRoleId);
          if (!role || role.departmentId !== departmentId) {
            throw new Error("Selected role does not belong to the selected department.");
          }
          payload.departmentId = departmentId;
          payload.departmentRoleId = departmentRoleId;
          payload.position = role.name;
        }
        await updateStaff.mutateAsync({ id: staff.id, ...payload });
      }
      if (account && isAdmin) {
        await updateAccount.mutateAsync({
          id: account.id,
          displayName: name.trim(),
          email: trimmedEmail || account.email,
          departmentId: departmentId || null,
        });
      }
      setNewPassword("");
      setConfirmPassword("");
      await showSuccess(
        "Account updated successfully.",
        newPassword ? "Your profile and password change have been recorded." : "Your profile has been saved.",
      );
    } catch (err) {
      await showError("Update failed.", err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={() => void handleFinish()} className="my-account-page__form">
      <section aria-label="Profile information" className="my-account-page__section">
        <h2 className="my-account-page__section-title">Profile information</h2>
        <Form.Item label="Profile picture">
          <div className="my-account-page__avatar-row">
            <Avatar size={64} src={avatarUrl ?? undefined}>
              {avatarUrl ? null : initials(name || "Staff")}
            </Avatar>
            {canEditProfile ? (
              <div className="my-account-page__avatar-controls">
                <div className="my-account-page__avatar-buttons">
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
                    <Button type="primary" danger onClick={() => setAvatarUrl(null)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                {avatarError ? <Alert type="error" message={avatarError} showIcon /> : null}
              </div>
            ) : null}
          </div>
        </Form.Item>
        <Form.Item label="Full Name" required>
          <Input
            placeholder="Full Name"
            value={name}
            maxLength={80}
            showCount
            disabled={!canEditProfile}
            onChange={(event) => setName(cleanTitleInput(event.target.value))}
          />
        </Form.Item>
        <Form.Item label="Email">
          <Input
            placeholder="Email"
            value={email}
            maxLength={120}
            disabled={!canEditProfile}
            onChange={(event) => setEmail(cleanEmailInput(event.target.value))}
          />
        </Form.Item>
        <dl className="my-account-page__details">
          <div className="my-account-page__detail-row">
            <dt className="my-account-page__detail-term">Status</dt>
            <dd className="my-account-page__detail-value">{formatStatusLabel(account?.status ?? staff?.status ?? identity.status)}</dd>
          </div>
          <div className="my-account-page__detail-row">
            <dt className="my-account-page__detail-term">Linked account</dt>
            <dd className="my-account-page__detail-value">{account?.id ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Change password" className="my-account-page__section">
        <h2 className="my-account-page__section-title">Change password</h2>
        <Form.Item label="New Password">
          <Input.Password
            placeholder="New Password"
            value={newPassword}
            minLength={MIN_PASSWORD_LENGTH}
            onChange={(event) => setNewPassword(event.target.value)}
            visibilityToggle
          />
        </Form.Item>
        <Form.Item label="Confirm Password">
          <Input.Password
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            visibilityToggle
          />
        </Form.Item>
        <p className="my-account-page__hint">Mock build: passwords are validated, not stored.</p>
      </section>

      {isAdmin ? (
        <section aria-label="Employment and access" className="my-account-page__section">
          <h2 className="my-account-page__section-title">Employment and access</h2>
          <Form.Item label="Department" required>
            <Select
              aria-label="My account department"
              placeholder="Select department"
              value={departmentId || undefined}
              onChange={handleDepartmentChange}
              options={departments
                .filter((dept) => dept.status === "active" || dept.id === staff?.departmentId)
                .map((dept) => ({ value: dept.id, label: dept.name }))}
              loading={departmentsQuery.isLoading}
            />
          </Form.Item>
          <Form.Item label="Role" required>
            {availableRoles.length === 0 ? (
              <div className="my-account-page__empty-roles">
                {departmentId
                  ? "No active roles in this department. Ask an administrator to create one first."
                  : "Select a department first to see its available roles."}
              </div>
            ) : (
              <Select
                aria-label="My account role"
                placeholder="Select role"
                value={departmentRoleId || undefined}
                onChange={setDepartmentRoleId}
                options={availableRoles.map((role) => ({ value: role.id, label: role.name }))}
                loading={rolesQuery.isLoading}
              />
            )}
          </Form.Item>
        </section>
      ) : (
        <section aria-label="Employment and access" className="my-account-page__section">
          <h2 className="my-account-page__section-title">Employment and access</h2>
          <dl className="my-account-page__details">
            <div className="my-account-page__detail-row">
              <dt className="my-account-page__detail-term">Department</dt>
              <dd className="my-account-page__detail-value">
                {departments.find((item) => item.id === staff?.departmentId)?.name ?? "—"}
              </dd>
            </div>
            <div className="my-account-page__detail-row">
              <dt className="my-account-page__detail-term">Role</dt>
              <dd className="my-account-page__detail-value">
                {roles.find((item) => item.id === staff?.departmentRoleId)?.name ?? "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {error ? <Alert type="error" message={error} showIcon /> : null}
      <Form.Item>
        <div className="my-account-page__form-actions">
          <Button type="primary" htmlType="submit" loading={submitting} disabled={!canEditProfile && !newPassword}>
            Save changes
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}
