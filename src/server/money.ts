import type { Centavos } from "@/shared/lib/money";

/**
 * Money crosses the SQL Connect boundary as an Int64 string of whole centavos
 * (123456 for ₱1,234.56). Strings stay exact; floats never touch money.
 */
export function centavosToInt64(value: Centavos): string {
  if (!Number.isSafeInteger(value)) throw new RangeError("Money must be a whole number of centavos within the safe integer range.");
  return String(value);
}

/** Accepts the Int64 wire string (or an already-integer number) and returns centavos. */
export function int64ToCentavos(value: string | number): Centavos {
  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw new RangeError("Money must be a whole number of centavos.");
  const centavos = Number(value);
  if (!Number.isSafeInteger(centavos)) throw new RangeError("Money must be a whole number of centavos within the safe integer range.");
  return centavos;
}
