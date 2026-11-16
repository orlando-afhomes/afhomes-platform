/** Acronyms that must stay uppercased in a notification action label. */
const ACRONYMS = new Set(["IGP", "VIP", "AA", "OST", "IST", "CSV", "ID", "OR"]);

/**
 * Company jargon in action codes, swapped for the plain screen words (decision UI19).
 * Longer phrases come first so "compassionate waiver" wins over "waiver".
 */
const PLAIN_WORDS: [RegExp, string][] = [
  [/\bcompassionate waiver\b/g, "gift exception"],
  [/\bwaiver\b/g, "gift exception"],
  [/\bclawback\b/g, "payback"],
  [/\bwritten off\b/g, "not collected"],
  [/\bcontract ra\b/g, "reservation agreement"],
  [/\bra\b/g, "reservation agreement"],
  [/\bigp\b/g, "property (IGP)"],
  [/\bjad\b/g, "JA&D"],
  [/\breconciliation variance\b/g, "spreadsheet difference"],
  [/\breconciliation\b/g, "spreadsheet check"],
  [/\bvariance\b/g, "difference"],
  [/\bsigned off\b/g, "confirmed"],
  [/\bthreshold\b/g, "minimum paid"],
  [/\btranche\b/g, "yearly gift"],
  [/\bdisbursement\b/g, "payment sent"],
  [/\bdisbursed\b/g, "paid out"],
  [/\bdsc\b/g, "closing seller commission"],
  [/\bdri\b/g, "referrer commission"],
  [/\bba\b/g, "basic allowance"],
  [/\bpa\b/g, "performance allowance"],
  [/\bpb\b/g, "performance bonus"],
  [/\bpad\b/g, "points start date"],
  [/\bvip number\b/g, "VIP Number"],
  [/\bnonstandard\b/g, "Non-Standard terms"],
];

/**
 * Human label for an audit action code: `COMMISSION_APPROVED` -> "Commission approved".
 * Company jargon becomes plain words (`COMMISSION_CLAWBACK_RAISED` -> "Commission payback raised"),
 * known acronyms stay uppercase, and every other word is lowercased so rows never shout.
 * The stored code is never changed.
 */
export function formatNotificationAction(action: string): string {
  let label = action.split(/[_\s-]+/).filter(Boolean).join(" ").toLowerCase();
  for (const [pattern, plain] of PLAIN_WORDS) label = label.replace(pattern, plain);
  label = label.replace(/\b[a-z]+\b/g, (word) => (ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : word));
  return label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}
