"use client";

import { useRef, useState, type ReactNode } from "react";
import { useSubmitRegistration, useVerifyReferralSponsor } from "@/data/queries";
import type { ReferralSponsorSummary } from "@/modules/sales-network/types";
import type { RegistrationApplicant } from "@/modules/accreditation/types";
import {
  ADDRESS_FIELDS,
  EMPTY_APPLICANT,
  PERSONAL_FIELDS,
  applicantAddress,
  applicantDisplayName,
  normalizeApplicant,
  validateApplicantFields,
  type ApplicantErrors,
} from "@/modules/accreditation/registration";
import { StepIndicator } from "@/shared/components/modern/step-indicator";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormSection } from "@/shared/components/modern/form-layout";
import { TextField } from "@/shared/forms/modern";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CardSection } from "@/shared/components/modern/card-section";
import { ApplicantAddressFields, ApplicantPersonalFields } from "../components/ost-applicant-fields";

type RegistrationStep = 0 | 1 | 2 | 3;

const STEPS = ["Referral", "Applicant", "Address", "Review"] as const;
const BUTTON_CLASS = "tw:min-h-11 tw:sm:min-h-8";

function StepCard({ title, children }: { title: string; children: ReactNode }) {
  return <CardSection title={title} className="tw:gap-4">{children}</CardSection>;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="tw:mt-1 tw:flex tw:flex-wrap tw:gap-2">{children}</div>;
}

/** Applicant summary shown on the review step and reused by the correction page. */
export function ApplicantSummary({ applicant }: { applicant: RegistrationApplicant }) {
  return (
    <section aria-label="Applicant" className="tw:flex tw:flex-col tw:gap-1">
      <h3 className="tw:text-sm tw:font-semibold">Applicant</h3>
      <p>{applicantDisplayName(applicant)}</p>
      <p>{applicant.email}</p>
      <p>{applicant.mobileNumber}</p>
      <p>Born {applicant.dateOfBirth}</p>
      <p>{applicantAddress(applicant)}</p>
    </section>
  );
}

/** Confirmation after a submission: a neutral reference code, and what happens next. */
export function SubmissionReceipt({ reference, heading = "Application received" }: { reference: string; heading?: string }) {
  return (
    <StepCard title={heading}>
      <p>Thank you. The office will review your application and contact you.</p>
      <p>
        Your reference code is <strong className="tw:font-mono">{reference}</strong>. Keep it in case you need to ask about your application.
      </p>
      <InfoNote>Submitting an application does not create a seller account or an accreditation number. You cannot sign in until the office approves your application.</InfoNote>
    </StepCard>
  );
}

