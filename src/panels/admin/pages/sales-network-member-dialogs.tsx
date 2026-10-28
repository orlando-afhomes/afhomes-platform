"use client";

import { useState } from "react";
import { Button, Divider, Modal, Segmented } from "antd";
import type { Designation, OrgMember } from "@/modules/organization/types";
import "./sales-network-member-dialogs.css";
import { normalizeLandline, normalizePhilippineMobile, normalizePostalCode } from "@/shared/utils/input-sanitizers";
import {
  CIVIL_STATUS_OPTIONS,
  GENDER_OPTIONS,
  GOV_ID_OPTIONS,
  PROGRAM_CATEGORY_OPTIONS,
  VIP_LEVEL_OPTIONS,
} from "@/modules/sales-network/accredited-seller";
import {
  EmailField,
  GovernmentIdFields,
  MiddleNameField,
  PersonNameField,
  PhilippineAddressFields,
  PhilippineMobileField,
  SelectField,
  StandardDateField,
  SuffixField,
  TextField,
  TinField,
  formatPhilippineLandlineDisplay,
  validateBarangay,
  validateBusinessAddress,
  validateBusinessName,
  validateCity,
  validateDateString,
  validateEmailAddress,
  validateFacebook,
  validateGovIdNumber,
  validateJobPosition,
  validateLandline,
  validateMiddleName,
  validateMobileNumber,
  validatePersonName,
  validatePostalCode,
  validateProvince,
  validateStreet,
  validateSubdivision,
  validateSuffix,
  validateTinNumber,
  validatePastDate,
} from "@/shared/forms";
import { designationLabel, teamDisplayName } from "@/modules/sales-network/display";
import { confirmAction, showError, showFieldErrors, showSuccess } from "@/shared/utils/feedback";
import {
  useUpdateSalesNetworkMember,
  useTransferSalesNetworkMember,
  useEligibleSalesNetworkParents,
  useMembers,
} from "@/data/queries";
import { getTotalDescendantCount } from "@/modules/sales-network/genealogy";

export function SalesNetworkMemberDialogs({
  editMember,
  transferMember,
  onCloseEdit,
  onCloseTransfer,
}: {
  editMember: OrgMember | null;
  transferMember: OrgMember | null;
  onCloseEdit: () => void;
  onCloseTransfer: () => void;
}) {
  return (
    <>
      <Modal title="Edit member" open={editMember !== null} onCancel={onCloseEdit} footer={null} width={720} destroyOnHidden>
        {editMember ? <EditMemberForm member={editMember} onDone={onCloseEdit} /> : null}
      </Modal>
      <Modal title="Transfer member" open={transferMember !== null} onCancel={onCloseTransfer} footer={null} destroyOnHidden>
        {transferMember ? <TransferMemberForm member={transferMember} onDone={onCloseTransfer} /> : null}
      </Modal>
    </>
  );
}

function splitMemberDisplayName(displayName: string): { first: string; middle: string; last: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts.slice(1).join(" ") };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

