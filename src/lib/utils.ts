type ClassValue = string | false | null | undefined;

/** Minimal class-name joiner replacing the removed `cn` package. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
