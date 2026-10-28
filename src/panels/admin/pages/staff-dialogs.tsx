"use client";

import { useMemo, useState } from "react";
import { Alert, Avatar, Button, Divider, Modal, Select } from "antd";
import { MODULE_CATALOG } from "@/modules/identity/permissions";
import type { StaffMember } from "@/modules/organization/types";
import { normalizeLandline, normalizePhilippineMobile, normalizePostalCode } from "@/shared/utils/input-sanitizers";
import {
  ConfirmPasswordField,
  EmailField,
  GovernmentIdFields,
  MiddleNameField,
  PasswordField,
  PersonNameField,
  PhilippineAddressFields,
  PhilippineMobileField,
  SelectField,
  SuffixField,
  TextField,
  TinField,
  ProfilePhotoUploader,
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
  validateSubdivision,
  validateSuffix,
  validateTinNumber,
} from "@/shared/forms";
import { confirmAction, showError, showFieldErrors, showSuccess } from "@/shared/utils/feedback";
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

/** Split a legacy single-string display name into parts for the name fields. */
function splitDisplayName(displayName: string): { first: string; middle: string; last: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts.slice(1).join(" ") };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
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
        width={720}
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

  const splitName = splitDisplayName(editStaff?.displayName ?? "");
  const [firstName, setFirstName] = useState(editStaff?.firstName ?? splitName.first);
  const [middleName, setMiddleName] = useState(editStaff?.middleName ?? splitName.middle);
  const [noMiddleName, setNoMiddleName] = useState(
    editStaff ? !((editStaff.middleName ?? splitName.middle).trim()) : false,
  );
  const [lastName, setLastName] = useState(editStaff?.lastName ?? splitName.last);
  const [suffix, setSuffix] = useState(editStaff?.suffix ?? "");
  const [mobileNumber, setMobileNumber] = useState(editStaff?.mobileNumber ?? "");
  const [email, setEmail] = useState(editStaff?.email ?? "");
  const [street, setStreet] = useState(editStaff?.street ?? "");
  const [province, setProvince] = useState(editStaff?.province ?? "");
  const [city, setCity] = useState(editStaff?.city ?? "");
  const [barangay, setBarangay] = useState(editStaff?.barangay ?? "");
  const [subdivision, setSubdivision] = useState(editStaff?.subdivision ?? "");
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(editStaff?.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayName = [firstName.trim(), noMiddleName ? "" : middleName.trim(), lastName.trim(), suffix.trim()]
    .filter(Boolean)
    .join(" ");

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

  const validateFields = (): string[] => {
    const checks: Array<string | null> = [
      canProvisionAccounts && !editStaff && !tempPassword ? "Temporary password is required." : null,
      validatePersonName(firstName, "First name"),
      validateMiddleName(middleName, noMiddleName),
      validatePersonName(lastName, "Last name"),
      validateSuffix(suffix),
      mobileNumber.trim() ? validateMobileNumber(mobileNumber) : null,
      validateEmailAddress(email),
      validateAccountPassword(),
      validateStreet(street),
      validateProvince(province),
      validateCity(city),
      validateBarangay(barangay),
      validateSubdivision(subdivision),
      validatePostalCode(postalCode),
      validateLandline(telephone),
      validateFacebook(facebook),
      validateTinNumber(tin),
      requiredText(gender, "Gender"),
      requiredText(civilStatus, "Civil Status"),
      requiredText(governmentIdType, "Government ID type"),
      validateGovIdNumber(governmentIdNumber),
      !departmentId ? "Department is required." : null,
      !departmentRoleId ? "Department role is required." : null,
    ];
    return checks.filter((message): message is string => message !== null);
  };

  const validateAccountPassword = (): string | null => {
    if (!canProvisionAccounts || editStaff) return null;
    return validatePassword(tempPassword) ?? validateConfirmPassword(tempPassword, confirmPassword);
  };

  const requiredText = (value: string | undefined, label: string): string | null => {
    return value && value.trim() ? null : `${label} is required.`;
  };

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
    subdivision: subdivision.trim() ? subdivision.trim() : null,
    postalCode: normalizePostalCode(postalCode),
    telephone: telephone.trim() ? normalizeLandline(telephone) : null,
    facebook: facebook.trim() || null,
    tin: tin.trim() ? tin.replace(/\D/g, "") : null,
    gender: gender ?? null,
    civilStatus: civilStatus ?? null,
    governmentIdType: governmentIdType ?? null,
    governmentIdNumber: governmentIdNumber.trim(),
  });

  const handleFinish = async () => {
    const fieldErrors = validateFields();
    if (fieldErrors.length > 0) {
      await showFieldErrors("Complete the required fields.", fieldErrors);
      return;
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
          title: `Save changes to ${displayName}?`,
          text: "The staff record will be updated.",
          confirmText: "Save",
        });
        if (!proceed) return;
        await updateStaff.mutateAsync({
          id: editStaff.id,
          displayName,
          position,
          departmentId,
          departmentRoleId,
          email: email.trim(),
          avatarUrl,
          ...profilePayload(),
        });
        onDone();
        await showSuccess("Staff updated successfully.", `${displayName} has been saved.`);
      } else {
        let createdId: string | null = null;
        try {
          const created = await createStaff.mutateAsync({
            displayName,
            position,
            departmentId,
            departmentRoleId,
            email: email.trim(),
            avatarUrl,
            accountId: null,
            ...profilePayload(),
          });
          createdId = created.id;
          if (canProvisionAccounts) {
            // Single Roles concept: access derives from the assigned department
            // Role's module grants. Provisioned accounts start least-privilege;
            // system classification is managed separately in Account Management.
            const account = await repositories.accounts.create({
              displayName,
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
      await showSuccess("Staff added successfully.", `${displayName} has been added.`);
    } catch (err) {
      await showError(editStaff ? "Update failed." : "Add failed.", err instanceof Error ? err.message : "Failed to save staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="staff-dialog__form"
      onSubmit={(event) => {
        event.preventDefault();
        void handleFinish();
      }}
    >
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
      <Divider titlePlacement="start" className="staff-dialog__section">Personal Details</Divider>
      <div className="staff-dialog__grid">
        <PersonNameField id="staff-first-name" label="First Name" required value={firstName} onChange={setFirstName} placeholder="First Name" />
        <PersonNameField id="staff-last-name" label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last Name" />
      </div>
      <div className="staff-dialog__grid">
        <MiddleNameField
          id="staff-middle-name"
          label="Middle Name"
          required
          value={middleName}
          onChange={setMiddleName}
          noMiddleName={noMiddleName}
          onNoMiddleNameChange={setNoMiddleName}
          placeholder="Middle Name"
        />
        <SuffixField id="staff-suffix" value={suffix || undefined} onChange={setSuffix} />
      </div>
      <div className="staff-dialog__grid">
        <SelectField id="staff-gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" />
        <SelectField id="staff-civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" />
      </div>
      <div className="staff-dialog__grid">
        <GovernmentIdFields
          idType={governmentIdType}
          onIdTypeChange={setGovernmentIdType}
          idNumber={governmentIdNumber}
          onIdNumberChange={setGovernmentIdNumber}
          idTypeOptions={GOV_ID_OPTIONS}
          required
        />
      </div>
      <Divider titlePlacement="start" className="staff-dialog__section">Contact Information</Divider>
      <div className="staff-dialog__grid">
        <PhilippineMobileField
          id="staff-mobile"
          label="Mobile Number"
          value={mobileNumber}
          onChange={setMobileNumber}
          placeholder="Mobile Number"
          error={mobileNumber.trim() ? (validateMobileNumber(mobileNumber) ?? undefined) : undefined}
        />
        <EmailField
          id="staff-email"
          label="Email"
          required
          value={email}
          onChange={setEmail}
          placeholder="Email"
          error={email ? (validateEmailAddress(email) ?? undefined) : undefined}
        />
      </div>
      <div className="staff-dialog__grid">
        <TextField
          id="staff-telephone"
          label="Telephone"
          value={telephone}
          onChange={setTelephone}
          onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))}
          maxLength={15}
          inputMode="tel"
          placeholder="Telephone"
        />
        <TextField
          id="staff-facebook"
          label="Facebook"
          value={facebook}
          onChange={setFacebook}
          onBlur={() => setFacebook(facebook.trim())}
          maxLength={150}
          placeholder="Facebook"
        />
      </div>
      <TinField
        id="staff-tin"
        label="TIN"
        value={tin}
        onChange={setTin}
        placeholder="TIN"
        error={tin ? (validateTinNumber(tin) ?? undefined) : undefined}
      />
      <Divider titlePlacement="start" className="staff-dialog__section">Address</Divider>
      <PhilippineAddressFields
        value={{ street, province, city, barangay, subdivision, postalCode }}
        onChange={(next) => {
          setStreet(next.street);
          setProvince(next.province);
          setCity(next.city);
          setBarangay(next.barangay);
          setSubdivision(next.subdivision);
          setPostalCode(next.postalCode);
        }}
        errors={{ postalCode: postalCode ? (validatePostalCode(postalCode) ?? undefined) : undefined }}
      />
      <Divider titlePlacement="start" className="staff-dialog__section">Employment</Divider>
      <div className="staff-dialog__grid">
        <SelectField
          id="staff-department"
          label="Department"
          required
          value={departmentId || undefined}
          options={selectableDepartments.map((dept) => ({ value: dept.id, label: dept.name }))}
          onChange={handleDepartmentChange}
          placeholder="Select department"
          loading={departmentsQuery.isLoading}
        />
        <div className="afhomes-field">
          <span className="afhomes-field__label">Role *</span>
          {availableRoles.length === 0 ? (
            <div className="staff-dialog__empty-roles">
              {departmentId
                ? "No active roles in this department. Ask an administrator to create one first."
                : "Select department first to continue."}
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
        </div>
      </div>
      {canProvisionAccounts && !editStaff ? (
        <>
          <Divider titlePlacement="start" className="staff-dialog__section">Account Credentials</Divider>
          <div className="staff-dialog__grid">
            <PasswordField
              id="staff-temp-password"
              label="Temporary Password"
              required
              value={tempPassword}
              onChange={setTempPassword}
              placeholder="Temporary Password"
              hint="Minimum 12 characters."
            />
            <ConfirmPasswordField
              id="staff-confirm-password"
              label="Confirm Password"
              required
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm Password"
            />
          </div>
        </>
      ) : null}
      <div className="staff-dialog__form-actions">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          {editStaff ? "Save" : "Add"}
        </Button>
      </div>
    </form>
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
            {profileStaff.suffix ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Suffix</dt>
                <dd className="staff-profile__detail-value">{profileStaff.suffix}</dd>
              </div>
            ) : null}
            {profileStaff.mobileNumber ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Mobile Number</dt>
                <dd className="staff-profile__detail-value">{profileStaff.mobileNumber}</dd>
              </div>
            ) : null}
            {profileStaff.street ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Address</dt>
                <dd className="staff-profile__detail-value">
                  {[profileStaff.street, profileStaff.barangay, profileStaff.city, profileStaff.province, profileStaff.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            ) : null}
            {profileStaff.subdivision ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Subdivision / Village</dt>
                <dd className="staff-profile__detail-value">{profileStaff.subdivision}</dd>
              </div>
            ) : null}
            {profileStaff.telephone ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Telephone</dt>
                <dd className="staff-profile__detail-value">{profileStaff.telephone}</dd>
              </div>
            ) : null}
            {profileStaff.facebook ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Facebook</dt>
                <dd className="staff-profile__detail-value">{profileStaff.facebook}</dd>
              </div>
            ) : null}
            {profileStaff.tin ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">TIN</dt>
                <dd className="staff-profile__detail-value">{profileStaff.tin}</dd>
              </div>
            ) : null}
            {profileStaff.gender ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Gender</dt>
                <dd className="staff-profile__detail-value">{profileStaff.gender}</dd>
              </div>
            ) : null}
            {profileStaff.civilStatus ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Civil Status</dt>
                <dd className="staff-profile__detail-value">{profileStaff.civilStatus}</dd>
              </div>
            ) : null}
            {profileStaff.governmentIdType ? (
              <div className="staff-profile__detail-row">
                <dt className="staff-profile__detail-term">Government ID</dt>
                <dd className="staff-profile__detail-value">
                  {profileStaff.governmentIdNumber
                    ? `${profileStaff.governmentIdType} (${maskGovIdNumber(profileStaff.governmentIdNumber)})`
                    : profileStaff.governmentIdType}
                </dd>
              </div>
            ) : null}
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
