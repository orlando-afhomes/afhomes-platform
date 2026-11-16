"use client";

import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useMockRepositories } from "@/data/queries";
import type { PublicAccreditationResult } from "@/data/contracts/accreditation-repository";
import { validateExistingAaIdentifier } from "@/modules/accreditation/identifiers";
import { VERIFY_PRIVACY_NOTICE_PARAGRAPHS } from "@/modules/public-site/privacy-notice";
import { TextField } from "@/shared/forms/modern";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { TextLinesSkeleton } from "@/shared/components/modern/skeletons";
import { Button } from "@/shared/ui/button";
import { VerifyContactDialog, VerifyPrivacyDialog } from "../components/verify-dialogs";
import { VerifyResultCard } from "../components/verify-result-card";
import { VERIFY_DAILY_LIMIT, verifySession } from "../verify-session";

const GENERIC_FAILURE = "No active accreditation was found for that number. Check the number and try again.";
const INVALID_NUMBER = "Enter a valid AA number.";
const LIMIT_REACHED = `You have used your ${VERIFY_DAILY_LIMIT} successful searches. Please try again after the allowance resets.`;
const UNAVAILABLE = "Verification is unavailable. Please try again.";

type Phase = "idle" | "privacy" | "contact" | "done";

/**
 * Public seller check (doc 03 section 9, UI21). Process copied from v2: AA number, privacy notice,
 * visitor contact details, then the result. Exact AA number only; one generic failure message.
 */
export function AccreditationVerificationPage() {
  const repositories = useMockRepositories();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reuseContact, setReuseContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublicAccreditationResult | null>(null);
  const [message, setMessage] = useState("");

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setMessage("");
  };

  const start = (event: FormEvent) => {
    event.preventDefault();
    reset();
    if (!validateExistingAaIdentifier(value).ok) {
      setInvalid(true);
      return;
    }
    if (verifySession.remainingSearches() === 0) {
      setMessage(LIMIT_REACHED);
      return;
    }
    setPhase("privacy");
  };

  const reveal = async () => {
    setBusy(true);
    try {
      verifySession.saveReceipt();
      const found = await repositories.accreditations.verifyPublic(value);
      if (found) verifySession.recordSuccess();
      setResult(found);
      setMessage(found ? "" : GENERIC_FAILURE);
    } catch {
      setMessage(UNAVAILABLE);
    } finally {
      setBusy(false);
      setPhase("done");
    }
  };

  return (
    <div className="verify-page">
      <header className="verify-page__hero">
        <span className="verify-page__eyebrow"><ShieldCheck aria-hidden="true" className="tw:size-4" />Sales accreditation</span>
        <h1 className="verify-page__title">Verify a sales team member</h1>
        <p className="verify-page__lede">Enter an AA number to confirm a seller&apos;s current accreditation.</p>
      </header>

      <section className="verify-page__panel" aria-labelledby="verify-search-heading">
        <h2 id="verify-search-heading" className="verify-page__panel-title">Search by AA number</h2>
        <p className="verify-page__hint">
          Enter the full AA number. Up to {VERIFY_DAILY_LIMIT} successful checks per visitor in 24 hours. Searching by name is not available.
        </p>
        <form onSubmit={start} className="verify-page__form" noValidate>
          <TextField
            label="AA number"
            required
            placeholder="Enter AAI or AAO number"
            value={value}
            onChange={(next) => {
              setValue(next.toUpperCase().trim());
              setInvalid(false);
              reset();
            }}
            error={invalid ? INVALID_NUMBER : undefined}
            maxLength={16}
            autoComplete="off"
          />
          <Button type="submit" loading={busy} disabled={value === ""} className="tw:min-h-11 tw:sm:min-h-9">
            Search
          </Button>
        </form>
        <details className="verify-page__privacy">
          <summary>Privacy notice: <strong>Data Privacy Act of 2012</strong></summary>
          <div className="verify-page__privacy-body">
            {VERIFY_PRIVACY_NOTICE_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </details>
      </section>

      <div role="status" aria-live="polite" className="verify-page__results">
        {busy ? <div className="verify-page__panel"><span className="tw:sr-only">Checking…</span><TextLinesSkeleton lines={3} /></div> : null}
        {message ? <InfoNote>{message}</InfoNote> : null}
        {result ? <VerifyResultCard result={result} /> : null}
      </div>

      <VerifyPrivacyDialog
        open={phase === "privacy"}
        onCancel={reset}
        onContinue={() => {
          setReuseContact(verifySession.hasValidReceipt());
          setPhase("contact");
        }}
      />
      <VerifyContactDialog open={phase === "contact"} reuseContact={reuseContact} busy={busy} onCancel={reset} onSubmit={() => void reveal()} />
    </div>
  );
}
