"use client";

import { useRef, useState, type ReactNode } from "react";
import { useVerifyReferralSponsor } from "@/data/queries";
import type { ReferralSponsorSummary } from "@/modules/sales-network/types";
import { StepIndicator } from "@/shared/components/modern/step-indicator";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { TextField } from "@/shared/forms/modern";
import { isValidEmail } from "@/shared/utils/input-sanitizers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

type RegistrationStep = 0 | 1 | 2 | 3;

const STEPS = ["Referral", "Applicant", "Information", "Review"] as const;
const BUTTON_CLASS = "tw:min-h-11 tw:sm:min-h-8";

function StepCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="tw:flex tw:flex-col tw:gap-4 tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4">
      <h2 className="tw:text-base tw:font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="tw:mt-1 tw:flex tw:flex-wrap tw:gap-2">{children}</div>;
}

export function OstRegistrationPage() {
  const verifySponsor = useVerifyReferralSponsor();
  const attemptRef = useRef(0);
  const [step, setStep] = useState<RegistrationStep>(0);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<ReferralSponsorSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleApplicantNext = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name are required for this prototype preview.");
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setFormError("Enter a valid email address or leave it blank.");
      return;
    }
    setStep(2);
  };

  const handleReset = () => {
    clearVerification();
    setCode("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setMobile("");
    setFormError(null);
    setStep(0);
  };

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-6 tw:px-4 tw:py-8">
      <div>
        <h1 className="tw:text-3xl tw:font-semibold">OST Registration</h1>
        <p className="tw:mt-2 tw:text-muted-foreground">Referral-first registration preview. Entering information does not submit or save a registration.</p>
      </div>
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
                <Button type="submit" disabled={verifying} className={BUTTON_CLASS}>
                  {verifying ? "Verifying…" : "Verify referral code"}
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
          <StepCard title="Step 2 — Applicant information (prototype preview)">
            <form noValidate className="tw:flex tw:flex-col tw:gap-4" onSubmit={handleApplicantNext}>
              <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
                <TextField id="applicant-first-name" label="First name" required value={firstName} onChange={setFirstName} maxLength={80} />
                <TextField id="applicant-middle-name" label="Middle name" value={middleName} onChange={setMiddleName} maxLength={80} />
                <TextField id="applicant-last-name" label="Last name" required value={lastName} onChange={setLastName} maxLength={80} />
                <TextField id="applicant-email" label="Email address" value={email} onChange={setEmail} maxLength={120} inputMode="email" />
                <TextField id="applicant-mobile" label="Mobile number" value={mobile} onChange={setMobile} maxLength={32} inputMode="tel" />
              </div>
              {formError ? (
                <p role="alert" className="tw:text-sm tw:text-destructive">
                  {formError}
                </p>
              ) : null}
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
          <StepCard title="Step 3 — Registration information">
            <p>OST registration classification.</p>
            <p>
              Sponsored by {sponsor?.displayName} ({sponsor?.designation}).
            </p>
            <p className="tw:text-sm tw:text-muted-foreground">
              Final registration requirements are pending approval. This preview does not create an application, account, accreditation, or genealogy record.
            </p>
            <Actions>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" className={BUTTON_CLASS} onClick={() => setStep(3)}>
                Review
              </Button>
            </Actions>
          </StepCard>
        ) : null}
        {step === 3 ? (
          <StepCard title="Step 4 — Review preview">
            <section aria-label="Sponsor" className="tw:flex tw:flex-col tw:gap-1">
              <h3 className="tw:text-sm tw:font-semibold">Sponsor</h3>
              <p>
                {sponsor?.displayName} ({sponsor?.designation})
              </p>
            </section>
            <section aria-label="Applicant" className="tw:flex tw:flex-col tw:gap-1">
              <h3 className="tw:text-sm tw:font-semibold">Applicant</h3>
              <p>{[firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ") || "—"}</p>
              <p>{email.trim() || "No email provided"}</p>
              <p>{mobile.trim() || "No mobile number provided"}</p>
            </section>
            <InfoNote>Application submission is not yet enabled in this frontend prototype. Registration policies are being finalized.</InfoNote>
            <Actions>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={() => setStep(1)}>
                Back to applicant information
              </Button>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={handleChangeCode}>
                Change referral code
              </Button>
              <Button type="button" variant="outline" className={BUTTON_CLASS} onClick={handleReset}>
                Return to start
              </Button>
            </Actions>
          </StepCard>
        ) : null}
      </div>
      <p className="tw:text-sm tw:text-muted-foreground">Prototype preview only. No information entered here is submitted or permanently saved.</p>
    </div>
  );
}
