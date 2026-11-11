"use client";

import { humanize } from "@/shared/lib/humanize";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getSystemRoleLabel } from "@/panels/admin/role-label";
import { MODULE_CATALOG, departmentRoleConfersAccess, getDelegableGrants, resolveEmployeeEffectiveModules } from "@/modules/identity/permissions";
import type { StaffMember } from "@/modules/organization/types";
import { normalizeLandline, normalizePhilippineMobile, normalizePostalCode } from "@/shared/utils/input-sanitizers";
import {
  formatPhilippineLandlineDisplay,
  maskGovIdNumber,
  validateBarangay,
  validateCity,
  validateConfirmPassword,
  validateEmailAddress,
  validateFacebook,
  validateGovIdNumber,
  validateLandline,
  validateMiddleName,
  validateMobileNumber,
  validatePassword,
  validatePersonName,
  validatePostalCode,
  validateProvince,
  validateStreet,
  validateSuffix,
  validateTinNumber,
} from "@/shared/forms";
import {
  ConfirmPasswordField,
  EmailField,
  GovernmentIdFields,
  MiddleNameField,
  PasswordField,
  PersonNameField,
  PhilippineAddressFields,
  PhilippineMobileField,
  ProfilePhotoUploader,
  SelectField,
  SuffixField,
  TextField,
  TinField,
} from "@/shared/forms/modern";
import type { Account, AccountActionPolicy, AccountStatus } from "@/modules/accounts/types";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { FormGrid, FormSection } from "@/shared/components/modern/form-layout";
import { DetailList, DetailRow, InfoNote } from "@/shared/components/modern/detail-list";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { LINKED_ACCOUNT_ACTION_LABELS, confirmLinkedAccountStatus, linkedAccountActions } from "./staff-account-actions";
import {
  useAccountPolicies,
  useCreateStaff,
  useDepartments,
  useEffectiveModuleIds,
  useRoleOptions,
  useStaff,
  useStaffPolicies,
  useUpdateLinkedAccountStatus,
  useUpdateStaff,
} from "@/data/queries";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated", "Divorced"].map((value) => ({
  value,
  label: value,
}));

const GOV_ID_OPTIONS = [
  "Philippine National ID",
  "Passport",
  "Driver's License",
  "SSS ID",
  "GSIS ID",
  "PRC ID",
  "Voter's ID",
  "Postal ID",
  "Other",
].map((value) => ({ value, label: value }));

const BUTTON_CLASS = "tw:min-h-11 tw:sm:min-h-8";

/** Split a legacy single-string display name into parts for the name fields. */
function splitDisplayName(displayName: string): { first: string; middle: string; last: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts.slice(1).join(" ") };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

/**
 * Account actions an Accounts-module holder may open from the profile; each
 * callback is passed only when the actor's account policy allows it.
 */
export type ProfileAccountActions = {
  onManageRoles?: () => void;
  onChangeStatus?: () => void;
};

/** Lazy-loaded staff dialog group: add/edit form and read-only profile. */
export function StaffDialogs({
  open,
  editStaff,
  profileStaff,
  profileAccountActions,
  profileAccount,
  profileAccountPolicy,
  onOpenEdit,
  onCloseForm,
  onCloseProfile,
}: {
  open: boolean;
  editStaff: StaffMember | null;
  profileStaff: StaffMember | null;
  profileAccountActions?: ProfileAccountActions;
  /** Full linked account, passed only to Accounts-module holders. */
  profileAccount?: Account | null;
  profileAccountPolicy?: AccountActionPolicy | null;
  onOpenEdit: (member: StaffMember) => void;
  onCloseForm: () => void;
  onCloseProfile: () => void;
}) {
  const granted = useEffectiveModuleIds();
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (!next ? onCloseForm() : undefined)}>
        <DialogContent className="tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editStaff ? "Edit staff" : "Add staff"}</DialogTitle>
            <DialogDescription>
              {editStaff ? "Update the employee's profile and assignment." : "Add an employee. A linked Pending account is created with the record."}
            </DialogDescription>
          </DialogHeader>
          {open ? <StaffForm key={editStaff ? editStaff.id : "new"} editStaff={editStaff} onDone={onCloseForm} /> : null}
        </DialogContent>
      </Dialog>
      <StaffProfileDialog
        profileStaff={profileStaff}
        canViewRoles={granted.has("roles")}
        accountActions={profileAccountActions}
        account={profileAccount ?? null}
        accountPolicy={profileAccountPolicy ?? null}
        onClose={onCloseProfile}
        onEdit={onOpenEdit}
      />
    </>
  );
}

