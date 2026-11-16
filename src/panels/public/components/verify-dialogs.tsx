"use client";

import { useState, type FormEvent } from "react";
import { VERIFY_PRIVACY_ACKNOWLEDGEMENT, VERIFY_PRIVACY_NOTICE_PARAGRAPHS } from "@/modules/public-site/privacy-notice";
import { TextField } from "@/shared/forms/modern";
import { validateEmailAddress, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validatePersonName } from "@/shared/forms/validation/person-name";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

const DIALOG_CLASS = "tw:sm:max-w-lg";

/** Step 1 of the v2 flow: read the privacy notice and tick the acknowledgement. */
export function VerifyPrivacyDialog({ open, onCancel, onContinue }: { open: boolean; onCancel: () => void; onContinue: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const close = () => {
    setAcknowledged(false);
    onCancel();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>Privacy notice</DialogTitle>
          <DialogDescription>Data Privacy Act of 2012</DialogDescription>
        </DialogHeader>
        <div className="verify-dialog__notice" tabIndex={0}>
          {VERIFY_PRIVACY_NOTICE_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <label className="verify-dialog__ack">
          <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked)} aria-labelledby="verify-privacy-ack" />
          <span id="verify-privacy-ack">{VERIFY_PRIVACY_ACKNOWLEDGEMENT}</span>
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button
            type="button"
            disabled={!acknowledged}
            onClick={() => {
              setAcknowledged(false);
              onContinue();
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONTACT_ERROR = "Enter a valid name, email and mobile number.";

/**
 * Step 2 of the v2 flow: the visitor's own name, email and mobile. Details stay in this form only
 * and are cleared after submit; nothing is logged or stored (UI21).
 * shortcut: the v2 robot check (Cloudflare Turnstile) needs a real server, add it with the backend.
 */
export function VerifyContactDialog({
  open,
  reuseContact,
  busy,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  reuseContact: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [contact, setContact] = useState({ name: "", email: "", mobile: "" });
  const [error, setError] = useState("");
  const close = () => {
    setContact({ name: "", email: "", mobile: "" });
    setError("");
    onCancel();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reuseContact) {
      const invalid =
        validatePersonName(contact.name, "Name") ?? validateEmailAddress(contact.email) ?? validateMobileNumber(contact.mobile);
      if (invalid) {
        setError(CONTACT_ERROR);
        return;
      }
    }
    setContact({ name: "", email: "", mobile: "" });
    setError("");
    onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>Your contact details</DialogTitle>
          <DialogDescription>
            {reuseContact
              ? "Your details are already validated for this session."
              : "Enter your details as the person doing this search. Your details are not shown to the seller."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="tw:flex tw:flex-col tw:gap-3" noValidate>
          {reuseContact ? null : (
            <>
              <TextField label="Name" required value={contact.name} onChange={(name) => setContact((v) => ({ ...v, name }))} autoComplete="name" maxLength={120} />
              <TextField label="Email" required inputMode="email" value={contact.email} onChange={(email) => setContact((v) => ({ ...v, email }))} autoComplete="email" maxLength={254} />
              <TextField
                label="Mobile"
                required
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
                value={contact.mobile}
                onChange={(mobile) => setContact((v) => ({ ...v, mobile }))}
                autoComplete="tel"
                maxLength={11}
              />
            </>
          )}
          {error ? <p role="alert" className="verify-dialog__error">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy}>Verify accreditation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
