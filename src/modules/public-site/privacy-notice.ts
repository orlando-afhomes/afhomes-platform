import { PUBLIC_SUPPORT_INFO } from "./support-info";

/**
 * Privacy notice for the public seller check, adapted from the v2 notice (UI21). Parts that were
 * only true for the v2 hosting (Supabase, Vercel, Cloudflare) are left out.
 * The full policy and retention schedule are on the /privacy page (owner decision 2026-11-22).
 * shortcut: wording is not legal advice; Legal and the Data Protection Officer should review it before go-live.
 */
export const VERIFY_PRIVACY_NOTICE_PARAGRAPHS: string[] = [
  "AFhomes provides this service to help you check a sales representative's identity or accreditation using their AA number.",
  "Before showing a result, we collect your name, email address and mobile number. We check their format but do not verify that you own the email address or number. We use this information to provide your requested verification, recognize repeat submissions and help prevent misuse. Providing these details is not permission for marketing, and your details are not shown to the representative you search for.",
  "Each browser may make up to 3 successful searches in 24 hours. A result shows only the representative's masked name, AA number, available profile photo and applicable validity information.",
  `You may request information, access or correction concerning your personal data, or erasure or blocking where applicable, by emailing ${PUBLIC_SUPPORT_INFO.email}. You may also raise concerns with the National Privacy Commission. Read the full Privacy Policy, including how long we keep records, through the Privacy Policy link in the website footer.`,
  `If you do not provide the requested contact details and acknowledge this notice, this online check will not show a result. Contact the official AFhomes number, ${PUBLIC_SUPPORT_INFO.phone}, for assistance. Do not send payment or transact outside official AFhomes processes.`,
];

export const VERIFY_PRIVACY_ACKNOWLEDGEMENT =
  "I acknowledge that I have read and understood the AFhomes Privacy Notice and agree to the processing of my personal information for accreditation verification and security purposes.";
