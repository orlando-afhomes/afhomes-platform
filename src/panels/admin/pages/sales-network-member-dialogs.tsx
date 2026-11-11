"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Designation, OrgMember } from "@/modules/organization/types";
import { normalizeLandline, normalizePhilippineMobile, normalizePostalCode } from "@/shared/utils/input-sanitizers";
import {
  CIVIL_STATUS_OPTIONS,
  GENDER_OPTIONS,
  GOV_ID_OPTIONS,
  PROGRAM_CATEGORY_OPTIONS,
  VIP_LEVEL_OPTIONS,
} from "@/modules/sales-network/accredited-seller";
import {
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
  validateSuffix,
  validateTinNumber,
  validatePastDate,
} from "@/shared/forms";
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
} from "@/shared/forms/modern";
import { useFormErrors } from "@/shared/forms/modern/use-form-errors";
import { designationLabel, teamDisplayName } from "@/modules/sales-network/display";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { FormGrid, FormSection } from "@/shared/components/modern/form-layout";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { useUpdateSalesNetworkMember, useTransferSalesNetworkMember, useEligibleSalesNetworkParents, useMembers } from "@/data/queries";
import { getTotalDescendantCount } from "@/modules/sales-network/genealogy";

const BUTTON_CLASS = "tw:min-h-11 tw:sm:min-h-8";

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
      <Dialog open={editMember !== null} onOpenChange={(next) => (!next ? onCloseEdit() : undefined)}>
        <DialogContent className="tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update the seller profile for this member.</DialogDescription>
          </DialogHeader>
          {editMember ? <EditMemberForm key={editMember.id} member={editMember} onDone={onCloseEdit} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={transferMember !== null} onOpenChange={(next) => (!next ? onCloseTransfer() : undefined)}>
        <DialogContent className="tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer member</DialogTitle>
            <DialogDescription>Move the member and their downline to a new classification and sponsor.</DialogDescription>
          </DialogHeader>
          {transferMember ? <TransferMemberForm key={transferMember.id} member={transferMember} onDone={onCloseTransfer} /> : null}
        </DialogContent>
      </Dialog>
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

const orUndefined = (message: string | null) => message ?? undefined;

function EditMemberForm({ member, onDone }: { member: OrgMember; onDone: () => void }) {
  const updateMember = useUpdateSalesNetworkMember();
  const formRef = useRef<HTMLFormElement>(null);
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
  const [confirmSave, setConfirmSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayName = [firstName.trim(), noMiddleName ? "" : middleName.trim(), lastName.trim(), suffix.trim()].filter(Boolean).join(" ");

  const { visible, reveal } = useFormErrors(
    {
      firstName: orUndefined(validatePersonName(firstName, "First name")),
      middleName: orUndefined(validateMiddleName(middleName, noMiddleName)),
      lastName: orUndefined(validatePersonName(lastName, "Last name")),
      suffix: orUndefined(validateSuffix(suffix)),
      mobile: orUndefined(validateMobileNumber(mobileNumber)),
      dateOfBirth: orUndefined(validatePastDate(dateOfBirth, "Birth date", "Birth date cannot be future.")),
      email: orUndefined(validateEmailAddress(email)),
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
      cardApplicationDate: orUndefined(validateDateString(cardApplicationDate, "Application date")),
      programCategory: programCategory ? undefined : "Select a program category.",
      vipCardLevel: ["B1", "S1", "G1"].includes(vipCardLevel) ? undefined : "Card level must be valid.",
      gender: gender?.trim() ? undefined : "Gender is required.",
      civilStatus: civilStatus?.trim() ? undefined : "Civil Status is required.",
      governmentIdType: governmentIdType ? undefined : "Government ID type is required.",
      governmentIdNumber: orUndefined(validateGovIdNumber(governmentIdNumber)),
    },
    { mobile: Boolean(mobileNumber.trim()), email: Boolean(email), postalCode: Boolean(postalCode), tin: Boolean(tin) },
    formRef,
  );

  const save = async () => {
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
      setConfirmSave(false);
      onDone();
      toast.success("Member updated successfully.", { description: `${displayName} has been saved.` });
    } catch (err) {
      setConfirmSave(false);
      toast.error("Update failed.", { description: err instanceof Error ? err.message : "Failed to update member." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reveal()) setConfirmSave(true);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-5">
      <FormSection title="Name & Contact">
        <FormGrid>
          <PersonNameField id="edit-first-name" label="First Name" required value={firstName} onChange={setFirstName} placeholder="First Name" error={visible("firstName")} />
          <PersonNameField id="edit-last-name" label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last Name" error={visible("lastName")} />
          <MiddleNameField
            id="edit-middle-name"
            label="Middle Name"
            required
            value={middleName}
            onChange={setMiddleName}
            noMiddleName={noMiddleName}
            onNoMiddleNameChange={setNoMiddleName}
            placeholder="Middle Name"
            error={visible("middleName")}
          />
          <SuffixField id="edit-suffix" value={suffix || undefined} onChange={setSuffix} error={visible("suffix")} />
          <PhilippineMobileField id="edit-mobile" label="Mobile Number" required value={mobileNumber} onChange={setMobileNumber} placeholder="Mobile Number" error={visible("mobile")} />
          <StandardDateField id="edit-dob" label="Birth Date" required value={dateOfBirth} onChange={setDateOfBirth} error={visible("dateOfBirth")} />
          <EmailField id="edit-email" label="Email" required value={email} onChange={setEmail} placeholder="Email" error={visible("email")} className="tw:sm:col-span-2" />
        </FormGrid>
      </FormSection>
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
          <TextField
            id="edit-telephone"
            label="Telephone"
            value={telephone}
            onChange={setTelephone}
            onBlur={() => setTelephone(formatPhilippineLandlineDisplay(telephone))}
            maxLength={15}
            inputMode="tel"
            placeholder="Telephone"
            error={visible("telephone")}
          />
          <TextField id="edit-facebook" label="Facebook" value={facebook} onChange={setFacebook} onBlur={() => setFacebook(facebook.trim())} maxLength={150} placeholder="Facebook" error={visible("facebook")} />
          <TinField id="edit-tin" label="TIN" value={tin} onChange={setTin} placeholder="TIN" error={visible("tin")} />
          <TextField
            id="edit-job-position"
            label="Job Position"
            value={jobPosition}
            onChange={setJobPosition}
            onBlur={() => setJobPosition(jobPosition.trim())}
            maxLength={100}
            placeholder="Job Position"
            error={visible("jobPosition")}
          />
          <TextField
            id="edit-business"
            label="Business"
            value={businessEmployer}
            onChange={setBusinessEmployer}
            onBlur={() => setBusinessEmployer(businessEmployer.trim())}
            maxLength={150}
            placeholder="Business"
            error={visible("businessEmployer")}
            className="tw:sm:col-span-2"
          />
          <TextField
            id="edit-business-address"
            label="Business Address"
            value={businessAddress}
            onChange={setBusinessAddress}
            onBlur={() => setBusinessAddress(businessAddress.trim())}
            maxLength={200}
            placeholder="Business Address"
            error={visible("businessAddress")}
            className="tw:sm:col-span-2"
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Program Details">
        <FormGrid>
          <StandardDateField id="edit-card-application" label="Application Date" required value={cardApplicationDate} onChange={setCardApplicationDate} error={visible("cardApplicationDate")} />
          <SelectField id="edit-vip-level" label="Card Level" required value={vipCardLevel} options={VIP_LEVEL_OPTIONS} onChange={setVipCardLevel} error={visible("vipCardLevel")} />
          <SelectField
            id="edit-program-category"
            label="Program Category"
            required
            value={programCategory}
            options={PROGRAM_CATEGORY_OPTIONS}
            onChange={setProgramCategory}
            placeholder="Select program category"
            error={visible("programCategory")}
            className="tw:sm:col-span-2"
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Personal Details">
        <FormGrid>
          <SelectField id="edit-gender" label="Gender" required value={gender} options={GENDER_OPTIONS} onChange={setGender} placeholder="Select gender" error={visible("gender")} />
          <SelectField id="edit-civil-status" label="Civil Status" required value={civilStatus} options={CIVIL_STATUS_OPTIONS} onChange={setCivilStatus} placeholder="Select civil status" error={visible("civilStatus")} />
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className={BUTTON_CLASS}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className={BUTTON_CLASS}>
          Save
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={confirmSave}
        title={`Save changes to ${displayName}?`}
        description="The member record will be updated."
        confirmText="Save"
        pending={submitting}
        onConfirm={() => void save()}
        onClose={() => setConfirmSave(false)}
      />
    </form>
  );
}

function TransferMemberForm({ member, onDone }: { member: OrgMember; onDone: () => void }) {
  const transferMember = useTransferSalesNetworkMember();
  const membersQuery = useMembers();
  const formRef = useRef<HTMLFormElement>(null);
  const allMembers = membersQuery.data ?? [];
  const descendantCount = getTotalDescendantCount(member.id, allMembers);
  const currentParent = member.parentId ? allMembers.find((parent) => parent.id === member.parentId) : undefined;
  const currentParentName = currentParent ? `${currentParent.displayName} (${designationLabel(currentParent.designation)})` : "None";

  const [target, setTarget] = useState<"IST" | "OST">(member.designation === "OST" ? "IST" : "OST");
  const [position, setPosition] = useState<Designation>(member.designation === "OST" ? "SSM" : "OST");
  const [newParentId, setNewParentId] = useState<string | undefined>(undefined);
  const [teamName, setTeamName] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
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

  const { visible, reveal } = useFormErrors(
    {
      parent: position === "SVD" || newParentId ? undefined : "A receiving parent is required.",
      teamName: position === "SVD" && !teamName.trim() ? "Team name is required for SVD." : undefined,
    },
    {},
    formRef,
  );

  const run = async () => {
    setSubmitting(true);
    try {
      await transferMember.mutateAsync({
        id: member.id,
        newParentId: position === "SVD" ? null : (newParentId as string),
        designation: position,
        teamName: position === "SVD" ? teamName.trim() : null,
      });
      setConfirmTransfer(false);
      onDone();
      toast.success("Transfer completed.", { description: `${member.displayName} is now ${target}.` });
    } catch (err) {
      setConfirmTransfer(false);
      toast.error("Transfer failed.", { description: err instanceof Error ? err.message : "Failed to transfer member." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reveal()) setConfirmTransfer(true);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="tw:flex tw:flex-col tw:gap-5">
      <FormSection title="Transfer Details">
        {/* Read-only summary; the new assignment is chosen below. */}
        <TextField id="transfer-member" label="Member" value={member.displayName} onChange={() => undefined} disabled />
        <TextField id="transfer-current-parent" label="Current parent" value={currentParentName} onChange={() => undefined} disabled />
        <TextField id="transfer-descendants" label="Affected descendants" value={String(descendantCount)} onChange={() => undefined} disabled inputMode="numeric" />
      </FormSection>
      <FormSection title="New Assignment">
        <fieldset className="tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:border-0 tw:p-0">
          <legend className="tw:mb-1.5 tw:p-0 tw:text-sm tw:font-medium">Target Classification</legend>
          <RadioGroup value={target} onValueChange={(value) => switchTarget(value as "IST" | "OST")} className="tw:flex tw:gap-4" aria-label="Target Classification">
            {(["IST", "OST"] as const).map((option) => (
              <Label key={option} className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:sm:min-h-8">
                <RadioGroupItem value={option} />
                {option}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
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
            error={visible("teamName")}
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
                .map((parent) => ({ value: parent.id, label: `${parent.displayName} (${designationLabel(parent.designation)})` }))}
              onChange={setNewParentId}
              placeholder="Select sponsor"
              loading={eligibleQuery.isLoading}
              error={visible("parent")}
            />
            <TextField id="transfer-team" label="Team" value={inheritedTeam ?? "Select sponsor first"} onChange={() => undefined} disabled />
          </>
        )}
      </FormSection>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} className={BUTTON_CLASS}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className={BUTTON_CLASS}>
          Transfer
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={confirmTransfer}
        title={`Transfer ${member.displayName} to ${target}?`}
        description={
          position === "SVD"
            ? `The member will become an SVD root of new team ${teamName.trim()}.`
            : "The member and their downline branch will move to the selected parent."
        }
        confirmText={`Transfer to ${target}`}
        pending={submitting}
        onConfirm={() => void run()}
        onClose={() => setConfirmTransfer(false)}
      />
    </form>
  );
}