type Errors = Partial<Record<string, string>>;

function StaffForm({ editStaff, onDone }: { editStaff: StaffMember | null; onDone: () => void }) {
  const departmentsQuery = useDepartments();
  const rolesQuery = useRoleOptions();
  const staffQuery = useStaff();
  const policiesQuery = useStaffPolicies();
  const accountPoliciesQuery = useAccountPolicies();
  const granted = useEffectiveModuleIds();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const formRef = useRef<HTMLFormElement>(null);
  // Department and role stay unchanged (and are not sent) when the actor may not change them.
  const assignmentRestriction = editStaff ? (policiesQuery.data?.[editStaff.id]?.assignmentRestriction ?? null) : null;
  const assignmentLocked = assignmentRestriction !== null;
  // Name and email sync to the linked account, which rejects protected-record
  // changes; other profile fields stay editable.
  const identityRestriction = editStaff ? (policiesQuery.data?.[editStaff.id]?.identityRestriction ?? null) : null;
  const identityLocked = identityRestriction !== null;

  const splitName = splitDisplayName(editStaff?.displayName ?? "");
  const [firstName, setFirstName] = useState(editStaff?.firstName ?? splitName.first);
  const [middleName, setMiddleName] = useState(editStaff?.middleName ?? splitName.middle);
  const [noMiddleName, setNoMiddleName] = useState(editStaff ? !(editStaff.middleName ?? splitName.middle).trim() : false);
  const [lastName, setLastName] = useState(editStaff?.lastName ?? splitName.last);
  const [suffix, setSuffix] = useState(editStaff?.suffix ?? "");
  const [mobileNumber, setMobileNumber] = useState(editStaff?.mobileNumber ?? "");
  const [email, setEmail] = useState(editStaff?.email ?? "");
  const [street, setStreet] = useState(editStaff?.street ?? "");
  const [province, setProvince] = useState(editStaff?.province ?? "");
  const [city, setCity] = useState(editStaff?.city ?? "");
  const [barangay, setBarangay] = useState(editStaff?.barangay ?? "");
  const [postalCode, setPostalCode] = useState(editStaff?.postalCode ?? "");
  const [telephone, setTelephone] = useState(editStaff?.telephone ?? "");
  const [facebook, setFacebook] = useState(editStaff?.facebook ?? "");
  const [tin, setTin] = useState(editStaff?.tin ?? "");
  const [gender, setGender] = useState<string | undefined>(editStaff?.gender ?? undefined);
  const [civilStatus, setCivilStatus] = useState<string | undefined>(editStaff?.civilStatus ?? undefined);
  const [governmentIdType, setGovernmentIdType] = useState<string | undefined>(editStaff?.governmentIdType ?? undefined);
  const [governmentIdNumber, setGovernmentIdNumber] = useState(editStaff?.governmentIdNumber ?? "");
  const [departmentId, setDepartmentId] = useState(editStaff?.departmentId ?? "");
  const [departmentRoleId, setDepartmentRoleId] = useState(editStaff?.departmentRoleId ?? "");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [systemRoleIds, setSystemRoleIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(editStaff?.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayName = [firstName.trim(), noMiddleName ? "" : middleName.trim(), lastName.trim(), suffix.trim()]
    .filter(Boolean)
    .join(" ");

  // Every new employee gets a linked Pending account (doc 01 §5, §6.2), created
  // atomically with the staff record; activation stays Admin/Super Admin only.
  const canProvisionAccounts = !editStaff;
  // Admin/Super Admin may also grant system roles to the new account.
  const canGrantSystemRoles = canProvisionAccounts && granted.has("accounts");
  const creatableRoles = accountPoliciesQuery.data?.creatableRoles ?? [];
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const selectableDepartments = departments.filter((dept) => dept.status === "active" || dept.id === editStaff?.departmentId);
  // Only roles the actor may assign; the current role stays visible when locked.
  const availableRoles = useMemo(
    () => roles.filter((role) => role.departmentId === departmentId && (role.assignable || role.id === editStaff?.departmentRoleId)),
    [roles, departmentId, editStaff],
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

  const requiredText = (value: string | undefined, label: string): string | null => (value && value.trim() ? null : `${label} is required.`);

  /** Every rule runs on each render; messages appear live for filled fields and for all fields after a failed submit. */
  const rules: Errors = {
    tempPassword: canProvisionAccounts ? (!tempPassword ? "Temporary password is required." : validatePassword(tempPassword)) ?? undefined : undefined,
    confirmPassword: canProvisionAccounts && tempPassword ? (validateConfirmPassword(tempPassword, confirmPassword) ?? undefined) : undefined,
    firstName: validatePersonName(firstName, "First name") ?? undefined,
    middleName: validateMiddleName(middleName, noMiddleName) ?? undefined,
    lastName: validatePersonName(lastName, "Last name") ?? undefined,
    suffix: validateSuffix(suffix) ?? undefined,
    mobile: mobileNumber.trim() ? (validateMobileNumber(mobileNumber) ?? undefined) : undefined,
    email: validateEmailAddress(email) ?? undefined,
    street: validateStreet(street) ?? undefined,
    province: validateProvince(province) ?? undefined,
    city: validateCity(city) ?? undefined,
    barangay: validateBarangay(barangay) ?? undefined,
    postalCode: validatePostalCode(postalCode) ?? undefined,
    telephone: validateLandline(telephone) ?? undefined,
    facebook: validateFacebook(facebook) ?? undefined,
    tin: validateTinNumber(tin) ?? undefined,
    gender: requiredText(gender, "Gender") ?? undefined,
    civilStatus: requiredText(civilStatus, "Civil Status") ?? undefined,
    governmentIdType: requiredText(governmentIdType, "Government ID type") ?? undefined,
    governmentIdNumber: validateGovIdNumber(governmentIdNumber) ?? undefined,
    department: !assignmentLocked && !departmentId ? "Department is required." : undefined,
    role: !assignmentLocked && !departmentRoleId ? "Department role is required." : undefined,
  };
  const hasValue: Record<string, boolean> = {
    mobile: true,
    email: Boolean(email),
    postalCode: Boolean(postalCode),
    tin: Boolean(tin),
  };
  // After a failed submit everything shows; before it, only live-validated fields that already have input.
  const visible = (key: string): string | undefined => (showErrors || hasValue[key] ? rules[key] : undefined);
  const hasErrors = Object.values(rules).some(Boolean);

  const profilePayload = () => ({
    firstName: firstName.trim(),
    middleName: noMiddleName ? null : middleName.trim(),
    lastName: lastName.trim(),
    suffix: suffix.trim() ? suffix.trim() : null,
    mobileNumber: mobileNumber.trim() ? normalizePhilippineMobile(mobileNumber) : null,
    street: street.trim(),
    province: province.trim(),
    city: city.trim(),
    barangay: barangay.trim(),
    postalCode: normalizePostalCode(postalCode),
    telephone: telephone.trim() ? normalizeLandline(telephone) : null,
    facebook: facebook.trim() || null,
    tin: tin.trim() ? tin.replace(/\D/g, "") : null,
    gender: gender ?? null,
    civilStatus: civilStatus ?? null,
    governmentIdType: governmentIdType ?? null,
    governmentIdNumber: governmentIdNumber.trim(),
  });

  /** Duplicate email and assignment checks; throws a user-facing message. */
  const prepare = (): { departmentId: string; departmentRoleId: string; position: string } | null => {
    const duplicate = staff.find((member) => member.email.toLowerCase() === email.trim().toLowerCase() && member.id !== editStaff?.id);
    if (duplicate) throw new Error("An employee with this email already exists.");
    // Department and role are validated and sent only when the actor may change them.
    if (assignmentLocked) return null;
    const dept = departments.find((item) => item.id === departmentId);
    if (!dept || dept.status !== "active") throw new Error("Selected department is not active.");
    const role = roles.find((item) => item.id === departmentRoleId);
    if (!role || role.departmentId !== departmentId) throw new Error("Selected role does not belong to the selected department.");
    if (role.status !== "active") throw new Error("Selected role is not active.");
    // Single concept: Position mirrors the assigned department Role name.
    return { departmentId, departmentRoleId, position: role.name };
  };

  const save = async () => {
    setSubmitting(true);
    try {
      const assignment = prepare();
      if (editStaff) {
        await updateStaff.mutateAsync({
          id: editStaff.id,
          displayName,
          ...(assignment ?? {}),
          email: email.trim(),
          avatarUrl,
          ...profilePayload(),
        });
        setConfirmSave(false);
        onDone();
        toast.success("Staff updated successfully.", { description: `${displayName} has been saved.` });
        return;
      }
      if (!assignment) throw new Error("Department role is required.");
      // One repository call creates the staff record and its Pending account together.
      await createStaff.mutateAsync({
        displayName,
        ...assignment,
        email: email.trim(),
        avatarUrl,
        provisionPendingAccount: true,
        // Only Accounts-module holders see the picker; the repository re-checks each role.
        ...(canGrantSystemRoles && systemRoleIds.length > 0 ? { systemRoleIds } : {}),
        ...profilePayload(),
      });
      onDone();
      toast.success("Staff added successfully.", { description: `${displayName} has been added with a Pending account.` });
    } catch (err) {
      setConfirmSave(false);
      toast.error(editStaff ? "Update failed." : "Add failed.", { description: err instanceof Error ? err.message : "Failed to save staff member." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (hasErrors) {
      // Move focus to the first invalid control so keyboard and screen-reader users land on it.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (editStaff) {
      // Preflight before asking, so a duplicate or inactive assignment is reported first.
      try {
        prepare();
      } catch (err) {
        toast.error("Update failed.", { description: err instanceof Error ? err.message : "Failed to save staff member." });
        return;
      }
      setConfirmSave(true);
    } else {
      void save();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-5">
      <ProfilePhotoUploader
        label="Profile picture"
        value={avatarUrl}
        onSelect={handleAvatarFile}
        onClear={() => setAvatarUrl(null)}
        error={avatarError}
        accept="image/*"
        hint="Any image, max 2MB."
        uploadLabel="Select image"
      />
      <FormSection title="Personal Details">
        {identityLocked ? <InfoNote>{identityRestriction}</InfoNote> : null}
        <FormGrid>
          <PersonNameField id="staff-first-name" label="First Name" required value={firstName} onChange={setFirstName} placeholder="First Name" disabled={identityLocked} error={visible("firstName")} />
          <PersonNameField id="staff-last-name" label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last Name" disabled={identityLocked} error={visible("lastName")} />
          <MiddleNameField
            id="staff-middle-name"
            label="Middle Name"
            required
            value={middleName}
            onChange={setMiddleName}
            noMiddleName={noMiddleName}
            onNoMiddleNameChange={setNoMiddleName}
            placeholder="Middle Name"
            disabled={identityLocked}
            error={visible("middleName")}
          />
          <SuffixField id="staff-suffix" value={suffix || undefined} onChange={setSuffix} disabled={identityLocked} error={visible("suffix")} />
          <SelectField id="staff-gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" error={visible("gender")} />
          <SelectField id="staff-civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" error={visible("civilStatus")} />
          <GovernmentIdFields
            idType={governmentIdType}
            onIdTypeChange={setGovernmentIdType}
            idNumber={governmentIdNumber}
            onIdNumberChange={setGovernmentIdNumber}
            idTypeOptions={GOV_ID_OPTIONS}
            required
            errorType={visible("governmentIdType")}
            errorIdNumber={visible("governmentIdNumber")}
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Contact Information">
        <FormGrid>
          <PhilippineMobileField id="staff-mobile" label="Mobile Number" value={mobileNumber} onChange={setMobileNumber} placeholder="Mobile Number" error={visible("mobile")} />
          <EmailField id="staff-email" label="Email" required value={email} onChange={setEmail} placeholder="Email" error={visible("email")} disabled={identityLocked} />
          <TextField
            id="staff-telephone"
            label="Telephone"
            value={telephone}
            onChange={setTelephone}
            onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))}
            maxLength={15}
            inputMode="tel"
            placeholder="Telephone"
            error={visible("telephone")}
          />
          <TextField
            id="staff-facebook"
            label="Facebook"
            value={facebook}
            onChange={setFacebook}
            onBlur={() => setFacebook(facebook.trim())}
            maxLength={150}
            placeholder="Facebook"
            error={visible("facebook")}
          />
          <TinField id="staff-tin" label="TIN" value={tin} onChange={setTin} placeholder="TIN" error={visible("tin")} />
        </FormGrid>
      </FormSection>
      <FormSection title="Address">
        <PhilippineAddressFields
          value={{ street, province, city, barangay, postalCode }}
          onChange={(next) => {
            setStreet(next.street);
            setProvince(next.province);
            setCity(next.city);
            setBarangay(next.barangay);
            setPostalCode(next.postalCode);
          }}
          errors={{
            street: visible("street"),
            province: visible("province"),
            city: visible("city"),
            barangay: visible("barangay"),
            postalCode: visible("postalCode"),
          }}
        />
      </FormSection>
      <FormSection title="Employment">
        {assignmentRestriction ? <InfoNote>{assignmentRestriction}</InfoNote> : null}
        <FormGrid>
          <SelectField
            id="staff-department"
            label="Department"
            required
            value={departmentId || undefined}
            options={selectableDepartments.map((dept) => ({ value: dept.id, label: dept.name }))}
            onChange={handleDepartmentChange}
            placeholder="Select department"
            loading={departmentsQuery.isLoading}
            disabled={assignmentLocked}
            error={visible("department")}
          />
          {availableRoles.length === 0 ? (
            <div className="tw:flex tw:flex-col tw:gap-1.5">
              <Label>
                Role <span aria-hidden="true">*</span>
              </Label>
              <p className="tw:text-sm tw:text-muted-foreground">
                {departmentId ? "No roles you can assign in this department." : "Select department first to continue."}
              </p>
              {visible("role") ? (
                <p role="alert" className="tw:text-sm tw:text-destructive">
                  {visible("role")}
                </p>
              ) : null}
            </div>
          ) : (
            <SelectField
              id="staff-role"
              label="Role"
              required
              value={departmentRoleId || undefined}
              options={availableRoles.map((role) => ({ value: role.id, label: role.name }))}
              onChange={setDepartmentRoleId}
              placeholder="Select role"
              loading={rolesQuery.isLoading}
              disabled={assignmentLocked}
              error={visible("role")}
            />
          )}
        </FormGrid>
      </FormSection>
      {canProvisionAccounts ? (
        <FormSection title="Account Credentials">
          <FormGrid>
            <PasswordField
              id="staff-temp-password"
              label="Temporary Password"
              required
              value={tempPassword}
              onChange={setTempPassword}
              placeholder="Temporary Password"
              hint="Minimum 12 characters."
              error={visible("tempPassword")}
            />
            <ConfirmPasswordField
              id="staff-confirm-password"
              label="Confirm Password"
              required
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm Password"
              error={visible("confirmPassword")}
            />
          </FormGrid>
        </FormSection>
      ) : null}
      {canGrantSystemRoles ? (
        <FormSection title="System Access">
          <p className="tw:text-sm tw:text-muted-foreground">
            The account starts Pending until an Administrator or Super Administrator activates it. System roles are optional.
          </p>
          {creatableRoles.length > 0 ? (
            <div role="group" aria-label="System roles" className="tw:grid tw:grid-cols-1 tw:gap-1 tw:sm:grid-cols-2">
              {creatableRoles.map((role) => (
                <label key={role} className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:sm:min-h-8">
                  <Checkbox
                    checked={systemRoleIds.includes(role)}
                    onCheckedChange={(checked) =>
                      setSystemRoleIds((current) => (checked ? [...current, role] : current.filter((id) => id !== role)))
                    }
                  />
                  {getSystemRoleLabel(role)}
                </label>
              ))}
            </div>
          ) : (
            <InfoNote>You cannot assign any system role.</InfoNote>
          )}
        </FormSection>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className={BUTTON_CLASS}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className={BUTTON_CLASS}>
          {editStaff ? "Save" : "Add"}
        </Button>
      </DialogFooter>
      {editStaff ? (
        <ConfirmDialog
          open={confirmSave}
          title={`Save changes to ${displayName}?`}
          description="The staff record will be updated."
          confirmText="Save"
          pending={submitting}
          onConfirm={() => void save()}
          onClose={() => setConfirmSave(false)}
        />
      ) : null}
    </form>
  );
}

/**
 * Employee detail in three sections: Profile (identity and contact), Employment
 * (assignment), and Account Access (linked account). Everything here is
 * read-only; edits and account actions reuse the existing Staff form and the
 * Account dialogs, each running one repository operation per user action.
 */
function StaffProfileDialog({
  profileStaff,
  canViewRoles,
  accountActions,
  account,
  accountPolicy,
  onClose,
  onEdit,
}: {
  profileStaff: StaffMember | null;
  canViewRoles: boolean;
  accountActions?: ProfileAccountActions;
  account: Account | null;
  accountPolicy: AccountActionPolicy | null;
  onClose: () => void;
  onEdit: (member: StaffMember) => void;
}) {
  const departmentsQuery = useDepartments();
  const rolesQuery = useRoleOptions();
  const policiesQuery = useStaffPolicies();
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const staffPolicy = profileStaff ? (policiesQuery.data?.[profileStaff.id] ?? null) : null;
  const linkedAccount = staffPolicy?.linkedAccount ?? null;
  const assignedRole = profileStaff ? (roles.find((item) => item.id === profileStaff.departmentRoleId) ?? null) : null;
  const roleDepartment = assignedRole ? departments.find((item) => item.id === assignedRole.departmentId) : null;
  // A department role only confers access while employee, role, and department are all active.
  const roleConfersAccess = departmentRoleConfersAccess({
    staffStatus: profileStaff?.status,
    roleStatus: assignedRole?.status,
    departmentStatus: roleDepartment?.status,
  });
  // Only delegable grants of a role that currently confers access are authority.
  const roleGrants = roleConfersAccess && assignedRole ? getDelegableGrants(assignedRole.moduleIds) : [];
  const effectiveModules = account
    ? resolveEmployeeEffectiveModules({
        accountStatus: account.status,
        systemRoles: account.roleIds,
        departmentRoleModuleIds: assignedRole && roleConfersAccess ? assignedRole.moduleIds : null,
      })
    : [];

  return (
    <Dialog open={profileStaff !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Employee profile</DialogTitle>
          <DialogDescription>Read-only profile, employment, and account access.</DialogDescription>
        </DialogHeader>
        {profileStaff ? (
          <div className="tw:flex tw:flex-col tw:gap-5">
            <div className="tw:flex tw:items-center tw:gap-3">
              <Avatar className="tw:size-16 tw:text-lg">
                {profileStaff.avatarUrl ? <AvatarImage src={profileStaff.avatarUrl} alt="" /> : null}
                <AvatarFallback>{initials(profileStaff.displayName)}</AvatarFallback>
              </Avatar>
              <div className="tw:min-w-0">
                <div className="tw:text-lg tw:font-semibold">{profileStaff.displayName}</div>
                <div className="tw:text-muted-foreground">{profileStaff.position}</div>
              </div>
            </div>

            <ProfileSection title="Profile">
              {staffPolicy?.identityRestriction ? <InfoNote>{staffPolicy.identityRestriction}</InfoNote> : null}
              <DetailList>
                <DetailRow term="Email">{profileStaff.email}</DetailRow>
                {profileStaff.suffix ? <DetailRow term="Suffix">{profileStaff.suffix}</DetailRow> : null}
                {profileStaff.mobileNumber ? <DetailRow term="Mobile Number">{profileStaff.mobileNumber}</DetailRow> : null}
                {profileStaff.street ? (
                  <DetailRow term="Address">
                    {[profileStaff.street, profileStaff.barangay, profileStaff.city, profileStaff.province, profileStaff.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </DetailRow>
                ) : null}
                {profileStaff.telephone ? <DetailRow term="Telephone">{profileStaff.telephone}</DetailRow> : null}
                {profileStaff.facebook ? <DetailRow term="Facebook">{profileStaff.facebook}</DetailRow> : null}
                {profileStaff.tin ? <DetailRow term="TIN">{profileStaff.tin}</DetailRow> : null}
                {profileStaff.gender ? <DetailRow term="Gender">{profileStaff.gender}</DetailRow> : null}
                {profileStaff.civilStatus ? <DetailRow term="Civil Status">{profileStaff.civilStatus}</DetailRow> : null}
                {profileStaff.governmentIdType ? (
                  <DetailRow term="Government ID">
                    {profileStaff.governmentIdNumber
                      ? `${profileStaff.governmentIdType} (${maskGovIdNumber(profileStaff.governmentIdNumber)})`
                      : profileStaff.governmentIdType}
                  </DetailRow>
                ) : null}
              </DetailList>
            </ProfileSection>

            <ProfileSection title="Employment">
              {staffPolicy?.assignmentRestriction ? <InfoNote>{staffPolicy.assignmentRestriction}</InfoNote> : null}
              <DetailList>
                <DetailRow term="Department">{departments.find((item) => item.id === profileStaff.departmentId)?.name ?? "No department"}</DetailRow>
                <DetailRow term="Position">{profileStaff.position || "No position"}</DetailRow>
                <DetailRow term="Role">{assignedRole?.name ?? "No department role"}</DetailRow>
                {canViewRoles && profileStaff.departmentRoleId ? (
                  <DetailRow term="Authorized modules">
                    {moduleLabels(roleGrants).join(", ") ||
                      (roleConfersAccess ? "No authorized modules" : "None while the employee, role, or department is inactive")}
                  </DetailRow>
                ) : null}
                <DetailRow term="Employment status">
                  <StatusBadge status={profileStaff.status} /> <span className="tw:text-xs tw:text-muted-foreground">Read-only</span>
                </DetailRow>
              </DetailList>
            </ProfileSection>

            <ProfileSection title="Account Access">
              {linkedAccount ? (
                <>
                  {accountPolicy?.restriction ? <InfoNote>{accountPolicy.restriction}</InfoNote> : null}
                  <DetailList>
                    <DetailRow term="Account email">{linkedAccount.email}</DetailRow>
                    <DetailRow term="Account status">
                      <StatusBadge status={linkedAccount.status} />
                    </DetailRow>
                    {account ? (
                      <>
                        <DetailRow term="System roles">
                          {account.roleIds.length > 0 ? account.roleIds.map((role) => getSystemRoleLabel(role)).join(", ") : "No system roles"}
                        </DetailRow>
                        <DetailRow term="Effective module access">
                          {effectiveModules.length > 0
                            ? moduleLabels(effectiveModules).join(", ")
                            : account.status === "active"
                              ? "No module access"
                              : "None until the account is active"}
                        </DetailRow>
                      </>
                    ) : null}
                  </DetailList>
                  {accountActions?.onManageRoles || accountActions?.onChangeStatus ? (
                    <div className="tw:flex tw:flex-wrap tw:gap-2">
                      {accountActions.onManageRoles ? (
                        <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={accountActions.onManageRoles}>
                          System roles
                        </Button>
                      ) : null}
                      {accountActions.onChangeStatus ? (
                        <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={accountActions.onChangeStatus}>
                          Change status
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {/* The full status dialog supersedes the Staff suspend/deactivate shortcut. */}
                  {!accountActions?.onChangeStatus ? (
                    <LinkedAccountActions
                      staffId={profileStaff.id}
                      staffName={profileStaff.displayName}
                      allowedStatuses={linkedAccount.allowedStatuses}
                      isProtected={linkedAccount.isProtected}
                      restrictionShown={Boolean(accountPolicy?.restriction)}
                    />
                  ) : null}
                </>
              ) : (
                <InfoNote title="No linked account">This employee has no linked account, so there is no system access to manage.</InfoNote>
              )}
            </ProfileSection>

            <DialogFooter>
              <Button type="button" className={BUTTON_CLASS} onClick={() => onEdit(profileStaff)}>
                Edit
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="tw:flex tw:flex-col tw:gap-2">
      <h3 className="tw:text-sm tw:font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Staff/Employees authority over a linked non-protected account: suspend or
 * deactivate only (doc 01 §7). Activation and reactivation stay with
 * Administrators and Super Administrators.
 */
function LinkedAccountActions({
  staffId,
  staffName,
  allowedStatuses,
  isProtected,
  restrictionShown,
}: {
  staffId: string;
  staffName: string;
  allowedStatuses: AccountStatus[];
  isProtected: boolean;
  /** The account policy already explains the restriction above. */
  restrictionShown: boolean;
}) {
  const updateStatus = useUpdateLinkedAccountStatus();
  const { confirmRun, dialog } = useConfirmRun();
  const actions = linkedAccountActions(allowedStatuses);
  if (actions.length === 0) {
    return isProtected && !restrictionShown ? (
      <InfoNote>Protected Super Administrator account. Only a Super Administrator can change its status.</InfoNote>
    ) : null;
  }
  return (
    <div className="tw:flex tw:flex-wrap tw:gap-2">
      {actions.map((status) => (
        <Button
          key={status}
          type="button"
          variant="destructive"
          className={BUTTON_CLASS}
          onClick={() => confirmLinkedAccountStatus(confirmRun, staffName, status, () => updateStatus.mutateAsync({ staffId, status }))}
        >
          {LINKED_ACCOUNT_ACTION_LABELS[status]}
        </Button>
      ))}
      {dialog}
    </div>
  );
}

function moduleLabels(moduleIds: string[]): string[] {
  return moduleIds.map((moduleId) => {
    const entry = MODULE_CATALOG.find((item) => item.id === moduleId);
    return entry ? entry.label : humanize(moduleId);
  });
}