function EditMemberForm({ member, onDone }: { member: OrgMember; onDone: () => void }) {
  const updateMember = useUpdateSalesNetworkMember();
  const profile = member.sellerProfile ?? null;
  const split = splitMemberDisplayName(member.displayName);

  const [firstName, setFirstName] = useState(profile?.firstName ?? split.first);
  const [middleName, setMiddleName] = useState(profile?.middleName ?? split.middle);
  const [noMiddleName, setNoMiddleName] = useState(profile ? profile.middleName === null : !split.middle);
  const [lastName, setLastName] = useState(profile?.lastName ?? split.last);
  const [suffix, setSuffix] = useState(profile?.suffix ?? "");
  const [mobileNumber, setMobileNumber] = useState(profile?.mobileNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [street, setStreet] = useState(profile?.address.street ?? "");
  const [province, setProvince] = useState(profile?.address.province ?? "");
  const [city, setCity] = useState(profile?.address.city ?? "");
  const [barangay, setBarangay] = useState(profile?.address.barangay ?? "");
  const [subdivision, setSubdivision] = useState(profile?.address.subdivision ?? "");
  const [postalCode, setPostalCode] = useState(profile?.address.postalCode ?? "");
  const [telephone, setTelephone] = useState(profile?.telephone ?? "");
  const [facebook, setFacebook] = useState(profile?.facebook ?? "");
  const [tin, setTin] = useState(profile?.tin ?? "");
  const [businessEmployer, setBusinessEmployer] = useState(profile?.businessEmployer ?? "");
  const [businessAddress, setBusinessAddress] = useState(profile?.businessAddress ?? "");
  const [jobPosition, setJobPosition] = useState(profile?.jobPosition ?? "");
  const [gender, setGender] = useState<string | undefined>(profile?.gender ?? undefined);
  const [civilStatus, setCivilStatus] = useState<string | undefined>(profile?.civilStatus ?? undefined);
  const [governmentIdType, setGovernmentIdType] = useState<string | undefined>(profile?.governmentIdType ?? undefined);
  const [governmentIdNumber, setGovernmentIdNumber] = useState(profile?.governmentIdNumber ?? "");
  const [cardApplicationDate, setCardApplicationDate] = useState(profile?.cardApplicationDate ?? "");
  const [programCategory, setProgramCategory] = useState<string | undefined>(profile?.programCategory ?? undefined);
  const [vipCardLevel, setVipCardLevel] = useState<"B1" | "S1" | "G1">(profile?.vipCardLevel ?? "B1");
  const [submitting, setSubmitting] = useState(false);

  const displayName = [firstName.trim(), noMiddleName ? "" : middleName.trim(), lastName.trim(), suffix.trim()]
    .filter(Boolean)
    .join(" ");

  const validateFields = (): string[] => {
    const checks: Array<string | null> = [
      validatePersonName(firstName, "First name"),
      validateMiddleName(middleName, noMiddleName),
      validatePersonName(lastName, "Last name"),
      validateSuffix(suffix),
      validateMobileNumber(mobileNumber),
      validatePastDate(dateOfBirth, "Birth date", "Birth date cannot be future."),
      validateEmailAddress(email),
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
      validateDateString(cardApplicationDate, "Application date"),
      programCategory ? null : "Select a program category.",
      ["B1", "S1", "G1"].includes(vipCardLevel) ? null : "Card level must be valid.",
      gender?.trim() ? null : "Gender is required.",
      civilStatus?.trim() ? null : "Civil Status is required.",
      governmentIdType ? null : "Government ID type is required.",
      validateGovIdNumber(governmentIdNumber),
    ];
    return checks.filter((message): message is string => message !== null);
  };

  const handleFinish = async () => {
    const fieldErrors = validateFields();
    if (fieldErrors.length > 0) {
      await showFieldErrors("Complete the required fields.", fieldErrors);
      return;
    }
    const proceed = await confirmAction({
      title: `Save changes to ${displayName}?`,
      text: "The member record will be updated.",
      confirmText: "Save",
    });
    if (!proceed) return;
    setSubmitting(true);
    try {
      await updateMember.mutateAsync({
        id: member.id,
        firstName: firstName.trim(),
        middleName: noMiddleName ? null : middleName.trim(),
        lastName: lastName.trim(),
        suffix: suffix.trim() ? suffix.trim() : null,
        mobileNumber: normalizePhilippineMobile(mobileNumber),
        dateOfBirth,
        email: email.trim(),
        street: street.trim(),
        province: province.trim(),
        city: city.trim(),
        barangay: barangay.trim(),
        subdivision: subdivision.trim() ? subdivision.trim() : null,
        postalCode: normalizePostalCode(postalCode),
        telephone: telephone.trim() ? normalizeLandline(telephone) : null,
        facebook: facebook.trim() || null,
        tin: tin.trim() ? tin.replace(/\D/g, "") : null,
        businessEmployer: businessEmployer.trim() || null,
        businessAddress: businessAddress.trim() || null,
        jobPosition: jobPosition.trim() || null,
        gender: gender ?? "",
        civilStatus: civilStatus ?? "",
        governmentIdType: governmentIdType ?? "",
        governmentIdNumber: governmentIdNumber.trim(),
        cardApplicationDate,
        programCategory: programCategory ?? "",
        vipCardLevel,
      });
      onDone();
      await showSuccess("Member updated successfully.", `${displayName} has been saved.`);
    } catch (err) {
      await showError("Update failed.", err instanceof Error ? err.message : "Failed to update member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="sales-member-dialog__form"
      onSubmit={(event) => {
        event.preventDefault();
        void handleFinish();
      }}
    >
      <Divider titlePlacement="start" className="sales-member-dialog__section">Name & Contact</Divider>
      <div className="sales-member-dialog__grid">
        <PersonNameField id="edit-first-name" label="First Name" required value={firstName} onChange={setFirstName} placeholder="First Name" />
        <PersonNameField id="edit-last-name" label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last Name" />
      </div>
      <div className="sales-member-dialog__grid">
        <MiddleNameField
          id="edit-middle-name"
          label="Middle Name"
          required
          value={middleName}
          onChange={setMiddleName}
          noMiddleName={noMiddleName}
          onNoMiddleNameChange={setNoMiddleName}
          placeholder="Middle Name"
        />
        <SuffixField id="edit-suffix" value={suffix || undefined} onChange={setSuffix} />
      </div>
      <div className="sales-member-dialog__grid">
        <PhilippineMobileField
          id="edit-mobile"
          label="Mobile Number"
          required
          value={mobileNumber}
          onChange={setMobileNumber}
          placeholder="Mobile Number"
          error={mobileNumber.trim() ? (validateMobileNumber(mobileNumber) ?? undefined) : undefined}
        />
        <StandardDateField id="edit-dob" label="Birth Date" required value={dateOfBirth} onChange={setDateOfBirth} />
      </div>
      <EmailField
        id="edit-email"
        label="Email"
        required
        value={email}
        onChange={setEmail}
        placeholder="Email"
        error={email ? (validateEmailAddress(email) ?? undefined) : undefined}
      />
      <Divider titlePlacement="start" className="sales-member-dialog__section">Address Information</Divider>
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
      <Divider titlePlacement="start" className="sales-member-dialog__section">Additional Information (Optional)</Divider>
      <div className="sales-member-dialog__grid">
        <TextField
          id="edit-telephone"
          label="Telephone"
          value={telephone}
          onChange={setTelephone}
          onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))}
          maxLength={15}
          inputMode="tel"
          placeholder="Telephone"
        />
        <TextField
          id="edit-facebook"
          label="Facebook"
          value={facebook}
          onChange={setFacebook}
          onBlur={() => setFacebook(facebook.trim())}
          maxLength={150}
          placeholder="Facebook"
        />
      </div>
      <div className="sales-member-dialog__grid">
        <TinField
          id="edit-tin"
          label="TIN"
          value={tin}
          onChange={setTin}
          placeholder="TIN"
          error={tin ? (validateTinNumber(tin) ?? undefined) : undefined}
        />
        <TextField
          id="edit-job-position"
          label="Job Position"
          value={jobPosition}
          onChange={setJobPosition}
          onBlur={() => setJobPosition(jobPosition.trim())}
          maxLength={100}
          placeholder="Job Position"
        />
      </div>
      <TextField
        id="edit-business"
        label="Business"
        value={businessEmployer}
        onChange={setBusinessEmployer}
        onBlur={() => setBusinessEmployer(businessEmployer.trim())}
        maxLength={150}
        placeholder="Business"
      />
      <TextField
        id="edit-business-address"
        label="Business Address"
        value={businessAddress}
        onChange={setBusinessAddress}
        onBlur={() => setBusinessAddress(businessAddress.trim())}
        maxLength={200}
        placeholder="Business Address"
      />
      <Divider titlePlacement="start" className="sales-member-dialog__section">Program Details</Divider>
      <div className="sales-member-dialog__grid">
        <StandardDateField id="edit-card-application" label="Application Date" required value={cardApplicationDate} onChange={setCardApplicationDate} />
        <SelectField
          id="edit-vip-level"
          label="Card Level"
          required
          value={vipCardLevel}
          options={VIP_LEVEL_OPTIONS}
          onChange={setVipCardLevel}
        />
      </div>
      <SelectField
        id="edit-program-category"
        label="Program Category"
        required
        value={programCategory}
        options={PROGRAM_CATEGORY_OPTIONS}
        onChange={setProgramCategory}
        placeholder="Select program category"
        showSearch
      />
      <Divider titlePlacement="start" className="sales-member-dialog__section">Personal Details</Divider>
      <div className="sales-member-dialog__grid">
        <SelectField id="edit-gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" />
        <SelectField id="edit-civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" />
      </div>
      <div className="sales-member-dialog__grid">
        <GovernmentIdFields
          idType={governmentIdType}
          onIdTypeChange={setGovernmentIdType}
          idNumber={governmentIdNumber}
          onIdNumberChange={setGovernmentIdNumber}
          idTypeOptions={GOV_ID_OPTIONS}
          required
        />
      </div>
      <div className="sales-member-dialog__actions">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

function TransferMemberForm({ member, onDone }: { member: OrgMember; onDone: () => void }) {
  const transferMember = useTransferSalesNetworkMember();
  const membersQuery = useMembers();
  const allMembers = membersQuery.data ?? [];
  const descendantCount = getTotalDescendantCount(member.id, allMembers);
  const currentParent = member.parentId ? allMembers.find((parent) => parent.id === member.parentId) : undefined;
  const currentParentName = currentParent
    ? `${currentParent.displayName} (${designationLabel(currentParent.designation)})`
    : "None";

  const [target, setTarget] = useState<"IST" | "OST">(member.designation === "OST" ? "IST" : "OST");
  const [position, setPosition] = useState<Designation>(member.designation === "OST" ? "SSM" : "OST");
  const [newParentId, setNewParentId] = useState<string | undefined>(undefined);
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eligibleQuery = useEligibleSalesNetworkParents(position);
  const sponsorMember = (eligibleQuery.data ?? []).find((parent) => parent.id === newParentId);
  const inheritedTeam = sponsorMember ? (teamDisplayName(sponsorMember, allMembers) ?? null) : null;

  const switchTarget = (next: "IST" | "OST") => {
    setTarget(next);
    setPosition(next === "OST" ? "OST" : member.designation === "OST" ? "SSM" : member.designation);
    setNewParentId(undefined);
    setTeamName("");
  };

  const switchPosition = (next: Designation) => {
    setPosition(next);
    setNewParentId(undefined);
    setTeamName("");
  };

  const positionLocked = target === "OST" || member.designation !== "OST";
  const positionOptions =
    target === "OST"
      ? [{ value: "OST" as const, label: "OST" }]
      : member.designation === "OST"
        ? [
            { value: "SVD" as const, label: "SVD — Sales Vice Director" },
            { value: "SSM" as const, label: "SSM — Senior Sales Manager" },
            { value: "SM" as const, label: "SM — Sales Manager" },
          ]
        : [{ value: member.designation, label: designationLabel(member.designation) }];

  const validateFields = (): string[] => {
    const errors: Array<string | null> = [
      position === "SVD" ? null : !newParentId ? "A receiving parent is required." : null,
      position === "SVD" && !teamName.trim() ? "Team name is required for SVD." : null,
    ];
    return errors.filter((message): message is string => message !== null);
  };

  const handleFinish = async () => {
    const fieldErrors = validateFields();
    if (fieldErrors.length > 0) {
      await showFieldErrors("Complete the required fields.", fieldErrors);
      return;
    }
    const proceed = await confirmAction({
      title: `Transfer ${member.displayName} to ${target}?`,
      text:
        position === "SVD"
          ? `The member will become an SVD root of new team ${teamName.trim()}.`
          : "The member and their downline branch will move to the selected parent.",
      confirmText: `Transfer to ${target}`,
    });
    if (!proceed) return;
    setSubmitting(true);
    try {
      await transferMember.mutateAsync({
        id: member.id,
        newParentId: position === "SVD" ? null : (newParentId as string),
        designation: position,
        teamName: position === "SVD" ? teamName.trim() : null,
      });
      onDone();
      await showSuccess("Transfer completed.", `${member.displayName} is now ${target}.`);
    } catch (err) {
      await showError("Transfer failed.", err instanceof Error ? err.message : "Failed to transfer member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="sales-member-dialog__form"
      onSubmit={(event) => {
        event.preventDefault();
        void handleFinish();
      }}
    >
      <Divider titlePlacement="start" className="sales-member-dialog__section">Transfer Details</Divider>
      {/* Read-only summary; the new assignment is chosen below. */}
      <TextField id="transfer-member" label="Member" value={member.displayName} onChange={() => undefined} disabled />
      <TextField id="transfer-current-parent" label="Current parent" value={currentParentName} onChange={() => undefined} disabled />
      <TextField
        id="transfer-descendants"
        label="Affected descendants"
        value={String(descendantCount)}
        onChange={() => undefined}
        disabled
        inputMode="numeric"
      />
      <Divider titlePlacement="start" className="sales-member-dialog__section">New Assignment</Divider>
      <div className="sales-member-dialog__field">
        <span className="afhomes-field__label" id="transfer-target-label">Target Classification</span>
        <Segmented
          aria-labelledby="transfer-target-label"
          value={target}
          onChange={(value) => switchTarget(value as "IST" | "OST")}
          options={[
            { value: "IST", label: "IST" },
            { value: "OST", label: "OST" },
          ]}
        />
      </div>
      <SelectField
        id="transfer-position"
        label="Assigned Position"
        required
        value={position}
        options={positionOptions}
        onChange={(value) => switchPosition(value as Designation)}
        disabled={positionLocked}
      />
      {position === "SVD" ? (
        <TextField
          id="transfer-team-name"
          label="Team Name"
          required
          value={teamName}
          onChange={setTeamName}
          onBlur={() => setTeamName(teamName.trim())}
          maxLength={100}
          placeholder="Enter Team Name"
        />
      ) : (
        <>
          <SelectField
            id="transfer-parent"
            label="Sponsor"
            required
            value={newParentId}
            options={(eligibleQuery.data ?? [])
              .filter((parent) => parent.id !== member.id)
              .map((parent) => ({
                value: parent.id,
                label: `${parent.displayName} (${designationLabel(parent.designation)})`,
              }))}
            onChange={setNewParentId}
            placeholder="Select sponsor"
            showSearch
            loading={eligibleQuery.isLoading}
          />
          <TextField
            id="transfer-team"
            label="Team"
            value={inheritedTeam ?? "Select sponsor first"}
            onChange={() => undefined}
            disabled
          />
        </>
      )}
      <div className="sales-member-dialog__actions">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Transfer
        </Button>
      </div>
    </form>
  );
}