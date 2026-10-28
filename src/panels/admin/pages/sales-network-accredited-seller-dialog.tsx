"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Divider, Input, Modal, Radio, Segmented, Select, Space, Steps } from "antd";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { manilaToday } from "@/modules/accreditation/dates";
import { collectReservedAaNumbers, toAaYearMonth, validateManualAaNumber } from "@/modules/accreditation/issuance";
import {
  ACCREDITATION_STATUS_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GENDER_OPTIONS,
  GOV_ID_OPTIONS,
  PROGRAM_CATEGORY_OPTIONS,
  VIP_LEVEL_OPTIONS,
  calculateApprovedExpiry,
  isLeapDayStart,
  programCategoryLabel,
  validateAccreditedSellerFields,
  type AaIssuanceMethod,
  type AccreditationFormStatus,
  type AccreditedSellerMode,
  type CreateAccreditedSellerInput,
} from "@/modules/sales-network/accredited-seller";
import {
  cleanTitleInput,
  normalizeLandline,
  normalizePhilippineMobile,
  normalizePostalCode,
} from "@/shared/utils/input-sanitizers";
import {
  PersonNameField,
  MiddleNameField,
  SuffixField,
  PhilippineMobileField,
  EmailField,
  PasswordField,
  ConfirmPasswordField,
  TinField,
  TextField,
  SelectField,
  StandardDateField,
  GovernmentIdFields,
  PhilippineAddressFields,
  ProfilePhotoUploader,
  validatePersonName,
  validateMiddleName,
  validateSuffix,
  validateMobileNumber,
  validateEmailAddress,
  validatePassword,
  validateConfirmPassword,
  validateStreet,
  validateProvince,
  validateCity,
  validateBarangay,
  validateSubdivision,
  validatePostalCode,
  validateTeamName,
  validateGovIdNumber,
  validateTinNumber,
  validateBusinessName,
  validateBusinessAddress,
  validateJobPosition,
  validateFacebook,
  validateLandline,
  validateDateString,
  validatePastDate,
  formatPhilippineLandlineDisplay,
} from "@/shared/forms";
import { confirmAction, showError, showFieldErrors, showSuccess } from "@/shared/utils/feedback";
import {
  useAccounts,
  useCreateAccreditedSeller,
  useEligibleSalesNetworkParents,
  useMembers,
  useStaff,
} from "@/data/queries";
import "./sales-network-accredited-seller-dialog.css";

type IstDesignation = "SVD" | "SSM" | "SM";

const IST_DESIGNATIONS: IstDesignation[] = ["SVD", "SSM", "SM"];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fullNameOf(firstName: string, middleName: string, noMiddleName: boolean, lastName: string, suffix: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  const middle = noMiddleName ? "" : middleName.trim();
  return [first, middle, last, suffix.trim()].filter(Boolean).join(" ");
}

