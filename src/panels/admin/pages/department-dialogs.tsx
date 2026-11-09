"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import type { Department } from "@/modules/organization/types";
import { useCreateDepartment, useRoleOptions, useUpdateDepartment } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { hasActiveSystemRole } from "@/data/mock/authorization";
import { cleanTitleInput, isValidName } from "@/shared/utils/input-sanitizers";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
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
            <DialogTitle>{editDept ? "Edit department" : "Create department"}</DialogTitle>
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
    <Dialog open={viewDept !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="tw:sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Department details</DialogTitle>
          <DialogDescription>Read-only summary of the department.</DialogDescription>
        </DialogHeader>
        {viewDept ? (
          <dl className="tw:flex tw:flex-col">
            <DetailRow term="Name">{viewDept.name}</DetailRow>
            <DetailRow term="Status">
              <StatusBadge status={viewDept.status} />
            </DetailRow>
            <DetailRow term="Roles">{roleCount}</DetailRow>
            <DetailRow term="Staff">{staffCount}</DetailRow>
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-2 tw:last:border-b-0">
      <dt className="tw:w-28 tw:shrink-0 tw:font-medium tw:text-muted-foreground">{term}</dt>
      <dd className="tw:min-w-0 tw:flex-1">{children}</dd>
    </div>
  );
}

function DepartmentForm({ editDept, onDone }: { editDept: Department | null; onDone: () => void }) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const rolesQuery = useRoleOptions();
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const nameId = useId();
  const nameErrorId = useId();
  const [name, setName] = useState(editDept?.name ?? "");
  const [status, setStatus] = useState<"active" | "deactivated">(editDept?.status ?? "active");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The department holding the protected Super Admin role keeps its status
  // Super Admin only; metadata edits stay available to departments holders.
  // The repository re-checks every status change.
  const holdsProtectedRole = editDept
    ? (rolesQuery.data ?? []).some((role) => role.departmentId === editDept.id && role.isProtected)
    : false;
  const statusLocked = holdsProtectedRole && !hasActiveSystemRole(store, identity, "super_admin");

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
      toast.error(editDept ? "Update failed." : "Create failed.", {
        description: err instanceof Error ? err.message : "Failed to save department.",
      });
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
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(next) => setStatus(next === "deactivated" ? "deactivated" : "active")}
          disabled={statusLocked}
        >
          <SelectTrigger aria-label="Department status" className="tw:h-10 tw:w-full tw:sm:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className="tw:min-h-11 tw:sm:min-h-8">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="tw:min-h-11 tw:sm:min-h-8">
          {editDept ? "Save" : "Create"}
        </Button>
      </DialogFooter>
      {editDept ? (
        <ConfirmDialog
          open={confirmSave}
          title={`Save changes to ${name.trim()}?`}
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
