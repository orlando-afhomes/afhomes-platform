"use client";

import { humanize } from "@/shared/lib/humanize";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { DELEGABLE_MODULES, MODULE_CATALOG, type AdminModuleId } from "@/modules/identity/permissions";
import type { DepartmentRole } from "@/modules/organization/types";
import { cleanTitleInput, isValidName } from "@/shared/utils/input-sanitizers";
import {
  useCreateDepartmentRole,
  useDepartments,
  useEffectiveModuleIds,
  useStaff,
  useUpdateDepartmentRole,
} from "@/data/queries";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SearchSelect } from "@/shared/components/modern/search-select";

const STATUS_ITEMS = [
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

// Long module lists scroll inside the dialog instead of pushing it off screen.
const DIALOG_CLASS = "tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-md";

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
      <Dialog open={open} onOpenChange={(next) => (!next ? onCloseForm() : undefined)}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>{editRole ? "Edit role" : "Create role"}</DialogTitle>
            <DialogDescription>
              {editRole ? "Update the role name, department, modules, or status." : "Add a department role and choose the modules it may access."}
            </DialogDescription>
          </DialogHeader>
          {open ? <RoleForm key={editRole ? editRole.id : "new"} editRole={editRole} onDone={onCloseForm} /> : null}
        </DialogContent>
      </Dialog>
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
    <Dialog open={viewRole !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>Role details</DialogTitle>
          <DialogDescription>Read-only summary of the role.</DialogDescription>
        </DialogHeader>
        {viewRole ? (
          <div className="tw:flex tw:flex-col tw:gap-4">
            <dl className="tw:flex tw:flex-col">
              <DetailRow term="Role Name">{viewRole.name}</DetailRow>
              <DetailRow term="Department">
                {departments.find((item) => item.id === viewRole.departmentId)?.name ?? "Unknown department"}
              </DetailRow>
              <DetailRow term="Status">
                <StatusBadge status={viewRole.status} />
              </DetailRow>
              <DetailRow term="Created">{viewRole.createdAt}</DetailRow>
            </dl>
            <section className="tw:flex tw:flex-col tw:gap-2">
              <h3 className="tw:font-semibold">Authorized modules</h3>
              <div className="tw:flex tw:flex-wrap tw:gap-1">
                {viewRole.moduleIds.map((moduleId: string) => (
                  <Badge key={moduleId} variant="outline">
                    {moduleLabel(moduleId)}
                  </Badge>
                ))}
              </div>
            </section>
            <section className="tw:flex tw:flex-col tw:gap-2">
              <h3 className="tw:font-semibold">Assigned staff ({assigned.length})</h3>
              {assigned.length === 0 ? (
                <p className="tw:text-muted-foreground">No staff assigned to this role.</p>
              ) : (
                <ul className="tw:m-0 tw:list-disc tw:pl-5">
                  {assigned.map((member) => (
                    <li key={member.id}>{member.displayName}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
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

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

type FieldErrors = { name?: string; department?: string; modules?: string };

function RoleForm({ editRole, onDone }: { editRole: DepartmentRole | null; onDone: () => void }) {
  const createRole = useCreateDepartmentRole();
  const updateRole = useUpdateDepartmentRole();
  const departmentsQuery = useDepartments();
  const granted = useEffectiveModuleIds();
  const nameId = useId();
  const nameErrorId = useId();
  const departmentErrorId = useId();
  const modulesLabelId = useId();
  const modulesErrorId = useId();

  const [name, setName] = useState(editRole?.name ?? "");
  const [departmentId, setDepartmentId] = useState(editRole?.departmentId ?? "");
  const [moduleIds, setModuleIds] = useState<string[]>(editRole ? [...editRole.moduleIds] : []);
  const [status, setStatus] = useState<"active" | "deactivated">(editRole?.status ?? "active");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmSave, setConfirmSave] = useState(false);
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

  const departmentItems = useMemo(() => {
    const all = departmentsQuery.data ?? [];
    return (editRole ? all : all.filter((dept) => dept.status === "active")).map((dept) => ({
      value: dept.id,
      label: dept.name,
    }));
  }, [departmentsQuery.data, editRole]);

  const validate = (): FieldErrors => {
    const trimmed = name.trim();
    const next: FieldErrors = {};
    if (!trimmed) next.name = "Role name is required.";
    else if (!isValidName(trimmed)) next.name = "Role name must contain letters only.";
    if (!departmentId) next.department = "Department is required.";
    if (moduleIds.length === 0) next.modules = "Select at least one authorized module.";
    return next;
  };

  const save = async () => {
    const trimmed = name.trim();
    setSubmitting(true);
    try {
      const payload = { name: trimmed, departmentId, moduleIds: moduleIds as AdminModuleId[], status };
      if (editRole) {
        await updateRole.mutateAsync({ id: editRole.id, ...payload });
        setConfirmSave(false);
        onDone();
        toast.success("Role updated successfully.", { description: `${trimmed} has been saved.` });
      } else {
        await createRole.mutateAsync(payload);
        onDone();
        toast.success("Role created successfully.", { description: `${trimmed} has been added.` });
      }
    } catch (err) {
      setConfirmSave(false);
      toast.error(editRole ? "Update failed." : "Create failed.", {
        description: err instanceof Error ? err.message : "Failed to save role.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (editRole) setConfirmSave(true);
    else void save();
  };

  const toggleModule = (moduleId: string, checked: boolean) => {
    setModuleIds((current) => (checked ? [...current, moduleId] : current.filter((id) => id !== moduleId)));
    if (errors.modules) setErrors((current) => ({ ...current, modules: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-4">
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor={nameId}>
          Role Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={nameId}
          placeholder="e.g. HR Staff"
          value={name}
          maxLength={80}
          aria-required="true"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? nameErrorId : undefined}
          className="tw:h-10 tw:sm:h-8"
          onChange={(event) => {
            setName(cleanTitleInput(event.target.value));
            if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        <div className="tw:flex tw:justify-between tw:gap-2">
          {errors.name ? (
            <p id={nameErrorId} role="alert" className="tw:text-sm tw:text-destructive">
              {errors.name}
            </p>
          ) : (
            <span />
          )}
          <span className="tw:text-xs tw:text-muted-foreground">{name.length} / 80</span>
        </div>
      </div>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label>
          Department <span aria-hidden="true">*</span>
        </Label>
        <SearchSelect
          items={departmentItems}
          value={departmentId || null}
          onChange={(next) => {
            setDepartmentId(next ?? "");
            if (errors.department) setErrors((current) => ({ ...current, department: undefined }));
          }}
          placeholder="Select department"
          aria-label="Role department"
          aria-required="true"
          aria-invalid={errors.department ? true : undefined}
          aria-describedby={errors.department ? departmentErrorId : undefined}
        />
        {errors.department ? (
          <p id={departmentErrorId} role="alert" className="tw:text-sm tw:text-destructive">
            {errors.department}
          </p>
        ) : null}
      </div>
      <fieldset
        aria-labelledby={modulesLabelId}
        aria-describedby={errors.modules ? modulesErrorId : undefined}
        className="tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:border-0 tw:p-0"
      >
        <legend id={modulesLabelId} className="tw:mb-1.5 tw:p-0 tw:font-medium">
          Authorized Modules <span aria-hidden="true">*</span>
        </legend>
        <div className="tw:grid tw:grid-cols-1 tw:gap-1 tw:sm:grid-cols-2">
          {delegableOptions.map((option) => (
            <label key={option.value} className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:sm:min-h-8">
              <Checkbox
                checked={moduleIds.includes(option.value)}
                onCheckedChange={(checked) => toggleModule(option.value, checked)}
                aria-invalid={errors.modules ? true : undefined}
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.modules ? (
          <p id={modulesErrorId} role="alert" className="tw:text-sm tw:text-destructive">
            {errors.modules}
          </p>
        ) : null}
        <p className="tw:text-xs tw:text-muted-foreground">Only implemented modules within your own authorized scope can be delegated.</p>
      </fieldset>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label>
          Status <span aria-hidden="true">*</span>
        </Label>
        <SearchSelect
          items={STATUS_ITEMS}
          value={status}
          onChange={(next) => setStatus(next === "deactivated" ? "deactivated" : "active")}
          aria-label="Role status"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className="tw:min-h-11 tw:sm:min-h-8">
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className="tw:min-h-11 tw:sm:min-h-8">
          {editRole ? "Save" : "Create"}
        </Button>
      </DialogFooter>
      {editRole ? (
        <ConfirmDialog
          open={confirmSave}
          title={`Save changes to ${name.trim()}?`}
          description="The role record will be updated."
          confirmText="Save"
          pending={submitting}
          onConfirm={() => void save()}
          onClose={() => setConfirmSave(false)}
        />
      ) : null}
    </form>
  );
}

function moduleLabel(moduleId: string): string {
  return MODULE_CATALOG.find((entry) => entry.id === moduleId)?.label ?? humanize(moduleId);
}
