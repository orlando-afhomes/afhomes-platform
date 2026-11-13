"use client";

import { useEffect, useState } from "react";
import type { RegistrationCompletion } from "@/modules/accreditation/types";
import { validateCompletion } from "@/modules/accreditation/registration";
import {
  CIVIL_STATUS_OPTIONS,
  GENDER_OPTIONS,
  GOV_ID_OPTIONS,
  PROGRAM_CATEGORY_OPTIONS,
  VIP_LEVEL_OPTIONS,
} from "@/modules/sales-network/accredited-seller";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { FormGrid, FormSection } from "@/shared/components/modern/form-layout";
import { GovernmentIdFields, ProfilePhotoUploader, SelectField, StandardDateField } from "@/shared/forms/modern";

const EMPTY: RegistrationCompletion = {
  gender: "",
  civilStatus: "",
  governmentIdType: "",
  governmentIdNumber: "",
  cardApplicationDate: "",
  programCategory: "",
  vipCardLevel: "B1",
  profilePhotoName: "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Check and complete step: the office adds the seller details the applicant does not give on the public form. Mount it only while open. */
export function RegistrationCompletionDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: RegistrationCompletion | null;
  onClose: () => void;
  onSubmit: (completion: RegistrationCompletion) => Promise<unknown>;
}) {
  const [value, setValue] = useState<RegistrationCompletion>(initial ?? EMPTY);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  const patch = (change: Partial<RegistrationCompletion>) => setValue((previous) => ({ ...previous, ...change }));

  const acceptPhoto = (file: File) => {
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setError("Photo must be a JPEG, PNG or WebP image of 5MB or less.");
      return;
    }
    setError(undefined);
    setPhotoUrl(typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null);
    patch({ profilePhotoName: file.name });
  };

  const submit = async () => {
    const problem = validateCompletion(value);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    try {
      await onSubmit(value);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormDialog
      open
      title="Check and complete"
      description="Check the applicant's details, then add the seller details below. The Administrator decides after this step."
      submitText="Save as checked"
      pending={pending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <FormSection title="Profile photo">
        <ProfilePhotoUploader
          value={photoUrl}
          fileName={value.profilePhotoName || null}
          onSelect={acceptPhoto}
          onClear={() => {
            setPhotoUrl(null);
            patch({ profilePhotoName: "" });
          }}
        />
      </FormSection>
      <FormSection title="Personal details">
        <FormGrid>
          <SelectField id="registration-gender" label="Gender" required value={value.gender || undefined} options={GENDER_OPTIONS} onChange={(gender) => patch({ gender })} placeholder="Select gender" />
          <SelectField id="registration-civil-status" label="Civil status" required value={value.civilStatus || undefined} options={CIVIL_STATUS_OPTIONS} onChange={(civilStatus) => patch({ civilStatus })} placeholder="Select civil status" />
          <GovernmentIdFields
            idPrefix="registration-gov-id"
            idType={value.governmentIdType || undefined}
            onIdTypeChange={(governmentIdType) => patch({ governmentIdType })}
            idNumber={value.governmentIdNumber}
            onIdNumberChange={(governmentIdNumber) => patch({ governmentIdNumber })}
            idTypeOptions={GOV_ID_OPTIONS}
            required
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Program details">
        <FormGrid>
          <StandardDateField id="registration-card-date" label="Application date" required value={value.cardApplicationDate} onChange={(cardApplicationDate) => patch({ cardApplicationDate })} />
          <SelectField id="registration-program" label="Program category" required value={value.programCategory || undefined} options={PROGRAM_CATEGORY_OPTIONS} onChange={(programCategory) => patch({ programCategory })} placeholder="Select program category" />
          <SelectField id="registration-card-level" label="Card level" required value={value.vipCardLevel} options={VIP_LEVEL_OPTIONS} onChange={(vipCardLevel) => patch({ vipCardLevel })} />
        </FormGrid>
      </FormSection>
    </FormDialog>
  );
}
