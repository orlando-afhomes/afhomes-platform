import { validateEmailAddress, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validatePersonName } from "@/shared/forms/validation/person-name";
import { SITE } from "./content/site";

/**
 * Contact form of the public site (owner decision UI22). There is no server yet, so a valid form
 * opens the visitor's email app with a ready message; nothing is sent or stored by AFhomes.
 * shortcut: mailto hand-off, replace with a server action when the backend exists.
 */
export type ContactMessage = { name: string; email: string; phone: string; subject: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactMessage, string>>;

export const EMPTY_CONTACT_MESSAGE: ContactMessage = { name: "", email: "", phone: "", subject: "", message: "" };

export function validateContactMessage(value: ContactMessage): ContactErrors {
  const errors: ContactErrors = {};
  const name = validatePersonName(value.name, "Name");
  if (name) errors.name = name;
  const email = validateEmailAddress(value.email);
  if (email) errors.email = email;
  const phone = validateMobileNumber(value.phone);
  if (phone) errors.phone = phone;
  if (value.subject.trim().length < 3) errors.subject = "Subject is required.";
  if (value.subject.trim().length > 150) errors.subject = "Subject must be 150 characters or fewer.";
  if (value.message.length > 2000) errors.message = "Message must be 2000 characters or fewer.";
  return errors;
}

export function buildContactMailto(value: ContactMessage, to: string = SITE.infoEmail): string {
  const body = [
    `Name: ${value.name.trim()}`,
    `Email: ${value.email.trim()}`,
    `Contact number: ${value.phone.trim()}`,
    "",
    value.message.trim(),
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(value.subject.trim())}&body=${encodeURIComponent(body)}`;
}
