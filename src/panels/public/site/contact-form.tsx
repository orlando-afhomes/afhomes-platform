"use client";

import { useState, type FormEvent } from "react";
import { buildContactMailto, EMPTY_CONTACT_MESSAGE, validateContactMessage, type ContactErrors, type ContactMessage } from "@/modules/public-site/contact-message";
import { TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

/**
 * Contact form copied from the old site. Nothing is stored or sent by AFhomes: a valid form opens
 * the visitor's email app with the message ready to send.
 */
export function ContactForm() {
  const [value, setValue] = useState<ContactMessage>(EMPTY_CONTACT_MESSAGE);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [opened, setOpened] = useState(false);
  const set = (key: keyof ContactMessage) => (next: string) => {
    setValue((current) => ({ ...current, [key]: next }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setOpened(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateContactMessage(value);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    window.location.href = buildContactMailto(value);
    setOpened(true);
  };

  return (
    <form onSubmit={submit} noValidate className="site-form" aria-label="Contact form">
      <TextField label="Your name" required value={value.name} onChange={set("name")} error={errors.name} autoComplete="name" maxLength={120} />
      <TextField label="Your email" required inputMode="email" value={value.email} onChange={set("email")} error={errors.email} autoComplete="email" maxLength={254} />
      <TextField label="Contact number" required inputMode="numeric" placeholder="09XXXXXXXXX" value={value.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" maxLength={11} />
      <TextField label="Subject" required value={value.subject} onChange={set("subject")} error={errors.subject} maxLength={150} />
      <div className="site-form__field">
        <label htmlFor="contact-message" className="site-form__label">Your message (optional)</label>
        <Textarea id="contact-message" rows={5} value={value.message} maxLength={2000} onChange={(event) => set("message")(event.target.value)} aria-invalid={errors.message ? true : undefined} />
        {errors.message ? <p role="alert" className="site-form__error">{errors.message}</p> : null}
      </div>
      <Button type="submit" className="tw:min-h-11 tw:sm:min-h-9">Open email to send</Button>
      <p className="site-note" role="status">
        {opened ? "Your email app should now be open with your message. If it did not open, email us at info@afhomes.com.ph." : "This opens your email app with your message ready to send. We do not store what you type here."}
      </p>
    </form>
  );
}
