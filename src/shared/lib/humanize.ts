/**
 * Display form of a stored value: "spot_cash" -> "Spot Cash", "commission-approved"
 * -> "Commission Approved", "contractFinalized" -> "Contract Finalized".
 * Words are split on _, -, spaces and camelCase and capitalised. Acronyms and
 * codes (OST, B1, 500bp/360000) are kept as written. Use it for every enum,
 * status, action, type, or id-like value shown to users; never for free text
 * typed by users, names, or reference numbers such as CTR-4.
 */
export function humanize(value: string | null | undefined): string {
  if (value == null) return "";
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => {
      if (/\d/.test(word) || /^[A-Z]{2,}$/.test(word) || /[^A-Za-z']/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
