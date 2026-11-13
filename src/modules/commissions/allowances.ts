import { pesos } from "@/shared/lib/money";

export type AllowanceTerms = {
  baTarget: number;
  paTarget: number;
  pbTarget: number;
  ba: number;
  pa: number;
  pbRateBp: number;
};

export const SHIPPED_ALLOWANCE_TERMS = {
  SM: { baTarget: pesos(200_000), paTarget: pesos(1_000_000), pbTarget: pesos(2_000_000), ba: pesos(15_000), pa: pesos(15_000), pbRateBp: 100 },
  SSM: { baTarget: pesos(600_000), paTarget: pesos(2_000_000), pbTarget: pesos(4_000_000), ba: pesos(25_000), pa: pesos(25_000), pbRateBp: 300 },
  SVD: { baTarget: pesos(1_800_000), paTarget: pesos(5_000_000), pbTarget: pesos(10_000_000), ba: pesos(50_000), pa: pesos(50_000), pbRateBp: 200 },
} satisfies Record<"SM" | "SSM" | "SVD", AllowanceTerms>;

export type AllowanceStretch = {
  days: number;
  teamTcpCentavos: number;
  collectionsCentavos: number;
  assumedCreditCentavos: number;
};

export type AllowanceTotals = { baCentavos: number; paCentavos: number; pbCentavos: number };
export type AllowanceReviewInput = {
  month: string;
  memberId: string;
  qualifying: AllowanceStretch;
  extended: AllowanceStretch;
  withholdingReason?: string;
  workbook: AllowanceTotals | null;
};

export type AllowanceReview = AllowanceReviewInput & {
  id: string;
  memberName: string;
  position: keyof typeof SHIPPED_ALLOWANCE_TERMS;
  result: AllowanceTotals;
  withholdBa: boolean;
  reviewedAt: string;
  reviewedBy: string;
};

// The allowance workbook uses VBA Round(..., 2), with ties going to the even centavo.
function workbookRound(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twice = remainder * BigInt(2);
  return twice > denominator || (twice === denominator && quotient % BigInt(2) !== BigInt(0)) ? quotient + BigInt(1) : quotient;
}

export function calculateAllowances(input: {
  daysInMonth: number;
  terms: AllowanceTerms;
  qualifying: AllowanceStretch;
  extended: AllowanceStretch;
  withholdBa?: boolean;
}): AllowanceTotals {
  const { daysInMonth, terms, qualifying, extended } = input;
  if (!Number.isSafeInteger(daysInMonth) || daysInMonth < 28 || daysInMonth > 31) throw new Error("Enter the month's number of days.");
  if (qualifying.days + extended.days > daysInMonth) throw new Error("The paid days cannot exceed the days in the month.");
  if ([...Object.values(terms), ...Object.values(qualifying), ...Object.values(extended)]
    .some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error("Enter valid nonnegative allowance inputs.");

  const monthDays = BigInt(daysInMonth);
  const stretch = (part: AllowanceStretch) => {
    const days = BigInt(part.days);
    const kpi = BigInt(part.teamTcpCentavos) + BigInt(part.assumedCreditCentavos);
    const collections = BigInt(part.collectionsCentavos) + BigInt(part.assumedCreditCentavos);
    const passes = (target: number) => {
      const proratedTarget = BigInt(target) * days;
      return days > BigInt(0) && kpi * monthDays >= proratedTarget &&
        collections * monthDays * BigInt(5) >= proratedTarget * BigInt(2);
    };
    const collectionBase = workbookRound(collections * BigInt(5), BigInt(2));
    const equivalent = kpi < collectionBase ? kpi : collectionBase;
    return { days, passes, equivalent };
  };
  const qp = stretch(qualifying);
  const ep = stretch(extended);
  const zero = BigInt(0);
  const baDays = qp.days + (ep.passes(terms.baTarget) ? ep.days : zero);
  const paDays = (qp.passes(terms.paTarget) ? qp.days : zero) + (ep.passes(terms.paTarget) ? ep.days : zero);
  const pbBase = (qp.passes(terms.pbTarget) ? qp.equivalent : zero) + (ep.passes(terms.pbTarget) ? ep.equivalent : zero);
  const ba = input.withholdBa ? zero : workbookRound(BigInt(terms.ba) * baDays, monthDays);
  const pa = workbookRound(BigInt(terms.pa) * paDays, monthDays);
  const pb = workbookRound(BigInt(terms.pbRateBp) * pbBase, BigInt(10_000));
  if ([ba, pa, pb].some((value) => value > BigInt(Number.MAX_SAFE_INTEGER))) throw new Error("Allowance exceeds the supported amount.");
  return { baCentavos: Number(ba), paCentavos: Number(pa), pbCentavos: Number(pb) };
}
