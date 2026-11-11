"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { teamDisplayName } from "@/modules/sales-network/display";
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
} from "@/shared/forms/modern";
import {
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
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { FormGrid, FormSection } from "@/shared/components/modern/form-layout";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { StepIndicator } from "@/shared/components/modern/step-indicator";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  useAccounts,
  useCreateAccreditedSeller,
  useEligibleSalesNetworkParents,
  useMembers,
  useStaff,
} from "@/data/queries";

type IstDesignation = "SVD" | "SSM" | "SM";

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
  const [confirmCreate, setConfirmCreate] = useState(false);
  // Steps whose Next was pressed with errors: their messages show on every field of the step.
  const [shownSteps, setShownSteps] = useState<number[]>([]);
  const [finalErrors, setFinalErrors] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

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

  const orUndefined = (message: string | null) => message ?? undefined;

  /** Every rule runs each render; `stepOf` says which step owns it. */
  const rules: Record<string, string | undefined> = {
    existingAccount: sellerIdentity === "existing" && !existingAccountId ? "Select an employee account." : undefined,
    photo: profilePhotoName ? undefined : "Profile photo is required.",
    firstName: orUndefined(validatePersonName(firstName, "First name")),
    middleName: orUndefined(validateMiddleName(middleName, noMiddleName)),
    lastName: orUndefined(validatePersonName(lastName, "Last name")),
    suffix: orUndefined(validateSuffix(suffix)),
    mobile: orUndefined(validateMobileNumber(mobileNumber)),
    dateOfBirth: orUndefined(validatePastDate(dateOfBirth, "Birth date", "Birth date cannot be future.")),
    email: orUndefined(validateEmailAddress(email)),
    tempPassword: sellerIdentity === "new" ? orUndefined(validatePassword(tempPassword)) : undefined,
    confirmPassword: sellerIdentity === "new" && !validatePassword(tempPassword) ? orUndefined(validateConfirmPassword(tempPassword, confirmPassword)) : undefined,
    street: orUndefined(validateStreet(street)),
    province: orUndefined(validateProvince(province)),
    city: orUndefined(validateCity(city)),
    barangay: orUndefined(validateBarangay(barangay)),
    postalCode: orUndefined(validatePostalCode(postalCode)),
    telephone: orUndefined(validateLandline(telephone)),
    facebook: orUndefined(validateFacebook(facebook)),
    tin: orUndefined(validateTinNumber(tin)),
    businessEmployer: orUndefined(validateBusinessName(businessEmployer)),
    businessAddress: orUndefined(validateBusinessAddress(businessAddress)),
    jobPosition: orUndefined(validateJobPosition(jobPosition)),
    position: mode === "IST" && !["SVD", "SSM", "SM"].includes(designation) ? "IST needs SVD, SSM, SM." : undefined,
    sponsor: effectiveDesignation !== "SVD" && !parentId ? "Sponsor is required." : undefined,
    teamName: effectiveDesignation === "SVD" ? orUndefined(validateTeamName(teamName, true)) : undefined,
    cardApplicationDate: orUndefined(validateDateString(cardApplicationDate, "Application date")),
    programCategory: programCategory ? undefined : "Select a program category.",
    vipCardLevel: ["B1", "S1", "G1"].includes(vipCardLevel) ? undefined : "Card level must be valid.",
    gender: gender?.trim() ? undefined : "Gender is required.",
    civilStatus: civilStatus?.trim() ? undefined : "Civil Status is required.",
    governmentIdType: governmentIdType ? undefined : "Government ID type is required.",
    governmentIdNumber: orUndefined(validateGovIdNumber(governmentIdNumber)),
    accreditationStatus: !accreditationStatus
      ? "Accreditation Status is required."
      : accreditationStatus === "cancel" || accreditationStatus === "expired"
        ? "Pending or Accredited only."
        : undefined,
    approvedStart: orUndefined(validateDateString(approvedStart, "Start date")),
    manualAa: aaMethod === "manual" ? (manualError ?? undefined) : undefined,
  };
  const stepOf: Record<string, number> = {
    existingAccount: 0, photo: 0, firstName: 0, middleName: 0, lastName: 0, suffix: 0, mobile: 0, dateOfBirth: 0, email: 0, tempPassword: 0, confirmPassword: 0,
    street: 1, province: 1, city: 1, barangay: 1, postalCode: 1, telephone: 1, facebook: 1, tin: 1, businessEmployer: 1, businessAddress: 1, jobPosition: 1,
    position: 2, sponsor: 2, teamName: 2, cardApplicationDate: 2, programCategory: 2, vipCardLevel: 2, gender: 2, civilStatus: 2, governmentIdType: 2, governmentIdNumber: 2,
    accreditationStatus: 3, approvedStart: 3, manualAa: 3,
  };
  const liveKeys: Record<string, boolean> = { email: Boolean(email), postalCode: Boolean(postalCode), tin: Boolean(tin), mobile: Boolean(mobileNumber.trim()), manualAa: aaMethod === "manual" && Boolean(manualAaSuffix.trim()) };
  const visible = (key: string): string | undefined => (shownSteps.includes(stepOf[key]) || liveKeys[key] ? rules[key] : undefined);
  const stepHasErrors = (stepIndex: number) => Object.entries(rules).some(([key, message]) => message && stepOf[key] === stepIndex);

  const focusFirstInvalid = () => requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());

  const handleNext = () => {
    if (stepHasErrors(step)) {
      setShownSteps((previous) => (previous.includes(step) ? previous : [...previous, step]));
      focusFirstInvalid();
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

  const emailMismatch = (payload: CreateAccreditedSellerInput): boolean => {
    const account = (accountsQuery.data ?? []).find((item) => item.id === payload.existingAccountId);
    return Boolean(account && account.email.toLowerCase() !== payload.email.trim().toLowerCase());
  };

  const handleFinish = () => {
    const payload = buildPayload();
    const messages: string[] = [];
    const repositoryMessage = validateAccreditedSellerFields(payload);
    if (repositoryMessage) messages.push(repositoryMessage);
    if (sellerIdentity === "existing" && emailMismatch(payload)) messages.push("Email must match account.");
    if (stepHasErrors(3) || messages.length > 0) {
      setShownSteps((previous) => (previous.includes(3) ? previous : [...previous, 3]));
      setFinalErrors(messages);
      focusFirstInvalid();
      return;
    }
    setFinalErrors([]);
    setConfirmCreate(true);
  };

  const create = async () => {
    const payload = buildPayload();
    setSubmitting(true);
    try {
      // Temporary passwords are validated locally and inside the repository
      // but never persisted, logged, or included in query keys or summaries.
      const result = await createSeller.mutateAsync(payload);
      setConfirmCreate(false);
      onClose();
      // Navigate by official AA number so the detail URL shows the seller ID.
      onCreated?.(result.aaNumber ?? result.memberId);
      toast.success(
        payload.accreditationStatus === "accredited" ? "Seller successfully created and accredited" : "Seller created with Pending accreditation",
        {
          description:
            payload.accreditationStatus === "accredited"
              ? `Issued ${result.aaNumber}, valid until ${result.expiryDate}.`
              : `Reserved ${result.aaNumber}; accreditation stays Pending.`,
        },
      );
    } catch (err) {
      setConfirmCreate(false);
      toast.error("Creation failed.", { description: err instanceof Error ? err.message : "Failed to create seller." });
    } finally {
      setSubmitting(false);
    }
  };

  const canComplete =
    isSuperAdmin &&
    !leapDay &&
    (accreditationStatus === "pending" || accreditationStatus === "accredited") &&
    (aaMethod === "automatic" || !manualError);

  const STEPS = ["Personal", "Address", "Assignment", "Accreditation"];
  const fullName = fullNameOf(firstName, middleName, noMiddleName, lastName, suffix);
  const radioClass = "tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:sm:min-h-8";

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "IST" ? "Add IST" : "Add OST"}</DialogTitle>
          <DialogDescription>{mode === "IST" ? "Create an IST member." : "Create an OST member."}</DialogDescription>
        </DialogHeader>
        <div ref={bodyRef} className="tw:flex tw:flex-col tw:gap-4">
          {!isSuperAdmin ? <InfoNote title="Super Administrator completion required">Preview only. Super Administrator required.</InfoNote> : null}

          <StepIndicator steps={STEPS} current={step} />

          {step === 0 ? (
            <div className="tw:flex tw:flex-col tw:gap-5">
              <FormSection title="Seller Identity">
                <fieldset className="tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:border-0 tw:p-0">
                  <legend className="tw:mb-1.5 tw:p-0 tw:text-sm tw:font-medium">Seller Identity</legend>
                  <RadioGroup value={sellerIdentity} onValueChange={(value) => setSellerIdentity(value as "new" | "existing")} className="tw:flex tw:flex-wrap tw:gap-4" aria-label="Seller Identity">
                    <Label className={radioClass}>
                      <RadioGroupItem value="new" />
                      New Individual
                    </Label>
                    <Label className={radioClass}>
                      <RadioGroupItem value="existing" />
                      Existing Employee
                    </Label>
                  </RadioGroup>
                </fieldset>
                {sellerIdentity === "existing" ? (
                  <SelectField
                    id="existing-employee"
                    label="Existing Employee"
                    required
                    value={existingAccountId}
                    options={employeeOptions}
                    onChange={handleSelectEmployee}
                    placeholder="Search employees"
                    loading={staffQuery.isLoading || accountsQuery.isLoading}
                    hint="Links account. Preserves employee record."
                    error={visible("existingAccount")}
                  />
                ) : null}
              </FormSection>

              <FormSection title="Profile Photo *">
                <ProfilePhotoUploader value={profilePhotoUrl} fileName={profilePhotoName} onSelect={acceptPhotoFile} onClear={clearPhoto} error={photoError ?? visible("photo")} />
              </FormSection>

              <FormSection title="Name & Contact">
                <FormGrid>
                  <PersonNameField id="first-name" label="First Name" required value={firstName} onChange={setFirstName} error={visible("firstName")} />
                  <MiddleNameField
                    id="middle-name"
                    label="Middle Name"
                    required
                    value={middleName}
                    onChange={setMiddleName}
                    noMiddleName={noMiddleName}
                    onNoMiddleNameChange={setNoMiddleName}
                    error={visible("middleName")}
                  />
                  <PersonNameField id="last-name" label="Last Name" required value={lastName} onChange={setLastName} error={visible("lastName")} />
                  <SuffixField id="seller-suffix" value={suffix || undefined} onChange={setSuffix} error={visible("suffix")} />
                  <PhilippineMobileField id="mobile" label="Mobile Number" required value={mobileNumber} onChange={setMobileNumber} placeholder="09xx xxx xxxx" error={visible("mobile")} />
                  <StandardDateField id="dob" label="Birth Date" required value={dateOfBirth} onChange={setDateOfBirth} error={visible("dateOfBirth")} />
                  <EmailField id="seller-email" label="Email" required value={email} onChange={setEmail} error={visible("email")} className="tw:sm:col-span-2" />
                </FormGrid>
              </FormSection>

              <FormSection title="Credentials">
                {sellerIdentity === "new" ? (
                  <FormGrid>
                    <PasswordField id="temp-password" label="Temporary Password" required value={tempPassword} onChange={setTempPassword} hint="Minimum 12 characters." error={visible("tempPassword")} />
                    <ConfirmPasswordField id="confirm-password" label="Confirm Password" required value={confirmPassword} onChange={setConfirmPassword} error={visible("confirmPassword")} />
                  </FormGrid>
                ) : (
                  <p className="tw:text-sm tw:text-muted-foreground">Existing credentials remain unchanged.</p>
                )}
              </FormSection>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="tw:flex tw:flex-col tw:gap-5">
              <FormSection title="Address Information">
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
              <FormSection title="Additional Information (Optional)">
                <FormGrid>
                  <TextField id="telephone" label="Telephone" value={telephone} onChange={setTelephone} onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))} maxLength={15} inputMode="tel" error={visible("telephone")} />
                  <TextField id="facebook" label="Facebook" value={facebook} onChange={setFacebook} onBlur={() => setFacebook(facebook.trim())} maxLength={150} error={visible("facebook")} />
                  <TinField id="tin" label="TIN" value={tin} onChange={setTin} error={visible("tin")} />
                  <TextField id="job-position" label="Job Position" value={jobPosition} onChange={(value) => setJobPosition(cleanTitleInput(value))} onBlur={() => setJobPosition(jobPosition.trim())} maxLength={100} error={visible("jobPosition")} />
                  <TextField id="business" label="Business" value={businessEmployer} onChange={setBusinessEmployer} onBlur={() => setBusinessEmployer(businessEmployer.trim())} maxLength={150} error={visible("businessEmployer")} className="tw:sm:col-span-2" />
                  <TextField id="business-address" label="Business Address" value={businessAddress} onChange={setBusinessAddress} onBlur={() => setBusinessAddress(businessAddress.trim())} maxLength={200} error={visible("businessAddress")} className="tw:sm:col-span-2" />
                </FormGrid>
              </FormSection>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="tw:flex tw:flex-col tw:gap-5">
              <FormSection title="Sales Network Assignment">
                <FormGrid>
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
                    options={
                      mode === "OST"
                        ? [{ value: "OST", label: "OST" }]
                        : [
                            { value: "SVD", label: "SVD — Sales Vice Director" },
                            { value: "SSM", label: "SSM — Senior Sales Manager" },
                            { value: "SM", label: "SM — Sales Manager" },
                          ]
                    }
                    error={visible("position")}
                  />
                  <SelectField
                    id="sponsor"
                    label="Sponsor"
                    required
                    value={effectiveDesignation === "SVD" ? undefined : parentId}
                    options={(eligibleQuery.data ?? []).map((member) => ({ value: member.id, label: `${member.displayName} (${member.designation})` }))}
                    onChange={setParentId}
                    placeholder={effectiveDesignation === "SVD" ? "Root — no sponsor" : (eligibleQuery.data ?? []).length === 0 ? "No eligible sponsor available" : "Select eligible sponsor"}
                    loading={eligibleQuery.isLoading}
                    disabled={effectiveDesignation === "SVD"}
                    error={visible("sponsor")}
                  />
                  {effectiveDesignation === "SVD" ? (
                    <TextField id="team-name" label="Team Name" required value={teamName} onChange={(value) => setTeamName(cleanTitleInput(value))} onBlur={() => setTeamName(teamName.trim())} maxLength={100} placeholder="Enter Team Name" error={visible("teamName")} />
                  ) : (
                    <TextField id="inherited-team" label="Team" value={inheritedTeam ?? "Select sponsor first"} onChange={() => undefined} disabled />
                  )}
                </FormGrid>
              </FormSection>

              <FormSection title="Program Details">
                <FormGrid>
                  <StandardDateField id="card-application" label="Application Date" required value={cardApplicationDate} onChange={setCardApplicationDate} error={visible("cardApplicationDate")} />
                  <SelectField id="program-category" label="Program Category" required value={programCategory} options={PROGRAM_CATEGORY_OPTIONS} onChange={setProgramCategory} placeholder="Select program category" error={visible("programCategory")} />
                  <SelectField id="vip-level" label="Card Level" required value={vipCardLevel} options={VIP_LEVEL_OPTIONS} onChange={setVipCardLevel} error={visible("vipCardLevel")} />
                </FormGrid>
              </FormSection>

              <FormSection title="Personal Details">
                <FormGrid>
                  <SelectField id="gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" error={visible("gender")} />
                  <SelectField id="civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" error={visible("civilStatus")} />
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
            </div>
          ) : null}

          {step === 3 ? (
            <div className="tw:flex tw:flex-col tw:gap-5">
              <FormSection title="Accreditation and Completion">
                <FormGrid>
                  <TextField id="result" label="Result" value="Complete Now" onChange={() => undefined} disabled />
                  <SelectField
                    id="accreditation-status"
                    label="Accreditation Status"
                    required
                    value={accreditationStatus}
                    options={ACCREDITATION_STATUS_OPTIONS}
                    onChange={(value) => setAccreditationStatus(value)}
                    placeholder="Select status"
                    error={visible("accreditationStatus")}
                  />
                </FormGrid>
                <fieldset className="tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:border-0 tw:p-0">
                  <legend className="tw:mb-1.5 tw:p-0 tw:text-sm tw:font-medium">AA Method</legend>
                  <RadioGroup value={aaMethod} onValueChange={(value) => switchAaMethod(value as AaIssuanceMethod)} className="tw:flex tw:gap-4" aria-label="AA Method">
                    <Label className={radioClass}>
                      <RadioGroupItem value="automatic" />
                      Automatic
                    </Label>
                    <Label className={radioClass}>
                      <RadioGroupItem value="manual" />
                      Manual
                    </Label>
                  </RadioGroup>
                  {aaMethod === "automatic" ? <p className="tw:text-xs tw:text-muted-foreground">Auto-issues next number on completion.</p> : null}
                </fieldset>
                {aaMethod === "manual" ? (
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
                    error={visible("manualAa")}
                  />
                ) : null}
                <FormGrid>
                  <StandardDateField id="approved-start" label="Start Date" required value={approvedStart} onChange={setApprovedStart} error={visible("approvedStart")} />
                  <TextField id="approved-expiry" label="Expiry Date" value={expiryPreview ?? "—"} onChange={() => undefined} disabled />
                </FormGrid>
                {leapDay ? <InfoNote title="February 29 start">Leap-day rule provisional. Completion blocked.</InfoNote> : null}
                {accreditationStatus === "cancel" || accreditationStatus === "expired" ? (
                  <InfoNote title="Status preview only">Pending or Accredited only.</InfoNote>
                ) : null}
              </FormSection>

              <FormSection title="Review and Confirmation">
                <dl className="tw:m-0 tw:flex tw:flex-col tw:gap-1 tw:text-sm">
                  <ReviewLine term="Name" value={fullName || "—"} />
                  <ReviewLine term="Identity" value={sellerIdentity === "new" ? "New Individual" : "Existing Employee"} />
                  <ReviewLine term="Position" value={effectiveDesignation} />
                  <ReviewLine term="Sponsor" value={effectiveDesignation === "SVD" ? "Root — no sponsor" : sponsorName ? `${sponsorName.displayName} (${sponsorName.designation})` : "—"} />
                  <ReviewLine term="Team" value={effectiveDesignation === "SVD" ? teamName.trim() || "—" : (inheritedTeam ?? "—")} />
                  <ReviewLine term="Program Category" value={programCategory ? programCategoryLabel(programCategory) : "—"} />
                  <ReviewLine term="Accreditation Status" value={accreditationStatus ? (ACCREDITATION_STATUS_OPTIONS.find((option) => option.value === accreditationStatus)?.label ?? "—") : "—"} />
                  <ReviewLine term="Issuance Method" value={aaMethod === "automatic" ? "Automatic" : "Manual"} />
                  {aaMethod === "manual" ? <ReviewLine term="AA Number" value={manualFull} /> : null}
                  <ReviewLine term="Approved Start" value={approvedStart || "—"} />
                  <ReviewLine term="Approved Expiry" value={expiryPreview ?? "—"} />
                </dl>
                {finalErrors.length > 0 ? (
                  <ul role="alert" className="tw:m-0 tw:list-disc tw:pl-5 tw:text-sm tw:text-destructive">
                    {finalErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : null}
              </FormSection>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={onClose}>
              Cancel
            </Button>
            {step > 0 ? (
              <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={handleBack}>
                Back
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" loading={submitting || createSeller.isPending} disabled={!canComplete} onClick={handleFinish}>
                {accreditationStatus === "pending" ? "Create Seller" : "Create & Accredit Seller"}
              </Button>
            )}
          </DialogFooter>
        </div>
        <ConfirmDialog
          open={confirmCreate}
          title={accreditationStatus === "accredited" ? `Create and accredit ${mode} seller?` : `Create ${mode} seller as Pending?`}
          description={
            accreditationStatus === "accredited"
              ? `Confirm ${aaMethod} AA issuance for ${fullName}.`
              : `Confirm ${aaMethod} AA issuance for ${fullName}. Accreditation stays Pending.`
          }
          confirmText={accreditationStatus === "accredited" ? "Create & Accredit" : "Create Seller"}
          pending={submitting}
          onConfirm={() => void create()}
          onClose={() => setConfirmCreate(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReviewLine({ term, value }: { term: string; value: string }) {
  return (
    <div className="tw:flex tw:gap-2">
      <dt className="tw:w-44 tw:shrink-0 tw:font-medium tw:text-muted-foreground">{term}:</dt>
      <dd className="tw:m-0 tw:min-w-0 tw:break-words">{value}</dd>
    </div>
  );
}
