"use client";

import { useState, type FormEvent } from "react";
import { useMockRepositories } from "@/data/queries";
import type { PublicAccreditationResult } from "@/data/contracts/accreditation-repository";
import { TextField } from "@/shared/forms/modern";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

const GENERIC_FAILURE = "No active accreditation was found for that number. Check the number and try again.";

/** Public accreditation verification: exact AA number only, restricted result, one generic failure message. */
export function AccreditationVerificationPage() {
  const repositories = useMockRepositories();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<PublicAccreditationResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setFailed(false);
    try {
      const found = await repositories.accreditations.verifyPublic(value);
      setResult(found);
      setFailed(found === null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-xl tw:flex-col tw:gap-4 tw:px-4 tw:py-10">
      <h1 className="tw:text-2xl tw:font-semibold">Verify an accreditation</h1>
      <p className="tw:text-sm tw:text-muted-foreground">Enter the full accreditation number exactly as issued. Searching by name is not available.</p>
      <Card><form onSubmit={(event) => void submit(event)} className="tw:flex tw:flex-col tw:gap-3">
        <TextField label="Accreditation number" required value={value} onChange={(next) => setValue(next.toUpperCase())} maxLength={16} autoComplete="off" />
        <Button type="submit" disabled={busy || value.trim() === ""} className="tw:min-h-11 tw:sm:min-h-8">
          {busy ? "Checking…" : "Verify"}
        </Button>
        </form></Card>
      <div role="status" aria-live="polite">
        {failed ? <InfoNote>{GENERIC_FAILURE}</InfoNote> : null}
        {result ? (
          <Card><section aria-label="Verification result">
            <h2 className="tw:text-lg tw:font-semibold">Accreditation is active</h2>
            <dl className="tw:mt-2 tw:flex tw:flex-col tw:gap-1 tw:text-sm">
              <div><dt className="tw:inline tw:text-muted-foreground">Number: </dt><dd className="tw:inline">{result.aaNumber}</dd></div>
              <div><dt className="tw:inline tw:text-muted-foreground">Type: </dt><dd className="tw:inline">{result.classification}</dd></div>
              {result.validUntil ? <div><dt className="tw:inline tw:text-muted-foreground">Valid until: </dt><dd className="tw:inline">{result.validUntil}</dd></div> : null}
            </dl>
            </section></Card>
        ) : null}
      </div>
    </div>
  );
}
