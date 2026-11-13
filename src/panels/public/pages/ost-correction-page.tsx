"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRegistrationCorrection, useResubmitRegistration } from "@/data/queries";
import type { RegistrationApplicant } from "@/modules/accreditation/types";
import { normalizeApplicant, validateApplicant, type ApplicantErrors } from "@/modules/accreditation/registration";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormSection } from "@/shared/components/modern/form-layout";
import { CardSection } from "@/shared/components/modern/card-section";
import { Button } from "@/shared/ui/button";
import { ApplicantAddressFields, ApplicantPersonalFields } from "../components/ost-applicant-fields";
import { SubmissionReceipt } from "./ost-registration-page";

const INVALID_LINK = "This link is not valid any more. If you need to correct your application, please contact the office.";

function CorrectionForm({ token, initial, returnReason }: { token: string; initial: RegistrationApplicant; returnReason: string }) {
  const resubmit = useResubmitRegistration(token);
  const [applicant, setApplicant] = useState<RegistrationApplicant>(initial);
  const [errors, setErrors] = useState<ApplicantErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const patch = (change: Partial<RegistrationApplicant>) => {
    setApplicant((previous) => ({ ...previous, ...change }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(change) as Array<keyof RegistrationApplicant>) delete next[key];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const found = validateApplicant(normalizeApplicant(applicant));
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const receipt = await resubmit.mutateAsync(normalizeApplicant(applicant));
      setReference(receipt.reference);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : INVALID_LINK);
    }
  };

  if (reference) return <SubmissionReceipt reference={reference} heading="Corrected application received" />;

  return (
    <CardSection title="Correct your application" className="tw:gap-4">
      <InfoNote title="What the office asked you to fix">{returnReason}</InfoNote>
      <form noValidate className="tw:flex tw:flex-col tw:gap-4" onSubmit={(event) => void submit(event)}>
        <FormSection title="Applicant information">
          <ApplicantPersonalFields value={applicant} onChange={patch} errors={errors} />
        </FormSection>
        <FormSection title="Home address">
          <ApplicantAddressFields value={applicant} onChange={patch} errors={errors} />
        </FormSection>
        {submitError ? (
          <p role="alert" className="tw:text-sm tw:text-destructive">
            {submitError}
          </p>
        ) : null}
        <div className="tw:flex tw:flex-wrap tw:gap-2">
          <Button type="submit" loading={resubmit.isPending} className="tw:min-h-11 tw:sm:min-h-8">
            Send corrected application
          </Button>
        </div>
      </form>
    </CardSection>
  );
}

/** Private correction link (/register/ost/correct/[token]): the applicant fixes the same application and resubmits. */
export function OstCorrectionPage() {
  const { token } = useParams<{ token: string }>();
  const correction = useRegistrationCorrection(token ?? "");

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-6 tw:px-4 tw:py-8">
      <div>
        <h1 className="tw:text-3xl tw:font-semibold">OST Registration</h1>
        <p className="tw:mt-2 tw:text-muted-foreground">Update the application you sent to the office.</p>
      </div>
      {correction.isLoading ? (
        <p role="status">Loading your application…</p>
      ) : correction.data ? (
        <>
          <p className="tw:text-sm tw:text-muted-foreground">
            Reference code <span className="tw:font-mono">{correction.data.reference}</span>
          </p>
          <CorrectionForm token={token} initial={correction.data.applicant} returnReason={correction.data.returnReason} />
        </>
      ) : (
        <InfoNote title="Link not valid">{INVALID_LINK}</InfoNote>
      )}
    </div>
  );
}