export function AccreditedSellerDialog({
  mode,
  open,
  onClose,
  onCreated,
}: {
  mode: AccreditedSellerMode;
  open: boolean;
  onClose: () => void;
  onCreated?: (memberKey: string) => void;
}) {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const createSeller = useCreateAccreditedSeller();
  const staffQuery = useStaff();
  const accountsQuery = useAccounts();
  const membersQuery = useMembers();

  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const prefix = mode === "IST" ? "AAI" : "AAO";

  const [step, setStep] = useState(0);
  const [sellerIdentity, setSellerIdentity] = useState<"new" | "existing">("new");
  const [existingAccountId, setExistingAccountId] = useState<string | undefined>(undefined);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePhotoName, setProfilePhotoName] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [subdivision, setSubdivision] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [designation, setDesignation] = useState<IstDesignation>("SSM");
  const [teamName, setTeamName] = useState("");
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [cardApplicationDate, setCardApplicationDate] = useState(manilaToday());
  const [programCategory, setProgramCategory] = useState<string | undefined>(undefined);
  const [vipCardLevel, setVipCardLevel] = useState<"B1" | "S1" | "G1">("B1");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [civilStatus, setCivilStatus] = useState<string | undefined>(undefined);
  const [governmentIdType, setGovernmentIdType] = useState<string | undefined>(undefined);
  const [governmentIdNumber, setGovernmentIdNumber] = useState("");
  const [telephone, setTelephone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tin, setTin] = useState("");
  const [businessEmployer, setBusinessEmployer] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [accreditationStatus, setAccreditationStatus] = useState<AccreditationFormStatus | undefined>("pending");
  const [aaMethod, setAaMethod] = useState<AaIssuanceMethod>("automatic");
  const [manualAaSuffix, setManualAaSuffix] = useState("");
  const [approvedStart, setApprovedStart] = useState(manilaToday());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const today = manilaToday();
      setStep(0);
      setSellerIdentity("new");
      setExistingAccountId(undefined);
      setDesignation("SSM");
      setTeamName("");
      setParentId(undefined);
      setCardApplicationDate(today);
      setApprovedStart(today);
      setNoMiddleName(false);
      setProgramCategory(undefined);
      setVipCardLevel("B1");
      setGender(undefined);
      setCivilStatus(undefined);
      setGovernmentIdType(undefined);
      setGovernmentIdNumber("");
      setAccreditationStatus("pending");
      setAaMethod("automatic");
      setManualAaSuffix("");
      setPhotoError(null);
      setSubmitting(false);
      setTempPassword("");
      setConfirmPassword("");
      setProfilePhotoName(null);
      if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
      setProfilePhotoUrl(null);
      setStreet("");
      setProvince("");
      setCity("");
      setBarangay("");
      setSubdivision("");
      setPostalCode("");
      setTelephone("");
      setFacebook("");
      setTin("");
      setBusinessEmployer("");
      setBusinessAddress("");
      setJobPosition("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setMobileNumber("");
      setDateOfBirth("");
      setEmail("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    };
  }, [profilePhotoUrl]);

  const effectiveDesignation = mode === "OST" ? "OST" : designation;
  const eligibleQuery = useEligibleSalesNetworkParents(effectiveDesignation);
  const reservedAaNumbers = useMemo(
    () => collectReservedAaNumbers(store.accreditations, store.members),
    [store.accreditations, store.members],
  );

  const employeeOptions = useMemo(() => {
    const staff = staffQuery.data ?? [];
    const accounts = accountsQuery.data ?? [];
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const linkedAccountIds = new Set(
      store.members.map((member) => member.accountId).filter((id): id is string => Boolean(id)),
    );
    return staff
      .filter((member) => member.status === "active" && member.accountId)
      .map((member) => {
        const account = member.accountId ? accountById.get(member.accountId) : undefined;
        return {
          value: member.accountId as string,
          label: `${member.displayName} — ${member.position}${account ? ` (${account.email})` : ""}${linkedAccountIds.has(member.accountId as string) ? " — already a seller" : ""}`,
          disabled: linkedAccountIds.has(member.accountId as string),
        };
      });
  }, [staffQuery.data, accountsQuery.data, store.members]);

  const expiryPreview = calculateApprovedExpiry(approvedStart);
  const leapDay = isLeapDayStart(approvedStart);
  const manualError = aaMethod === "manual"
    ? validateManualAaNumber(`${prefix}${manualAaSuffix.trim().toUpperCase()}`, prefix, approvedStart, reservedAaNumbers)
    : null;
  const manualFull = aaMethod === "manual" ? `${prefix}${manualAaSuffix.trim().toUpperCase()}` : "";
  const sponsorMember = (eligibleQuery.data ?? []).find((member) => member.id === parentId);
  const sponsorName = sponsorMember;
  const inheritedTeam = sponsorMember
    ? (teamDisplayName(sponsorMember, membersQuery.data ?? []) ?? null)
    : null;

  const acceptPhotoFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Photo must be an image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be smaller.");
      return;
    }
    setPhotoError(null);
    if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    setProfilePhotoName(file.name);
    setProfilePhotoUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    setProfilePhotoUrl(null);
    setProfilePhotoName(null);
    setPhotoError(null);
  };

  const handleSelectEmployee = (accountId: string) => {
    setExistingAccountId(accountId);
    const account = (accountsQuery.data ?? []).find((item) => item.id === accountId);
    const staffMember = (staffQuery.data ?? []).find((item) => item.accountId === accountId);
    if (account) setEmail(account.email);
    if (staffMember) {
      const parts = staffMember.displayName.trim().split(/\s+/);
      setFirstName(cleanTitleInput(parts[0] ?? ""));
      setLastName(cleanTitleInput(parts.slice(1).join(" ")));
      setSuffix(staffMember.suffix ?? "");
    }
  };

  const buildPayload = (): CreateAccreditedSellerInput => ({
    mode,
    sellerIdentity,
    existingAccountId: sellerIdentity === "existing" ? (existingAccountId ?? null) : null,
    firstName,
    middleName,
    noMiddleName,
    lastName,
    suffix: suffix.trim() ? suffix.trim() : null,
    mobileNumber: normalizePhilippineMobile(mobileNumber),
    dateOfBirth,
    email: email.trim(),
    tempPassword,
    confirmPassword,
    profilePhotoName,
    profilePhotoUrl: profilePhotoUrl,
    street,
    province,
    city,
    barangay,
    subdivision,
    postalCode: normalizePostalCode(postalCode),
    designation: effectiveDesignation,
    teamName: effectiveDesignation === "SVD" ? teamName.trim() : null,
    parentId: effectiveDesignation === "SVD" ? null : (parentId ?? null),
    cardApplicationDate,
    programCategory: programCategory ?? "",
    vipCardLevel,
    gender: gender ?? "",
    civilStatus: civilStatus ?? "",
    governmentIdType: governmentIdType ?? "",
    governmentIdNumber: governmentIdNumber.trim(),
    telephone: telephone.trim() ? normalizeLandline(telephone) : null,
    facebook: facebook.trim() || null,
    tin: tin.trim() ? tin.replace(/\D/g, "") : null,
    businessEmployer: businessEmployer.trim() || null,
    businessAddress: businessAddress.trim() || null,
    jobPosition: jobPosition.trim() || null,
    approvedStart,
    accreditationStatus: accreditationStatus ?? "pending",
    aaMethod,
    manualAaSuffix: aaMethod === "manual" ? manualAaSuffix.trim() : "",
  });

  const collectErrors = (checks: Array<string | null>): string[] => {
    const errors: string[] = [];
    for (const check of checks) {
      if (check && !errors.includes(check)) errors.push(check);
    }
    return errors;
  };

  const validateStep = (stepIndex: number): string[] => {
    if (stepIndex === 0) {
      return collectErrors([
        sellerIdentity === "existing" && !existingAccountId ? "Select an employee account." : null,
        !profilePhotoName ? "Profile photo is required." : null,
        validatePersonName(firstName, "First name"),
        validateMiddleName(middleName, noMiddleName),
        validatePersonName(lastName, "Last name"),
        validateSuffix(suffix),
        validateMobileNumber(mobileNumber),
        validatePastDate(dateOfBirth, "Birth date", "Birth date cannot be future."),
        validateEmailAddress(email),
        validateNewAccountStep(),
      ]);
    }
    if (stepIndex === 1) {
      return collectErrors([
        validateStreet(street),
        validateProvince(province),
        validateCity(city),
        validateBarangay(barangay),
        validateSubdivision(subdivision),
        validatePostalCode(postalCode),
        validateLandline(telephone),
        validateFacebook(facebook),
        validateTinNumber(tin),
        validateBusinessName(businessEmployer),
        validateBusinessAddress(businessAddress),
        validateJobPosition(jobPosition),
      ]);
    }
    if (stepIndex === 2) {
      return collectErrors([
        mode === "IST" && !["SVD", "SSM", "SM"].includes(designation) ? "IST needs SVD, SSM, SM." : null,
        effectiveDesignation !== "SVD" && !parentId ? "Sponsor is required." : null,
        effectiveDesignation === "SVD" ? validateTeamName(teamName, true) : null,
        validateDateString(cardApplicationDate, "Application date"),
        validateProgramCategory(),
        validateVipTier(),
        validateRequiredText(gender ?? "", "Gender"),
        validateRequiredText(civilStatus ?? "", "Civil Status"),
        validateGovIdType(),
        validateGovIdNumber(governmentIdNumber),
      ]);
    }
    return collectErrors([
      !accreditationStatus ? "Accreditation Status is required." : null,
      accreditationStatus === "cancel" || accreditationStatus === "expired" ? "Pending or Accredited only." : null,
      validateDateString(approvedStart, "Start date"),
      leapDay ? "Leap-day starts need policy confirmation." : null,
      aaMethod === "manual" ? manualError : null,
      validateAccreditedSellerFields(buildPayload()),
    ]);
  };

  const validateNewAccountStep = (): string | null => {
    if (sellerIdentity !== "new") return null;
    return validatePassword(tempPassword) ?? validateConfirmPassword(tempPassword, confirmPassword);
  };

  const validateProgramCategory = (): string | null => {
    return programCategory ? null : "Select a program category.";
  };

  const validateVipTier = (): string | null => {
    return ["B1", "S1", "G1"].includes(vipCardLevel) ? null : "Card level must be valid.";
  };

  const validateGovIdType = (): string | null => {
    return governmentIdType ? null : "Government ID type is required.";
  };

  const validateRequiredText = (value: string | undefined, label: string): string | null => {
    return value && value.trim() ? null : `${label} is required.`;
  };

  const handleNext = async () => {
    const stepErrors = validateStep(step);
    if (stepErrors.length > 0) {
      await showFieldErrors("Complete the current step.", stepErrors);
      return;
    }
    setStep((value) => Math.min(value + 1, 3));
  };

  const handleBack = () => {
    setStep((value) => Math.max(value - 1, 0));
  };

  const switchAaMethod = (method: AaIssuanceMethod) => {
    setAaMethod(method);
    if (method === "manual" && !manualAaSuffix.trim()) {
      setManualAaSuffix(toAaYearMonth(approvedStart) ?? "");
    }
  };

  const handleFinish = async () => {
    const payload = buildPayload();
    const fieldErrors = [
      ...validateStep(3),
      ...(sellerIdentity === "existing" && emailMismatch(payload) ? ["Email must match account."] : []),
    ];
    if (fieldErrors.length > 0) {
      await showFieldErrors("Complete the required fields.", fieldErrors);
      return;
    }
    const proceed = await confirmAction({
      title: payload.accreditationStatus === "accredited" ? `Create and accredit ${mode} seller?` : `Create ${mode} seller as Pending?`,
      text: payload.accreditationStatus === "accredited"
        ? `Confirm ${aaMethod} AA issuance for ${fullNameOf(firstName, middleName, noMiddleName, lastName, suffix)}.`
        : `Confirm ${aaMethod} AA issuance for ${fullNameOf(firstName, middleName, noMiddleName, lastName, suffix)}. Accreditation stays Pending.`,
      confirmText: payload.accreditationStatus === "accredited" ? "Create & Accredit" : "Create Seller",
    });
    if (!proceed) return;
    setSubmitting(true);
    try {
      // Temporary passwords are validated locally and inside the repository
      // but never persisted, logged, or included in query keys or summaries.
      const result = await createSeller.mutateAsync(payload);
      onClose();
      // Navigate by official AA number so the detail URL shows the seller ID.
      onCreated?.(result.aaNumber ?? result.memberId);
      await showSuccess(
        payload.accreditationStatus === "accredited"
          ? "Seller successfully created and accredited"
          : "Seller created with Pending accreditation",
        payload.accreditationStatus === "accredited"
          ? `Issued ${result.aaNumber}, valid until ${result.expiryDate}.`
          : `Reserved ${result.aaNumber}; accreditation stays Pending.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create seller.";
      await showError("Creation failed.", message);
    } finally {
      setSubmitting(false);
    }
  };

  const emailMismatch = (payload: CreateAccreditedSellerInput): boolean => {
    const account = (accountsQuery.data ?? []).find((item) => item.id === payload.existingAccountId);
    return Boolean(account && account.email.toLowerCase() !== payload.email.trim().toLowerCase());
  };

  const canComplete =
    isSuperAdmin &&
    !leapDay &&
    (accreditationStatus === "pending" || accreditationStatus === "accredited") &&
    (aaMethod === "automatic" || !manualError);

  return (
    <Modal
      title={
        <div className="sales-network-create-seller__header">
          <div className="sales-network-create-seller__title">{mode === "IST" ? "Add IST" : "Add OST"}</div>
          <div className="sales-network-create-seller__subtitle">
            {mode === "IST" ? "Create an IST member." : "Create an OST member."}
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      className="sales-network-create-seller__modal"
    >
      <div className="sales-network-create-seller__body">
        {!isSuperAdmin ? (
          <Alert
            type="warning"
            showIcon
            title="Super Administrator completion required"
            description="Preview only. Super Administrator required."
            className="sales-network-create-seller__gate"
          />
        ) : null}

        <Steps
          current={step}
          size="small"
          className="sales-network-create-seller__steps"
          items={[
            { title: "Personal" },
            { title: "Address" },
            { title: "Assignment" },
            { title: "Accreditation" },
          ]}
        />

        {step === 0 ? (
          <div className="sales-network-create-seller__pane">
            <Divider titlePlacement="start" className="sales-network-create-seller__section">Seller Identity</Divider>
            <div className="sales-network-create-seller__field">
              <span className="sales-network-create-seller__label" id="seller-identity-label">Seller Identity</span>
              <Radio.Group
                aria-labelledby="seller-identity-label"
                value={sellerIdentity}
                onChange={(event) => setSellerIdentity(event.target.value)}
                className="sales-network-create-seller__radio"
              >
                <Radio value="new">New Individual</Radio>
                <Radio value="existing">Existing Employee</Radio>
              </Radio.Group>
            </div>
            {sellerIdentity === "existing" ? (
              <div className="sales-network-create-seller__field">
                <Select
                  id="existing-employee"
                  aria-label="Existing Employee"
                  placeholder="Search employees"
                  showSearch
                  optionFilterProp="label"
                  value={existingAccountId}
                  onChange={handleSelectEmployee}
                  loading={staffQuery.isLoading || accountsQuery.isLoading}
                  options={employeeOptions}
                  className="sales-network-create-seller__select"
                />
                <p className="sales-network-create-seller__hint">Links account. Preserves employee record.</p>
              </div>
            ) : null}

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Profile Photo *</Divider>
            <ProfilePhotoUploader
              value={profilePhotoUrl}
              fileName={profilePhotoName}
              onSelect={acceptPhotoFile}
              onClear={clearPhoto}
              error={photoError}
            />

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Name & Contact</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <PersonNameField id="first-name" label="First Name" required value={firstName} onChange={setFirstName} />
              </div>
              <div className="sales-network-create-seller__field">
                <MiddleNameField
                  id="middle-name"
                  label="Middle Name"
                  required
                  value={middleName}
                  onChange={setMiddleName}
                  noMiddleName={noMiddleName}
                  onNoMiddleNameChange={setNoMiddleName}
                />
              </div>
              <div className="sales-network-create-seller__field">
                <PersonNameField id="last-name" label="Last Name" required value={lastName} onChange={setLastName} />
              </div>
              <div className="sales-network-create-seller__field">
                <SuffixField id="seller-suffix" value={suffix || undefined} onChange={setSuffix} />
              </div>
              <div className="sales-network-create-seller__field">
                <PhilippineMobileField id="mobile" label="Mobile Number" required value={mobileNumber} onChange={setMobileNumber} placeholder="09xx xxx xxxx" />
              </div>
              <div className="sales-network-create-seller__field">
                <StandardDateField id="dob" label="Birth Date" required value={dateOfBirth} onChange={setDateOfBirth} className="sales-network-create-seller__picker" />
              </div>
              <div className="sales-network-create-seller__field">
                <EmailField id="seller-email" label="Email" required value={email} onChange={setEmail} error={email ? validateEmailAddress(email) ?? undefined : undefined} />
              </div>
            </div>

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Credentials</Divider>
            {sellerIdentity === "new" ? (
              <div className="sales-network-create-seller__grid">
                <div className="sales-network-create-seller__field">
                  <PasswordField id="temp-password" label="Temporary Password" required value={tempPassword} onChange={setTempPassword} hint="Minimum 12 characters." />
                </div>
                <div className="sales-network-create-seller__field">
                  <ConfirmPasswordField id="confirm-password" label="Confirm Password" required value={confirmPassword} onChange={setConfirmPassword} />
                </div>
              </div>
            ) : (
              <p className="sales-network-create-seller__hint">Existing credentials remain unchanged.</p>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="sales-network-create-seller__pane">
            <Divider titlePlacement="start" className="sales-network-create-seller__section">Address Information</Divider>
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
                errors={{ postalCode: postalCode ? validatePostalCode(postalCode) ?? undefined : undefined }}
              />
<Divider titlePlacement="start" className="sales-network-create-seller__section">Additional Information (Optional)</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <TextField id="telephone" label="Telephone" value={telephone} onChange={setTelephone} onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))} maxLength={15} inputMode="tel" />
              </div>
              <div className="sales-network-create-seller__field">
                <TextField id="facebook" label="Facebook" value={facebook} onChange={setFacebook} onBlur={() => setFacebook(facebook.trim())} maxLength={150} />
              </div>
              <div className="sales-network-create-seller__field">
                <TinField id="tin" label="TIN" value={tin} onChange={setTin} error={tin ? validateTinNumber(tin) ?? undefined : undefined} />
              </div>
              <div className="sales-network-create-seller__field">
                <TextField id="job-position" label="Job Position" value={jobPosition} onChange={(value) => setJobPosition(cleanTitleInput(value))} onBlur={() => setJobPosition(jobPosition.trim())} maxLength={100} />
              </div>
              <div className="sales-network-create-seller__field sales-network-create-seller__field--full">
                <TextField id="business" label="Business" value={businessEmployer} onChange={setBusinessEmployer} onBlur={() => setBusinessEmployer(businessEmployer.trim())} maxLength={150} />
              </div>
              <div className="sales-network-create-seller__field sales-network-create-seller__field--full">
                <TextField id="business-address" label="Business Address" value={businessAddress} onChange={setBusinessAddress} onBlur={() => setBusinessAddress(businessAddress.trim())} maxLength={200} />
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="sales-network-create-seller__pane">
            <Divider titlePlacement="start" className="sales-network-create-seller__section">Sales Network Assignment</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <SelectField
                  id="assigned-position"
                  label="Assigned Position"
                  required
                  value={mode === "OST" ? "OST" : designation}
                  onChange={(value) => {
                    if (value === "OST") return;
                    setDesignation(value as IstDesignation);
                    setTeamName("");
                    setParentId(undefined);
                  }}
                  disabled={mode === "OST"}
                  options={mode === "OST" ? [{ value: "OST", label: "OST" }] : [{ value: "SVD", label: "SVD — Sales Vice Director" }, { value: "SSM", label: "SSM — Senior Sales Manager" }, { value: "SM", label: "SM — Sales Manager" }]}
                />
              </div>
              <div className="sales-network-create-seller__field">
                <SelectField
                  id="sponsor"
                  label="Sponsor"
                  required
                  value={effectiveDesignation === "SVD" ? undefined : parentId}
                  options={(eligibleQuery.data ?? []).map((member) => ({ value: member.id, label: `${member.displayName} (${member.designation})` }))}
                  onChange={setParentId}
                  placeholder={effectiveDesignation === "SVD" ? "Root — no sponsor" : (eligibleQuery.data ?? []).length === 0 ? "No eligible sponsor available" : "Select eligible sponsor"}
                  showSearch
                  loading={eligibleQuery.isLoading}
                  disabled={effectiveDesignation === "SVD"}
                />
              </div>
              {effectiveDesignation === "SVD" ? (
                <div className="sales-network-create-seller__field">
                  <TextField id="team-name" label="Team Name" required value={teamName} onChange={(value) => setTeamName(cleanTitleInput(value))} onBlur={() => setTeamName(teamName.trim())} maxLength={100} placeholder="Enter Team Name" />
                </div>
              ) : (
                <div className="sales-network-create-seller__field">
                  <label className="sales-network-create-seller__label" htmlFor="inherited-team">Team</label>
                  <Input
                    id="inherited-team"
                    value={inheritedTeam ?? "Select sponsor first"}
                    disabled
                  />
                </div>
              )}
            </div>

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Program Details</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <StandardDateField id="card-application" label="Application Date" required value={cardApplicationDate} onChange={setCardApplicationDate} className="sales-network-create-seller__picker" />
              </div>
              <div className="sales-network-create-seller__field">
                <SelectField
                  id="program-category"
                  label="Program Category"
                  required
                  value={programCategory}
                  options={PROGRAM_CATEGORY_OPTIONS}
                  onChange={setProgramCategory}
                  placeholder="Select program category"
                  showSearch
                />
              </div>
              <div className="sales-network-create-seller__field">
                <SelectField
                  id="vip-level"
                  label="Card Level"
                  required
                  value={vipCardLevel}
                  options={VIP_LEVEL_OPTIONS}
                  onChange={setVipCardLevel}
                />
              </div>
            </div>

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Personal Details</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <SelectField id="gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" />
              </div>
              <div className="sales-network-create-seller__field">
                <SelectField id="civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" />
              </div>
              <div className="sales-network-create-seller__field">
                <GovernmentIdFields
                  idType={governmentIdType}
                  onIdTypeChange={setGovernmentIdType}
                  idNumber={governmentIdNumber}
                  onIdNumberChange={setGovernmentIdNumber}
                  idTypeOptions={GOV_ID_OPTIONS}
                  required
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="sales-network-create-seller__pane">
            <Divider titlePlacement="start" className="sales-network-create-seller__section">Accreditation and Completion</Divider>
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <label className="sales-network-create-seller__label" htmlFor="result">Result</label>
                <Input id="result" value="Complete Now" disabled />
              </div>
              <div className="sales-network-create-seller__field">
                <SelectField
                  id="accreditation-status"
                  label="Accreditation Status"
                  required
                  value={accreditationStatus}
                  options={ACCREDITATION_STATUS_OPTIONS}
                  onChange={(value) => {
                    setAccreditationStatus(value);
                  }}
                  placeholder="Select status"
                />
              </div>
            </div>
            <div className="sales-network-create-seller__field">
              <span className="sales-network-create-seller__label" id="aa-method-label">AA Method</span>
              <Segmented
                aria-labelledby="aa-method-label"
                value={aaMethod}
                onChange={(value) => switchAaMethod(value as AaIssuanceMethod)}
                options={[
                  { value: "automatic", label: "Automatic" },
                  { value: "manual", label: "Manual" },
                ]}
                className="sales-network-create-seller__segmented"
              />
              {aaMethod === "automatic" ? (
                <p className="sales-network-create-seller__hint">Auto-issues next number on completion.</p>
              ) : null}
            </div>
            {aaMethod === "manual" ? (
              <div className="sales-network-create-seller__field">
                <TextField
                  id="aa-number"
                  label="AA Number"
                  required
                  value={manualAaSuffix}
                  onChange={(value) => setManualAaSuffix(value.toUpperCase())}
                  addonBefore={prefix}
                  maxLength={12}
                  autoComplete="off"
                  placeholder={toAaYearMonth(approvedStart) ?? "YYMM####"}
                  error={manualError ?? undefined}
                />
              </div>
            ) : null}
            <div className="sales-network-create-seller__grid">
              <div className="sales-network-create-seller__field">
                <StandardDateField id="approved-start" label="Start Date" required value={approvedStart} onChange={setApprovedStart} className="sales-network-create-seller__picker" />
              </div>
              <div className="sales-network-create-seller__field">
                <label className="sales-network-create-seller__label" htmlFor="approved-expiry">Expiry Date</label>
                <Input id="approved-expiry" value={expiryPreview ?? "—"} disabled />
              </div>
            </div>
            {leapDay ? (
              <Alert
                type="warning"
                showIcon
                title="February 29 start"
                description="Leap-day rule provisional. Completion blocked."
                className="sales-network-create-seller__gate"
              />
            ) : null}
            {(accreditationStatus === "cancel" || accreditationStatus === "expired") ? (
              <Alert
                type="info"
                showIcon
                title="Status preview only"
                description="Pending or Accredited only."
                className="sales-network-create-seller__gate"
              />
            ) : null}

            <Divider titlePlacement="start" className="sales-network-create-seller__section">Review and Confirmation</Divider>
            <div className="sales-network-create-seller__review">
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Name:</span> {fullNameOf(firstName, middleName, noMiddleName, lastName, suffix) || "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Identity:</span> {sellerIdentity === "new" ? "New Individual" : "Existing Employee"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Position:</span> {effectiveDesignation}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Sponsor:</span> {effectiveDesignation === "SVD" ? "Root — no sponsor" : sponsorName ? `${sponsorName.displayName} (${sponsorName.designation})` : "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Team:</span> {effectiveDesignation === "SVD" ? teamName.trim() || "—" : inheritedTeam ?? "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Program Category:</span> {programCategory ? programCategoryLabel(programCategory) : "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Accreditation Status:</span> {accreditationStatus ? ACCREDITATION_STATUS_OPTIONS.find((option) => option.value === accreditationStatus)?.label : "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Issuance Method:</span> {aaMethod === "automatic" ? "Automatic" : "Manual"}</p>
              {aaMethod === "manual" ? (
                <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">AA Number:</span> {manualFull}</p>
              ) : null}
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Approved Start:</span> {approvedStart || "—"}</p>
              <p className="sales-network-create-seller__review-line"><span className="sales-network-create-seller__review-key">Approved Expiry:</span> {expiryPreview ?? "—"}</p>
            </div>
          </div>
        ) : null}

        <div className="sales-network-create-seller__actions">
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            {step > 0 ? <Button onClick={handleBack}>Back</Button> : null}
            {step < 3 ? (
              <Button type="primary" onClick={() => void handleNext()}>Next</Button>
            ) : (
              <Button
                type="primary"
                loading={submitting || createSeller.isPending}
                disabled={!canComplete}
                onClick={() => void handleFinish()}
              >
                {accreditationStatus === "pending" ? "Create Seller" : "Create & Accredit Seller"}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
}