export function OstRegistrationPage() {
  const verifySponsor = useVerifyReferralSponsor();
  const submitApplication = useSubmitRegistration();
  const attemptRef = useRef(0);
  const [step, setStep] = useState<RegistrationStep>(0);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<ReferralSponsorSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [applicant, setApplicant] = useState<RegistrationApplicant>(EMPTY_APPLICANT);
  const [errors, setErrors] = useState<ApplicantErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const clearVerification = () => {
    attemptRef.current += 1;
    setSponsor(null);
    setConfirmed(false);
    setVerifyError(null);
    verifySponsor.reset();
  };

  const handleCodeChange = (value: string) => {
    if (sponsor || verifyError) clearVerification();
    setCode(value);
  };

  const handleVerify = async () => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setVerifyError(null);
    setSponsor(null);
    setConfirmed(false);
    const trimmed = code.trim();
    if (!trimmed) {
      setVerifyError("Enter a referral code.");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifySponsor.mutateAsync(trimmed);
      if (attemptRef.current !== attempt) return;
      if (result.ok) {
        setSponsor(result.sponsor);
      } else {
        setVerifyError(result.publicMessage);
      }
    } catch {
      if (attemptRef.current !== attempt) return;
      setVerifyError("Referral code is invalid or currently unavailable.");
    } finally {
      if (attemptRef.current === attempt) setVerifying(false);
    }
  };

  const handleConfirmSponsor = () => {
    if (!sponsor) return;
    setConfirmed(true);
    setStep(1);
  };

  const handleChangeCode = () => {
    clearVerification();
    setCode("");
    setStep(0);
  };

  const patchApplicant = (patch: Partial<RegistrationApplicant>) => {
    setApplicant((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch) as Array<keyof RegistrationApplicant>) delete next[key];
      return next;
    });
  };

  const goNext = (fields: typeof PERSONAL_FIELDS, next: RegistrationStep) => (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateApplicantFields(applicant, fields);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(next);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const receipt = await submitApplication.mutateAsync({ referralCode: code.trim(), applicant: normalizeApplicant(applicant) });
      setReference(receipt.reference);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not accept this application online. Please contact the office.");
    }
  };

  const heading = (
    <div>
      <h1 className="tw:text-3xl tw:font-semibold">OST Registration</h1>
      <p className="tw:mt-2 tw:text-muted-foreground">Apply to become an Outsourcing Sales Team (OST) seller. You need the referral code from the person who invited you.</p>
    </div>
  );

  if (reference) {
    return (
      <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-6 tw:px-4 tw:py-8">
        {heading}
        <SubmissionReceipt reference={reference} />
      </div>
    );
  }

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-6 tw:px-4 tw:py-8">
      {heading}
      <StepIndicator steps={STEPS} current={step} />
      <div>
        {step === 0 ? (
          <StepCard title="Step 1 — Referral verification">
            <form
              noValidate
              className="tw:flex tw:flex-col tw:gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleVerify();
              }}
            >
              <TextField id="referral-code" label="Referral code" required placeholder="Enter referral code" value={code} onChange={handleCodeChange} maxLength={80} error={verifyError ?? undefined} autoComplete="off" />
              {sponsor && !confirmed ? (
                <div role="status" className="tw:rounded-md tw:border tw:border-border tw:bg-background tw:p-3">
                  <p className="tw:font-semibold">{sponsor.displayName}</p>
                  <p className="tw:my-1">
                    <Badge variant="outline">{sponsor.designation}</Badge>
                  </p>
                  <p className="tw:text-success">Verified eligible sponsor</p>
                </div>
              ) : null}
              <Actions>
                <Button type="submit" loading={verifying} className={BUTTON_CLASS}>
                  Verify referral code
                </Button>
                {sponsor && !confirmed ? (
                  <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={handleConfirmSponsor}>
                    Confirm sponsor
                  </Button>
                ) : null}
              </Actions>
            </form>
          </StepCard>
        ) : null}
        {step === 1 ? (
          <StepCard title="Step 2 — Applicant information">
            <form noValidate className="tw:flex tw:flex-col tw:gap-4" onSubmit={goNext(PERSONAL_FIELDS, 2)}>
              <ApplicantPersonalFields value={applicant} onChange={patchApplicant} errors={errors} />
              <Actions>
                <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="submit" className={BUTTON_CLASS}>
                  Continue
                </Button>
              </Actions>
            </form>
          </StepCard>
        ) : null}
        {step === 2 ? (
          <StepCard title="Step 3 — Address">
            <form noValidate className="tw:flex tw:flex-col tw:gap-4" onSubmit={goNext(ADDRESS_FIELDS, 3)}>
              <FormSection title="Home address">
                <ApplicantAddressFields value={applicant} onChange={patchApplicant} errors={errors} />
              </FormSection>
              <Actions>
                <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className={BUTTON_CLASS}>
                  Review
                </Button>
              </Actions>
            </form>
          </StepCard>
        ) : null}
        {step === 3 ? (
          <StepCard title="Step 4 — Review and submit">
            <section aria-label="Sponsor" className="tw:flex tw:flex-col tw:gap-1">
              <h3 className="tw:text-sm tw:font-semibold">Sponsor</h3>
              <p>
                {sponsor?.displayName} ({sponsor?.designation})
              </p>
            </section>
            <ApplicantSummary applicant={normalizeApplicant(applicant)} />
            <InfoNote>The office reviews every application and will contact you. Submitting does not create a seller account or an accreditation number.</InfoNote>
            {submitError ? (
              <p role="alert" className="tw:text-sm tw:text-destructive">
                {submitError}
              </p>
            ) : null}
            <Actions>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => setStep(1)}>
                Back to applicant information
              </Button>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={handleChangeCode}>
                Change referral code
              </Button>
              <Button type="button" loading={submitApplication.isPending} className={BUTTON_CLASS} onClick={() => void handleSubmit()}>
                Submit application
              </Button>
            </Actions>
          </StepCard>
        ) : null}
      </div>
    </div>
  );
}
