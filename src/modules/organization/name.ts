// Compound surnames stay together when splitting a stored display name.
const COMPOUND_SURNAME_START = new Set(["Dela", "De", "Del", "Delos", "San", "Sta.", "St."]);

/** Split a stored display name into the editable name fields. */
export function splitDisplayName(displayName: string): { first: string; middle: string; last: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  if (COMPOUND_SURNAME_START.has(parts[1])) {
    return { first: parts[0], middle: "", last: parts.slice(1).join(" ") };
  }
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

/** Build the stored display name from the editable parts. Prefix is a title, not part of the name. */
export function composeDisplayName(input: {
  firstName: string;
  middleName?: string | null;
  noMiddleName?: boolean;
  lastName: string;
  suffix?: string | null;
}): string {
  return [
    input.firstName.trim(),
    input.noMiddleName ? "" : (input.middleName ?? "").trim(),
    input.lastName.trim(),
    (input.suffix ?? "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
}
