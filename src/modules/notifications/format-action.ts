/** Acronyms that must stay uppercased in a notification action label. */
const ACRONYMS = new Set(["IGP", "RA", "VIP", "AA", "OST", "IST", "DSC", "DRI", "BA", "PA", "PB", "PAD", "CSV", "ID"]);

/**
 * Human label for an audit action code: `COMMISSION_APPROVED` -> "Commission approved".
 * Known acronyms stay uppercase (`IGP_SERIES_ISSUED` -> "IGP series issued");
 * every other word is lowercased so notification rows never shout.
 */
export function formatNotificationAction(action: string): string {
  const words = action
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => (ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : word.toLowerCase()));
  const label = words.join(" ");
  return label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}
