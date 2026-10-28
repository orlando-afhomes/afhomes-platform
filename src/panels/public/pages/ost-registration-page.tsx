"use client";

import { useRef, useState } from "react";
import { Alert, Button, Card, Form, Input, Steps, Tag } from "antd";
import { useVerifyReferralSponsor } from "@/data/queries";
import type { ReferralSponsorSummary } from "@/modules/sales-network/types";

type RegistrationStep = 0 | 1 | 2 | 3;

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

  const handleApplicantNext = () => {
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name are required for this prototype preview.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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
    <div className="ost-registration-page">
      <div className="ost-registration-page__header">
        <h1 className="ost-registration-page__title">OST Registration</h1>
        <p className="ost-registration-page__description">
          Referral-first registration preview. Entering information does not submit or save a registration.
        </p>
      </div>
      <Steps
        current={step}
        className="ost-registration-page__steps"
        items={[
          { title: "Referral" },
          { title: "Applicant" },
          { title: "Information" },
          { title: "Review" },
        ]}
      />
      <div className="ost-registration-page__content">
        {step === 0 ? (
          <Card title="Step 1 — Referral verification" className="ost-referral-step">
            <Form layout="vertical" className="ost-referral-step__form">
              <Form.Item label="Referral code" required>
                <Input
                  placeholder="Enter referral code"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  className="ost-referral-step__input"
                  maxLength={80}
                />
              </Form.Item>
              {verifyError ? (
                <Alert type="error" title={verifyError} showIcon className="ost-referral-step__verification" />
              ) : null}
              {sponsor && !confirmed ? (
                <div className="ost-sponsor-summary">
                  <p className="ost-sponsor-summary__name">{sponsor.displayName}</p>
                  <p className="ost-sponsor-summary__designation">
                    <Tag>{sponsor.designation}</Tag>
                  </p>
                  <p className="ost-sponsor-summary__status">Verified eligible sponsor</p>
                </div>
              ) : null}
              <div className="ost-referral-step__actions">
                <Button type="primary" onClick={() => void handleVerify()} loading={verifying}>
                  Verify referral code
                </Button>
                {sponsor && !confirmed ? (
                  <Button onClick={handleConfirmSponsor}>Confirm sponsor</Button>
                ) : null}
              </div>
            </Form>
          </Card>
        ) : null}
        {step === 1 ? (
          <Card title="Step 2 — Applicant information (prototype preview)" className="ost-applicant-step">
            <Form layout="vertical" className="ost-applicant-step__form">
              <div className="ost-applicant-step__fields">
                <Form.Item label="First name" required>
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} />
                </Form.Item>
                <Form.Item label="Middle name">
                  <Input value={middleName} onChange={(event) => setMiddleName(event.target.value)} maxLength={80} />
                </Form.Item>
                <Form.Item label="Last name" required>
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} />
                </Form.Item>
                <Form.Item label="Email address">
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} />
                </Form.Item>
                <Form.Item label="Mobile number">
                  <Input value={mobile} onChange={(event) => setMobile(event.target.value)} maxLength={32} />
                </Form.Item>
              </div>
              {formError ? <Alert type="error" title={formError} showIcon /> : null}
              <div className="ost-applicant-step__actions">
                <Button onClick={() => setStep(0)}>Back</Button>
                <Button type="primary" onClick={handleApplicantNext}>
                  Continue
                </Button>
              </div>
            </Form>
          </Card>
        ) : null}
        {step === 2 ? (
          <Card title="Step 3 — Registration information" className="ost-registration-details-step">
            <p className="ost-registration-details-step__text">OST registration classification.</p>
            <p className="ost-registration-details-step__text">
              Sponsored by {sponsor?.displayName} ({sponsor?.designation}).
            </p>
            <p className="ost-registration-details-step__notice">
              Final registration requirements are pending approval. This preview does not create an application,
              account, accreditation, or genealogy record.
            </p>
            <div className="ost-registration-details-step__actions">
              <Button onClick={() => setStep(1)}>Back</Button>
              <Button type="primary" onClick={() => setStep(3)}>
                Review
              </Button>
            </div>
          </Card>
        ) : null}
        {step === 3 ? (
          <Card title="Step 4 — Review preview" className="ost-registration-review">
            <div className="ost-registration-review__section">
              <h2 className="ost-registration-review__heading">Sponsor</h2>
              <p className="ost-registration-review__sponsor">
                {sponsor?.displayName} ({sponsor?.designation})
              </p>
            </div>
            <div className="ost-registration-review__section">
              <h2 className="ost-registration-review__heading">Applicant</h2>
              <p className="ost-registration-review__applicant">
                {[firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="ost-registration-review__applicant">{email.trim() || "No email provided"}</p>
              <p className="ost-registration-review__applicant">{mobile.trim() || "No mobile number provided"}</p>
            </div>
            <Alert
              type="info"
              title="Application submission is not yet enabled in this frontend prototype. Registration policies are being finalized."
              showIcon
              className="ost-registration-review__notice"
            />
            <div className="ost-registration-review__actions">
              <Button onClick={() => setStep(1)}>Back to applicant information</Button>
              <Button onClick={handleChangeCode}>Change referral code</Button>
              <Button onClick={handleReset}>Return to start</Button>
            </div>
          </Card>
        ) : null}
      </div>
      <div className="ost-registration-page__footer">
        <p className="ost-registration-page__prototype-note">
          Prototype preview only. No information entered here is submitted or permanently saved.
        </p>
      </div>
    </div>
  );
}
