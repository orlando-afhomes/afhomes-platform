/**
 * Human label for a business record, built from real data instead of its
 * internal id: recordLabel("Contract", "Rafael Domingo", "B1") ->
 * "Contract · Rafael Domingo · B1". Empty parts are skipped. Internal ids
 * (primary/foreign keys such as ctr-1 or pay-2) must never be shown to users.
 */
export function recordLabel(kind: string, ...parts: Array<string | null | undefined>): string {
  return [kind, ...parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part))].join(" · ");
}
