"use client";

import { useId, useState } from "react";
import { Building2 } from "lucide-react";
import { useFormDirty } from "@/shared/forms/modern/use-form-dirty";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import type { Department } from "@/modules/organization/types";
import { useCreateDepartment, useRoleOptions, useUpdateDepartment } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { activeRoles } from "@/modules/identity/active-roles";
import { cleanTitleInput, isValidName } from "@/shared/utils/input-sanitizers";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SearchSelect } from "@/shared/components/modern/search-select";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { RecordDetailsDialog } from "@/shared/components/modern/record-details-dialog";
import { StatusBadge } from "@/shared/components/modern/status-badge";

const STATUS_ITEMS = [
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

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
      <Dialog open={open} onOpenChange={(next) => (!next ? onCloseForm() : undefined)}>
        <DialogContent className="tw:sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDept ? "Edit Department" : "Create Department"}</DialogTitle>
            <DialogDescription>
              {editDept ? "Update the department name or status." : "Add a department to the directory."}
            </DialogDescription>
          </DialogHeader>
          {open ? <DepartmentForm key={editDept ? editDept.id : "new"} editDept={editDept} onDone={onCloseForm} /> : null}
        </DialogContent>
      </Dialog>
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
    <RecordDetailsDialog
      open={viewDept !== null}
      onClose={onClose}
      title={viewDept?.name ?? "Department Details"}
      subtitle={viewDept ? `Department Details · ${viewDept.code}` : undefined}
      icon={<Building2 />}
      badge={viewDept ? <StatusBadge status={viewDept.status} /> : null}
      sections={[
        {
          title: "Overview",
          rows: [
            { label: "Name", value: viewDept?.name ?? "—" },
            { label: "Status", value: <StatusBadge status={viewDept?.status ?? ""} /> },
            { label: "Roles", value: roleCount },
            { label: "Staff", value: staffCount },
          ],
        },
      ]}
      footer={
        <Button type="button" variant="outline" onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
          Close
        </Button>
      }
    />
  );
}

function DepartmentForm({ editDept, onDone }: { editDept: Department | null; onDone: () => void }) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const rolesQuery = useRoleOptions();
  const { identity } = useDevIdentity();
  const nameId = useId();
  const nameErrorId = useId();
  const [name, setName] = useState(editDept?.name ?? "");
  const [status, setStatus] = useState<"active" | "deactivated">(editDept?.status ?? "active");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { dirty } = useFormDirty({ name, status });
  // The department holding the protected Super Admin role keeps its status
  // Super Admin only; metadata edits stay available to departments holders.
  // The repository re-checks every status change.
  const holdsProtectedRole = editDept
    ? (rolesQuery.data ?? []).some((role) => role.departmentId === editDept.id && role.isProtected)
    : false;
  const statusLocked = holdsProtectedRole && !activeRoles(identity).includes("super_admin");

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Department name is required.";
    if (!isValidName(trimmed)) return "Department name must contain letters only.";
    return null;
  };

  const save = async () => {
    const trimmed = name.trim();
    setSubmitting(true);
    try {
      if (editDept) {
        await updateDepartment.mutateAsync({ id: editDept.id, name: trimmed, status });
        setConfirmSave(false);
        onDone();
        toast.success("Department updated successfully.", { description: `${trimmed} has been saved.` });
      } else {
        await createDepartment.mutateAsync({ name: trimmed, status });
        onDone();
        toast.success("Department created successfully.", { description: `${trimmed} has been added.` });
      }
    } catch (err) {
      setConfirmSave(false);
      notify.actionError(err, editDept ? "Update failed." : "Create failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    setNameError(error);
    if (error) return;
    if (editDept) setConfirmSave(true);
    else void save();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-4">
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor={nameId}>
          Department Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={nameId}
          placeholder="Name"
          value={name}
          maxLength={80}
          aria-required="true"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? nameErrorId : undefined}
          className="tw:h-10 tw:sm:h-8"
          onChange={(event) => {
            setName(cleanTitleInput(event.target.value));
            if (nameError) setNameError(null);
          }}
        />
        <div className="tw:flex tw:justify-between tw:gap-2">
          {nameError ? (
            <p id={nameErrorId} role="alert" className="tw:text-sm tw:text-destructive">
              {nameError}
            </p>
          ) : (
            <span />
          )}
          <span className="tw:text-xs tw:text-muted-foreground">{name.length} / 80</span>
        </div>
      </div>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label>
          Status <span aria-hidden="true">*</span>
        </Label>
        {statusLocked ? (
          <Alert>
            <AlertDescription>Only a Super Administrator can change this department&apos;s status.</AlertDescription>
          </Alert>
        ) : null}
        <div className="tw:w-full">
          <SearchSelect
            items={STATUS_ITEMS}
            value={status}
            onChange={(next) => setStatus(next === "deactivated" ? "deactivated" : "active")}
            disabled={statusLocked}
            aria-label="Department status"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className="tw:min-h-11 tw:sm:min-h-8">
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!dirty} className="tw:min-h-11 tw:sm:min-h-8">
          {editDept ? "Save" : "Create"}
        </Button>
      </DialogFooter>
      {editDept ? (
        <ConfirmDialog
          open={confirmSave}
          title={`Save Changes to ${name.trim()}?`}
          description="The department record will be updated."
          confirmText="Save"
          pending={submitting}
          onConfirm={() => void save()}
          onClose={() => setConfirmSave(false)}
        />
      ) : null}
    </form>
  );
}
