/**
 * Official company support and payment details shown on the public seller check and footer.
 * Values copied from the v2 public verification settings (owner decision UI21, 2026-11-16).
 * shortcut: fixed constant; move to an Admin-edited setting when the backend exists.
 */
export type SupportBankAccount = { bankName: string; accountNumber: string; logo: string };

export type PublicSupportInfo = {
  heading: string;
  email: string;
  phone: string;
  /** `tel:` form of the phone number. */
  phoneHref: string;
  bankAccountName: string;
  bankAccounts: SupportBankAccount[];
  chequePayee: string;
  bankReminder: string;
  agentReminder: string;
};

export const PUBLIC_SUPPORT_INFO: PublicSupportInfo = {
  heading: "Customer Support & Payment Inquiries",
  email: "info@afhomes.com.ph",
  phone: "+63 960 431 6867",
  phoneHref: "tel:+639604316867",
  bankAccountName: "AFhomes Hotspring & Ecofarm Resort Corp.",
  bankAccounts: [
    { bankName: "SECURITY BANK", accountNumber: "0000082595577", logo: "/images/banks/security-bank.svg" },
    { bankName: "CHINABANK", accountNumber: "150700006468", logo: "/images/banks/chinabank.svg" },
  ],
  chequePayee: "AFhomes Hotspring & Ecofarm Resort Corp.",
  bankReminder: "Please double-check the provided company bank account details before sending any payment. Thank you!",
  agentReminder: "A friendly reminder: All agents are strictly prohibited from directly collecting payments from buyers.",
};
