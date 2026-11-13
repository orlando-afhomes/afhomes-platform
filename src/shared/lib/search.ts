/** True when the search text is empty or appears in any of the given values (case-insensitive). */
export function matchesSearch(search: string, ...values: (string | null | undefined)[]): boolean {
  const term = search.trim().toLowerCase();
  return term === "" || values.some((value) => (value ?? "").toLowerCase().includes(term));
}

/** Builds filter select options: a leading "all" choice followed by each distinct value, sorted. */
export function optionsFrom(allLabel: string, values: (string | null | undefined)[], label: (value: string) => string = (value) => value) {
  const distinct = [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return [{ value: "all", label: allLabel }, ...distinct.map((value) => ({ value, label: label(value) }))];
}
