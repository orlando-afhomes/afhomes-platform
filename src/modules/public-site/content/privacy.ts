import { PUBLIC_SUPPORT_INFO } from "../support-info";

/**
 * Public privacy policy under the Data Privacy Act of 2012 (RA 10173). Owner decision 2026-11-22: published as the working
 * policy. shortcut: wording is not legal advice; Legal and the Data Protection Officer should review it before go-live.
 */
export const PRIVACY_EFFECTIVE_DATE = "22 November 2026";

export type PrivacySection = { id: string; title: string; paragraphs?: string[]; items?: string[] };

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "who",
    title: "Who we are",
    paragraphs: [
      "AFhomes Group of Companies, including AFhomes Hotspring & Ecofarm Resort Corp., is the personal information controller for the information described here. This policy covers this website, the customer portal, the public accreditation check and our sales network.",
    ],
  },
  {
    id: "collect",
    title: "What we collect",
    items: [
      "Customers and cardholders: name, contact details, address, date of birth, government ID details where the law or our contract needs them, payment records, and your VIP membership and Stay Points activity.",
      "Sales representatives: identity and contact details, accreditation records, network position, and commission and allowance records.",
      "Website visitors: the name, email address and mobile number you give us before an accreditation check result is shown.",
    ],
  },
  {
    id: "why",
    title: "Why we use it",
    items: [
      "To make and serve contracts, issue and manage VIP cards, and keep your membership and points correct.",
      "To record payments, pay commissions and meet tax, accounting and other legal duties.",
      "To confirm that a seller is accredited, and to prevent fraud and misuse of our services.",
      "To contact you about your contract or your account. We use your details for marketing only if you agreed, and you can withdraw that at any time.",
    ],
  },
  {
    id: "sharing",
    title: "Who sees it",
    paragraphs: [
      "Only authorized AFhomes staff and the sellers who handle your own account see your information, and only what their role needs. We share it with partners such as JA&D, banks, payment channels and government offices only where a contract or the law requires it. We do not sell personal information.",
    ],
  },
  {
    id: "security",
    title: "How we protect it",
    paragraphs: [
      "Access is limited by role. Sensitive identifiers are masked on screen, sensitive actions are recorded in an audit log, and staff are bound by confidentiality. No system is perfectly secure; if a breach affecting you occurs we will notify you and the National Privacy Commission as the law requires.",
    ],
  },
  { id: "keep", title: "How long we keep it" },
  {
    id: "rights",
    title: "Your rights",
    items: [
      "To be informed about how your data is used.",
      "To access the personal data we hold about you.",
      "To correct data that is wrong or out of date.",
      "To block or ask for destruction of your data where it is no longer needed or was processed unlawfully.",
      "To claim damages where you were harmed by unlawful processing.",
      "To receive your data in a common electronic format (data portability) where it applies.",
      "To complain to the National Privacy Commission.",
    ],
  },
  {
    id: "contact",
    title: "Contact our Data Protection Officer",
    paragraphs: [
      `To use your rights or ask a question, email ${PUBLIC_SUPPORT_INFO.email} or call ${PUBLIC_SUPPORT_INFO.phone}. We answer within a reasonable time and may ask you to prove who you are before we release or change data.`,
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [`This policy took effect on ${PRIVACY_EFFECTIVE_DATE}. When we change it we publish the new version on this page with its date.`],
  },
];
