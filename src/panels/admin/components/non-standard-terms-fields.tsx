"use client";

import type { NonStandardTermsInput } from "@/data/contracts/contract-repository";
import { NON_STANDARD_MAX_MONTHS, nonStandardTermErrors, type BuiltSchedule } from "@/modules/contracts/rules";
import { MoneyField, TextAreaField, TextField } from "@/shared/forms/modern";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";

export type NonStandardTermsText = { price: string; months: string; reason: string };

/** Typed text to repository terms; unreadable numbers become NaN so the shared checks refuse them. */
export function nonStandardTermsFromText(text: NonStandardTermsText): NonStandardTermsInput {
  return {
    priceCentavos: parsePesoToCentavos(text.price) ?? Number.NaN,
    months: text.months.trim() === "" ? Number.NaN : Number(text.months),
    justification: text.reason,
  };
}

/** Field messages for the wizard's Continue check (doc 05 §10.2). */
export function nonStandardTextErrors(text: NonStandardTermsText, reservationCentavos: number) {
  return nonStandardTermErrors(nonStandardTermsFromText(text), reservationCentavos);
}

/**
 * Non-Standard price, number of monthly payments and reason (doc 05 §10.2), with the
 * normal terms of the chosen card level and payment plan shown next to them.
 */
export function NonStandardTermsFields({
  value,
  onChange,
  standard,
  reservationCentavos,
  errors = {},
}: {
  value: NonStandardTermsText;
  onChange: (next: NonStandardTermsText) => void;
  standard: Pick<BuiltSchedule, "priceCentavos" | "schedule">;
  reservationCentavos: number;
  errors?: { price?: string; months?: string; reason?: string };
}) {
  const normalMonths = standard.schedule.filter((line) => line.purpose === "installment").length;
  const reservation = reservationCentavos > 0 ? ` The reservation fee of ${formatPeso(reservationCentavos)} comes first.` : "";
  return (
    <div className="non-standard-terms tw:flex tw:flex-col tw:gap-3">
      <MoneyField label="Total price" required value={value.price} onChange={(price) => onChange({ ...value, price })} hint={`Normal price: ${formatPeso(standard.priceCentavos)}.`} error={errors.price} />
      <TextField
        label={`Number of monthly payments (1 to ${NON_STANDARD_MAX_MONTHS})`}
        required
        inputMode="numeric"
        maxLength={2}
        value={value.months}
        onChange={(months) => onChange({ ...value, months: months.replace(/\D/g, "") })}
        hint={`Normal: ${normalMonths === 0 ? "full payment" : `${normalMonths} monthly payments`}.${reservation} The rest is split into equal monthly payments.`}
        error={errors.months}
      />
      <TextAreaField label="Reason" required value={value.reason} onChange={(reason) => onChange({ ...value, reason })} error={errors.reason} />
    </div>
  );
}
