"use client";

import { Alert, Avatar, Button, Descriptions, Form, Input, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { Department, StaffMember } from "@/modules/organization/types";

const ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ist", "ost"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// Lazy-loaded dialog group for Organization & Staff. All state, validation,
// and repository rules live in the page; this file only presents with antd.
export function OrganizationDialogs(props: {
  // Department form
  deptDialog: boolean;
  editDept: Department | null;
  deptName: string;
  setDeptName: (value: string) => void;
  deptStatus: "active" | "deactivated";
  setDeptStatus: (value: "active" | "deactivated") => void;
  // Staff form
  staffDialog: boolean;
  editStaff: StaffMember | null;
  staffName: string;
  setStaffName: (value: string) => void;
  staffPosition: string;
  setStaffPosition: (value: string) => void;
  staffEmail: string;
  setStaffEmail: (value: string) => void;
  staffDept: string;
  setStaffDept: (value: string) => void;
  staffRole: string;
  setStaffRole: (value: string) => void;
  staffPassword: string;
  setStaffPassword: (value: string) => void;
  staffAvatar: string | null;
  setStaffAvatar: (value: string | null) => void;
  avatarError: string | null;
  setAvatarError: (value: string | null) => void;
  // Shared
  error: string | null;
  submitting: boolean;
  departments: Department[];
  activeDepartments: Department[];
  canProvisionAccounts: boolean;
  activeRolesList: string[];
  // Profile
  profileStaff: StaffMember | null;
  setProfileStaff: (staff: StaffMember | null) => void;
  openEditStaff: (staff: StaffMember) => void;
  // Actions
  saveDepartment: () => void;
  saveStaff: () => void;
  closeDeptDialog: () => void;
  closeStaffDialog: () => void;
}) {
  return (
    <>
      <DepartmentDialog {...props} />
      <StaffDialog {...props} />
      <StaffProfileDialog
        profileStaff={props.profileStaff}
        departments={props.departments}
        onClose={() => props.setProfileStaff(null)}
        onEdit={(s) => {
          props.setProfileStaff(null);
          props.openEditStaff(s);
        }}
      />
    </>
  );
}

type DialogProps = React.ComponentProps<typeof OrganizationDialogs>;

function DepartmentDialog({ deptDialog, editDept, deptName, setDeptName, deptStatus, setDeptStatus, error, submitting, saveDepartment, closeDeptDialog }: DialogProps) {
  return (
    <Modal
      title={editDept ? "Edit department" : "Create department"}
      open={deptDialog}
      onCancel={closeDeptDialog}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" onFinish={saveDepartment}>
        <Form.Item label="Department Name" required>
          <Input placeholder="Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
        </Form.Item>
        <Form.Item label="Status" required>
          <Select
            aria-label="Department status"
            value={deptStatus}
            onChange={(value) => setDeptStatus(value)}
            options={[
              { value: "active", label: "Active" },
              { value: "deactivated", label: "Deactivated" },
            ]}
          />
        </Form.Item>
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeDeptDialog}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>{editDept ? "Save" : "Create"}</Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function StaffDialog(props: DialogProps) {
  const {
    staffDialog, editStaff, staffName, setStaffName, staffPosition, setStaffPosition,
    staffEmail, setStaffEmail, staffDept, setStaffDept, staffRole, setStaffRole,
    staffPassword, setStaffPassword, staffAvatar, setStaffAvatar, avatarError, setAvatarError,
    error, submitting, departments, activeDepartments, canProvisionAccounts, activeRolesList,
    saveStaff, closeStaffDialog,
  } = props;

  const handleAvatarFile = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) { setAvatarError("Unsupported image format."); return; }
    if (file.size > 2 * 1024 * 1024) { setAvatarError("Image must be 2MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => setStaffAvatar(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  return (
    <Modal
      title={editStaff ? "Edit staff" : "Add staff"}
      open={staffDialog}
      onCancel={closeStaffDialog}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" onFinish={saveStaff}>
        <Form.Item label="Profile picture">
          <div className="flex items-center gap-3">
            <Avatar size={64} src={staffAvatar ?? undefined}>
              {staffAvatar ? null : initials(staffName || "Staff")}
            </Avatar>
            <div className="flex flex-col gap-1">
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
              {staffAvatar ? <Button onClick={() => setStaffAvatar(null)}>Remove</Button> : null}
              {avatarError ? <Alert type="error" title={avatarError} showIcon /> : null}
            </div>
          </div>
        </Form.Item>
        <Form.Item label="Full Name" required>
          <Input placeholder="Full Name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
        </Form.Item>
        <Form.Item label="Position">
          <Input placeholder="Position" value={staffPosition} onChange={(e) => setStaffPosition(e.target.value)} />
        </Form.Item>
        <Form.Item label="Email" required>
          <Input placeholder="Email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
        </Form.Item>
        <Form.Item label="Department" required>
          <Select
            aria-label="Staff department"
            placeholder="Select department"
            value={staffDept || undefined}
            onChange={(value) => setStaffDept(value)}
            options={(editStaff ? departments : activeDepartments).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        {canProvisionAccounts ? (
          <>
            <Form.Item label="Role">
              <Select
                aria-label="Staff role"
                placeholder="Select role"
                value={staffRole || undefined}
                onChange={(value) => setStaffRole(value)}
                options={ROLES.filter((r) => r !== "super_admin" || activeRolesList.includes("super_admin")).map((r) => ({ value: r, label: r }))}
              />
            </Form.Item>
            <Form.Item label="Temporary Password">
              <Input.Password
                placeholder="Temporary Password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                visibilityToggle
              />
            </Form.Item>
          </>
        ) : (
          <p className="text-muted-foreground">Account provisioning and role assignment are restricted to authorized administrators. A staff record will be created without a linked account.</p>
        )}
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeStaffDialog}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>{editStaff ? "Save" : "Add"}</Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function StaffProfileDialog({ profileStaff, departments, onClose, onEdit }: {
  profileStaff: StaffMember | null;
  departments: Department[];
  onClose: () => void;
  onEdit: (staff: StaffMember) => void;
}) {
  return (
    <Modal title="Employee profile" open={!!profileStaff} onCancel={onClose} footer={null} destroyOnHidden>
      {profileStaff ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar size={64} src={profileStaff.avatarUrl ?? undefined}>
              {profileStaff.avatarUrl ? null : initials(profileStaff.displayName)}
            </Avatar>
            <div>
              <div className="font-medium">{profileStaff.displayName}</div>
              <div className="text-muted-foreground">{profileStaff.position}</div>
            </div>
          </div>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Email">{profileStaff.email}</Descriptions.Item>
            <Descriptions.Item label="Department">{departments.find((d) => d.id === profileStaff.departmentId)?.name ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Status">{profileStaff.status}</Descriptions.Item>
            <Descriptions.Item label="Linked account">{profileStaff.accountId ?? "—"}</Descriptions.Item>
          </Descriptions>
          <div className="flex justify-end">
            <Button type="primary" onClick={() => onEdit(profileStaff)}>Edit</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
