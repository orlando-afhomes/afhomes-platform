/**
 * Exact money for the Philippine peso. Amounts are integer centavos so no
 * authoritative figure ever passes through floating-point arithmetic
 * (AGENTS.md §6). Multiplication that would not divide exactly is refused
 * because no rounding policy has been approved (owner decision D14).
 */
export type Centavos = number;

export class MoneyError extends Error {}

/** Parses "1,234.50", "1234", "₱1,234.5" into centavos. Returns null for anything else. */
export function parsePesoToCentavos(input: string): Centavos | null {
  const cleaned = input.trim().replace(/^(?:₱|php|PHP)\s*/, "").replace(/,/g, "");
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const pesos = Number(match[1]);
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  return pesos * 100 + cents;
}

export function pesos(amount: number): Centavos {
  if (!Number.isInteger(amount)) throw new MoneyError("Whole pesos only.");
  return amount * 100;
}

const PESO_FORMAT = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

export function formatPeso(centavos: Centavos): string {
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  // Intl is only used on the whole-peso part so no float arithmetic touches the cents.
  return `${sign}${PESO_FORMAT.format(whole).replace(/\.00$/, "")}.${String(cents).padStart(2, "0")}`;
}

export function sumCentavos(values: readonly Centavos[]): Centavos {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * amount × basisPoints / 10,000 (1% = 100 bp). Throws unless the result is a
 * whole number of centavos: rounding is blocked pending an approved policy.
 */
export function applyBasisPoints(amount: Centavos, basisPoints: number): Centavos {
  if (!Number.isInteger(amount) || !Number.isInteger(basisPoints)) throw new MoneyError("Amount and rate must be whole numbers.");
  const product = amount * basisPoints;
  if (product % 10_000 !== 0) {
    throw new MoneyError("This percentage does not produce a whole number of centavos. A rounding policy has not been approved.");
  }
  return product / 10_000;
}

/** Percent text such as "2.5" to basis points (250); null when invalid or beyond two decimals. */
export function parsePercentToBasisPoints(input: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const bp = Number(match[1]) * 100 + (match[2] ? Number(match[2].padEnd(2, "0")) : 0);
  return bp;
}

export function formatBasisPoints(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  return frac === 0 ? `${whole}%` : `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}%`;
}

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Live peso formatting while typing: "10000" becomes "10,000". Keeps digits and
 * the first dot, at most 12 whole digits and 2 decimals, no leading zeros, and a
 * trailing dot so decimals can still be typed. parsePesoToCentavos reads the result.
 */
export function formatMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/\./g, "").slice(0, 12).replace(/^0+(?=\d)/, "");
  if (dot === -1) return groupThousands(whole);
  const decimals = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${groupThousands(whole || "0")}.${decimals}`;
}

/** Live whole-number formatting for points and similar counts: "25000" becomes "25,000". */
export function formatIntegerInput(raw: string): string {
  return groupThousands(raw.replace(/\D/g, "").slice(0, 12).replace(/^0+(?=\d)/, ""));
}

/** Initial text for a peso input from stored centavos: grouped, decimals only when not whole. */
export function centavosToInputText(centavos: Centavos | null | undefined): string {
  if (!centavos) return "";
  const whole = Math.floor(centavos / 100);
  const cents = centavos % 100;
  return `${groupThousands(String(whole))}${cents ? `.${String(cents).padStart(2, "0").replace(/0$/, "")}` : ""}`;
}
