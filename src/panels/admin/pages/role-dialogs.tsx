"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import { Ban, CircleCheck, LayoutGrid, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { DELEGABLE_MODULES, MODULE_CATALOG, MODULE_GROUPS, type AdminModuleId } from "@/modules/identity/permissions";
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
import { ModuleAccessList } from "@/shared/components/modern/module-access";
import { RecordDetailsDialog } from "@/shared/components/modern/record-details-dialog";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { RadioCardField, TextField } from "@/shared/forms/modern";
import { useFormDirty } from "@/shared/forms/modern/use-form-dirty";
import { Label } from "@/shared/ui/label";
import { SearchSelect } from "@/shared/components/modern/search-select";

const STATUS_OPTIONS = [
  { value: "active" as const, label: "Active", description: "The role gives its modules to staff.", icon: <CircleCheck className="tw:size-4" /> },
  { value: "deactivated" as const, label: "Deactivated", description: "The role stays on record but gives no access.", icon: <Ban className="tw:size-4" /> },
];

// Long module lists scroll inside the dialog instead of pushing it off screen.
const FORM_DIALOG_CLASS = "tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-2xl";

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
        <DialogContent className={FORM_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
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
  const departmentName = viewRole ? (departments.find((item) => item.id === viewRole.departmentId)?.name ?? EMPTY) : EMPTY;

  return (
    <RecordDetailsDialog
      open={viewRole !== null}
      onClose={onClose}
      title={viewRole?.name ?? "Role Details"}
      subtitle={viewRole ? `Role Details · ${departmentName}` : undefined}
      icon={<ShieldCheck />}
      badge={viewRole ? (
        <>
          <StatusBadge status={viewRole.status} />
          {viewRole.isProtected ? (
            <ToneBadge tone="brand" icon={LockKeyhole}>
              Protected
            </ToneBadge>
          ) : null}
        </>
      ) : null}
      sections={[
        {
          title: "Overview",
          rows: [
            { label: "Role Name", value: viewRole?.name ?? "—" },
            { label: "Department", value: departmentName },
            { label: "Status", value: <StatusBadge status={viewRole?.status ?? ""} /> },
            { label: "Created", value: viewRole?.createdAt ?? "—" },
          ],
        },
        {
          title: "Authorized Modules",
          icon: <LayoutGrid />,
          content: <ModuleAccessList moduleIds={viewRole?.moduleIds ?? []} showAll label="Authorized modules" />,
        },
        {
          title: `Assigned Staff (${assigned.length})`,
          icon: <UsersRound />,
          content:
            assigned.length === 0 ? (
              <p className="tw:text-sm tw:text-muted-foreground">No staff assigned to this role.</p>
            ) : (
              <div className="tw:flex tw:flex-wrap tw:gap-1.5">
                {assigned.map((member) => (
                  <ToneBadge key={member.id} tone="brand" icon={UserRound}>
                    {member.displayName}
                  </ToneBadge>
                ))}
              </div>
            ),
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

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

type FieldErrors = { name?: string; department?: string; modules?: string };

function RoleForm({ editRole, onDone }: { editRole: DepartmentRole | null; onDone: () => void }) {
  const createRole = useCreateDepartmentRole();
  const updateRole = useUpdateDepartmentRole();
  const departmentsQuery = useDepartments();
  const granted = useEffectiveModuleIds();
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
  const { dirty } = useFormDirty({ name, departmentId, moduleIds: [...moduleIds].sort(), status });

  // The creator may only delegate implemented modules they hold themselves.
  const delegableOptions = useMemo(
    () =>
      MODULE_CATALOG.filter((entry) => DELEGABLE.has(entry.id)).map((entry) => ({
        value: entry.id,
        label: entry.label,
        group: entry.group,
        // A creator can only give modules they hold; the others show locked.
        held: granted.has(entry.id),
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
      notify.actionError(err, editRole ? "Update failed." : "Create failed.");
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

  const toggleGroup = (ids: string[], checked: boolean) => {
    setModuleIds((current) => (checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id))));
    if (errors.modules) setErrors((current) => ({ ...current, modules: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-5">
      <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2">
      <TextField
        label="Role Name"
        placeholder="HR Staff"
        required
        value={name}
        maxLength={80}
        hint={`${name.length} / 80`}
        error={errors.name}
        onChange={(next) => {
          setName(cleanTitleInput(next));
          if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
        }}
      />
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
      </div>
      <fieldset
        aria-labelledby={modulesLabelId}
        aria-describedby={errors.modules ? modulesErrorId : undefined}
        className="tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:border-0 tw:p-0"
      >
        <legend id={modulesLabelId} className="tw:mb-2 tw:flex tw:w-full tw:items-center tw:justify-between tw:p-0 tw:font-medium">
          <span>
            Authorized Modules <span aria-hidden="true">*</span>
          </span>
          <span className="tw:text-xs tw:font-normal tw:text-muted-foreground">{moduleIds.length} selected</span>
        </legend>
        <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
          {MODULE_GROUPS.map((group) => {
            const options = delegableOptions.filter((option) => option.group === group);
            if (options.length === 0) return null;
            const ids: string[] = options.filter((option) => option.held).map((option) => option.value);
            const chosen = ids.filter((id) => moduleIds.includes(id)).length;
            return (
              <div key={group} className="tw:flex tw:flex-col tw:gap-1 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-3">
                <div className="tw:flex tw:items-center tw:justify-between tw:gap-2 tw:border-b tw:border-border tw:pb-2">
                  <span className="tw:text-sm tw:font-semibold">{group}</span>
                  <label className="tw:flex tw:cursor-pointer tw:items-center tw:gap-1.5 tw:text-xs tw:text-muted-foreground">
                    <Checkbox checked={ids.length > 0 && chosen === ids.length} disabled={ids.length === 0} onCheckedChange={(checked) => toggleGroup(ids, checked)} aria-label={`Select all ${group}`} />
                    All
                  </label>
                </div>
                {options.map((option) => (
                  <label key={option.value} className={`tw:flex tw:min-h-11 tw:items-center tw:gap-2 tw:sm:min-h-8 ${option.held ? "tw:cursor-pointer" : "tw:cursor-not-allowed tw:text-muted-foreground"}`}>
                    <Checkbox
                      checked={moduleIds.includes(option.value)}
                      disabled={!option.held}
                      onCheckedChange={(checked) => toggleModule(option.value, checked)}
                      aria-invalid={errors.modules ? true : undefined}
                    />
                    {option.label}
                    {option.held ? null : <span className="tw:ml-auto tw:text-xs">Not held</span>}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        {errors.modules ? (
          <p id={modulesErrorId} role="alert" className="tw:text-sm tw:text-destructive">
            {errors.modules}
          </p>
        ) : null}
      </fieldset>
      <RadioCardField<"active" | "deactivated"> label="Status" required value={status} options={STATUS_OPTIONS} onChange={setStatus} variant="card" />
      <DialogFooter className="tw:sticky tw:bottom-0 tw:-mx-4 tw:-mb-4 tw:border-t tw:border-border tw:bg-popover tw:px-4 tw:py-3">
        <Button type="button" variant="outline" onClick={onDone} className="tw:min-h-11 tw:sm:min-h-8">
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!dirty} className="tw:min-h-11 tw:sm:min-h-8">
          {editRole ? "Save" : "Create"}
        </Button>
      </DialogFooter>
      {editRole ? (
        <ConfirmDialog
          open={confirmSave}
          title={`Save Changes to ${name.trim()}?`}
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
