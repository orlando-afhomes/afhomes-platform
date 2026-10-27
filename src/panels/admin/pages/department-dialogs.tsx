"use client";

import { useState } from "react";
import { Alert, Button, Form, Input, Modal, Select } from "antd";
import type { Department } from "@/modules/organization/types";
import { useCreateDepartment, useUpdateDepartment } from "@/data/queries";
import { cleanTitleInput, isValidName } from "@/shared/utils/input-sanitizers";
import { confirmAction, showError, showSuccess } from "@/shared/utils/feedback";

/** Lazy-loaded department dialog group: view, create, and edit. */
export function DepartmentDialogs({
  open,
  editDept,
  viewDept,
  roleCount,
  staffCount,
  onCloseForm,
  onCloseView,
}: {
  open: boolean;
  editDept: Department | null;
  viewDept: Department | null;
  roleCount: number;
  staffCount: number;
  onCloseForm: () => void;
  onCloseView: () => void;
}) {
  return (
    <>
      <DepartmentViewDialog viewDept={viewDept} roleCount={roleCount} staffCount={staffCount} onClose={onCloseView} />
      <Modal
        title={editDept ? "Edit department" : "Create department"}
        open={open}
        onCancel={onCloseForm}
        footer={null}
        destroyOnHidden
      >
        {open ? <DepartmentForm key={editDept ? editDept.id : "new"} editDept={editDept} onDone={onCloseForm} /> : null}
      </Modal>
    </>
  );
}

function DepartmentViewDialog({
  viewDept,
  roleCount,
  staffCount,
  onClose,
}: {
  viewDept: Department | null;
  roleCount: number;
  staffCount: number;
  onClose: () => void;
}) {
  return (
    <Modal title="Department details" open={viewDept !== null} onCancel={onClose} footer={null} destroyOnHidden>
      {viewDept ? (
        <dl className="department-dialog__details">
          <div className="department-dialog__detail-row">
            <dt className="department-dialog__detail-term">Name</dt>
            <dd className="department-dialog__detail-value">{viewDept.name}</dd>
          </div>
          <div className="department-dialog__detail-row">
            <dt className="department-dialog__detail-term">Status</dt>
            <dd className="department-dialog__detail-value">{viewDept.status}</dd>
          </div>
          <div className="department-dialog__detail-row">
            <dt className="department-dialog__detail-term">Roles</dt>
            <dd className="department-dialog__detail-value">{roleCount}</dd>
          </div>
          <div className="department-dialog__detail-row">
            <dt className="department-dialog__detail-term">Staff</dt>
            <dd className="department-dialog__detail-value">{staffCount}</dd>
          </div>
        </dl>
      ) : null}
    </Modal>
  );
}

function DepartmentForm({ editDept, onDone }: { editDept: Department | null; onDone: () => void }) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const [name, setName] = useState(editDept?.name ?? "");
  const [status, setStatus] = useState<"active" | "deactivated">(editDept?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Department name is required.");
      return;
    }
    if (!isValidName(trimmed)) {
      setError("Department name must contain letters only.");
      return;
    }
    setSubmitting(true);
    try {
      if (editDept) {
        const proceed = await confirmAction({
          title: `Save changes to ${trimmed}?`,
          text: "The department record will be updated.",
          confirmText: "Save",
        });
        if (!proceed) return;
        await updateDepartment.mutateAsync({ id: editDept.id, name: trimmed, status });
        onDone();
        await showSuccess("Department updated successfully.", `${trimmed} has been saved.`);
      } else {
        await createDepartment.mutateAsync({ name: trimmed, status });
        onDone();
        await showSuccess("Department created successfully.", `${trimmed} has been added.`);
      }
    } catch (err) {
      await showError(editDept ? "Update failed." : "Create failed.", err instanceof Error ? err.message : "Failed to save department.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={() => void handleFinish()} className="department-dialog__form">
      <Form.Item label="Department Name" required>
        <Input
          placeholder="Name"
          value={name}
          maxLength={80}
          showCount
          onChange={(event) => setName(cleanTitleInput(event.target.value))}
        />
      </Form.Item>
      <Form.Item label="Status" required>
        <Select
          aria-label="Department status"
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
        <div className="department-dialog__form-actions">
          <Button onClick={onDone}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editDept ? "Save" : "Create"}
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}
