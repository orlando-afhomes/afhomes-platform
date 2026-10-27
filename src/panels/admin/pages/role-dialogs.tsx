"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Checkbox, Form, Input, Modal, Select, Tag } from "antd";
import { DELEGABLE_MODULES, MODULE_CATALOG, type AdminModuleId } from "@/modules/identity/permissions";
import type { DepartmentRole } from "@/modules/organization/types";
import { cleanTitleInput, isValidName } from "@/shared/utils/input-sanitizers";
import { confirmAction, showError, showSuccess } from "@/shared/utils/feedback";
import {
  useCreateDepartmentRole,
  useDepartments,
  useEffectiveModuleIds,
  useStaff,
  useUpdateDepartmentRole,
} from "@/data/queries";

/** Lazy-loaded department-role dialog group: view, create, edit. */
export function RoleDialogs({
  open,
  editRole,
  viewRole,
  onCloseForm,
  onCloseView,
}: {
  open: boolean;
  editRole: DepartmentRole | null;
  viewRole: DepartmentRole | null;
  onCloseForm: () => void;
  onCloseView: () => void;
}) {
  return (
    <>
      <RoleViewDialog viewRole={viewRole} onClose={onCloseView} />
      <Modal
        title={editRole ? "Edit role" : "Create role"}
        open={open}
        onCancel={onCloseForm}
        footer={null}
        destroyOnHidden
      >
        {open ? <RoleForm key={editRole ? editRole.id : "new"} editRole={editRole} onDone={onCloseForm} /> : null}
      </Modal>
    </>
  );
}

function RoleViewDialog({ viewRole, onClose }: { viewRole: DepartmentRole | null; onClose: () => void }) {
  const departmentsQuery = useDepartments();
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const staffQuery = useStaff();
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const assigned = viewRole ? staff.filter((member) => member.departmentRoleId === viewRole.id) : [];

  return (
    <Modal title="Role details" open={viewRole !== null} onCancel={onClose} footer={null} destroyOnHidden>
      {viewRole ? (
        <div className="role-dialog__details">
          <dl className="role-dialog__definition-list">
            <div className="role-dialog__detail-row">
              <dt className="role-dialog__detail-term">Role Name</dt>
              <dd className="role-dialog__detail-value">{viewRole.name}</dd>
            </div>
            <div className="role-dialog__detail-row">
              <dt className="role-dialog__detail-term">Department</dt>
              <dd className="role-dialog__detail-value">
                {departments.find((item) => item.id === viewRole.departmentId)?.name ?? "Unknown department"}
              </dd>
            </div>
            <div className="role-dialog__detail-row">
              <dt className="role-dialog__detail-term">Status</dt>
              <dd className="role-dialog__detail-value">{viewRole.status}</dd>
            </div>
            <div className="role-dialog__detail-row">
              <dt className="role-dialog__detail-term">Created</dt>
              <dd className="role-dialog__detail-value">{viewRole.createdAt}</dd>
            </div>
          </dl>
          <div className="role-dialog__section">
            <div className="role-dialog__section-title">Authorized modules</div>
            <div className="role-dialog__tags">
              {viewRole.moduleIds.map((moduleId: string) => (
                <Tag key={moduleId}>{moduleLabel(moduleId)}</Tag>
              ))}
            </div>
          </div>
          <div className="role-dialog__section">
            <div className="role-dialog__section-title">Assigned staff ({assigned.length})</div>
            {assigned.length === 0 ? (
              <div className="role-dialog__empty">No staff assigned to this role.</div>
            ) : (
              <ul className="role-dialog__assignees">
                {assigned.map((member) => (
                  <li key={member.id} className="role-dialog__assignee">
                    {member.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

function RoleForm({ editRole, onDone }: { editRole: DepartmentRole | null; onDone: () => void }) {
  const createRole = useCreateDepartmentRole();
  const updateRole = useUpdateDepartmentRole();
  const departmentsQuery = useDepartments();
  const granted = useEffectiveModuleIds();

  const [name, setName] = useState(editRole?.name ?? "");
  const [departmentId, setDepartmentId] = useState(editRole?.departmentId ?? "");
  const [moduleIds, setModuleIds] = useState<string[]>(editRole ? [...editRole.moduleIds] : []);
  const [status, setStatus] = useState<"active" | "deactivated">(editRole?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The creator may only delegate implemented modules they hold themselves.
  const delegableOptions = useMemo(
    () =>
      MODULE_CATALOG.filter((entry) => DELEGABLE.has(entry.id) && granted.has(entry.id)).map((entry) => ({
        value: entry.id,
        label: entry.label,
      })),
    [granted],
  );

  const activeDepartments = useMemo(
    () => (departmentsQuery.data ?? []).filter((dept) => dept.status === "active"),
    [departmentsQuery.data],
  );

  const handleFinish = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Role name is required.");
      return;
    }
    if (!isValidName(trimmed)) {
      setError("Role name must contain letters only.");
      return;
    }
    if (!departmentId) {
      setError("Department is required.");
      return;
    }
    if (moduleIds.length === 0) {
      setError("Select at least one authorized module.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: trimmed, departmentId, moduleIds: moduleIds as AdminModuleId[], status };
      if (editRole) {
        const proceed = await confirmAction({
          title: `Save changes to ${trimmed}?`,
          text: "The role record will be updated.",
          confirmText: "Save",
        });
        if (!proceed) return;
        await updateRole.mutateAsync({ id: editRole.id, ...payload });
        onDone();
        await showSuccess("Role updated successfully.", `${trimmed} has been saved.`);
      } else {
        await createRole.mutateAsync(payload);
        onDone();
        await showSuccess("Role created successfully.", `${trimmed} has been added.`);
      }
    } catch (err) {
      await showError(editRole ? "Update failed." : "Create failed.", err instanceof Error ? err.message : "Failed to save role.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={() => void handleFinish()} className="role-dialog__form">
      <Form.Item label="Role Name" required>
        <Input
          placeholder="e.g. HR Staff"
          value={name}
          onChange={(event) => setName(cleanTitleInput(event.target.value))}
          maxLength={80}
          showCount
        />
      </Form.Item>
      <Form.Item label="Department" required>
        <Select
          aria-label="Role department"
          placeholder="Select department"
          value={departmentId || undefined}
          onChange={(value) => setDepartmentId(value)}
          options={(editRole ? (departmentsQuery.data ?? []) : activeDepartments).map((dept) => ({
            value: dept.id,
            label: dept.name,
          }))}
          loading={departmentsQuery.isLoading}
        />
      </Form.Item>
      <Form.Item label="Authorized Modules" required>
        <Checkbox.Group
          aria-label="Authorized modules"
          value={moduleIds}
          onChange={(values) => setModuleIds(values as string[])}
          className="role-dialog__modules"
        >
          <div className="role-dialog__module-list">
            {delegableOptions.map((option) => (
              <Checkbox key={option.value} value={option.value}>
                {option.label}
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
        <div className="role-dialog__hint">Only implemented modules within your own authorized scope can be delegated.</div>
      </Form.Item>
      <Form.Item label="Status" required>
        <Select
          aria-label="Role status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Active" },
            { value: "deactivated", label: "Deactivated" },
          ]}
        />
      </Form.Item>
      {error ? <Alert type="error" message={error} showIcon /> : null}
      <Form.Item>
        <div className="role-dialog__form-actions">
          <Button onClick={onDone}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editRole ? "Save" : "Create"}
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}

function moduleLabel(moduleId: string): string {
  return MODULE_CATALOG.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}
