"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { RedemptionOverview } from "@/data/contracts/redemption-repository";
import { useCreateRedemptionBooking } from "@/data/redemption-queries";
import { priceStay, selectTableVersion } from "@/modules/redemption/rules";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { CheckboxField, MoneyField, PointsField, StandardDateField, SelectField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { parsePesoToCentavos } from "@/shared/lib/money";

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `req-${Date.now()}-${Math.random()}`);
const fmt = (n: number) => n.toLocaleString("en-PH");

/** Records a points booking for a cardholder (office staff entry, doc 10 section 9). */
export function RedemptionBookingDialog({ open, overview, onClose }: { open: boolean; overview: RedemptionOverview; onClose: () => void }) {
  const create = useCreateRedemptionBooking();
  const [requestId, setRequestId] = useState(newKey);
  const [membershipId, setMembershipId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [roomType, setRoomType] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [holder, setHolder] = useState("Primary cardholder");
  const [cash, setCash] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | undefined>();

  const member = overview.members.find((item) => item.membershipId === membershipId);
  const version = member?.claimDate ? selectTableVersion(overview.tableVersions, member.claimDate) : null;
  const venues = overview.venues.filter((item) => item.status === "open");
  const rooms = version && venueId ? version.rows.filter((row) => row.venueId === venueId).map((row) => row.roomType) : [];

  const holidayDates = new Set(overview.holidays.filter((item) => !item.removed).map((item) => item.date));
  const ready = Boolean(version && venueId && roomType && checkIn && checkOut);
  const price = (cashNightDates: string[]) => {
    try {
      return { value: priceStay({ version: version!, venueId, roomType, checkIn, checkOut, holidays: holidayDates, cashNightDates }), message: null };
    } catch (failure) {
      return { value: null, message: failure instanceof Error ? failure.message : "Check the stay." };
    }
  };
  const pricing = ready ? price(cash) : null;
  const nights = ready ? (price([]).value?.nights ?? []) : [];

  const reset = () => {
    setMembershipId(""); setVenueId(""); setRoomType(""); setCheckIn(""); setCheckOut(""); setGuests("2"); setHolder("Primary cardholder"); setCash([]); setAmount(""); setError(undefined);
    setRequestId(newKey());
  };
  const close = () => { reset(); onClose(); };
  const submit = async () => {
    setError(undefined);
    try {
      const centavos = cash.length > 0 ? parsePesoToCentavos(amount) : 0;
      if (centavos === null) throw new Error("Enter the money part as an amount in pesos.");
      await create.mutateAsync({ requestId, membershipId, venueId, roomType, checkIn, checkOut, guests: Number(guests.replace(/,/g, "")), stayingHolder: holder, cashNightDates: cash, cashAmountCentavos: centavos });
      toast.success("Booking recorded.");
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const eligible = overview.members.filter((item) => item.blockedReasons.length === 0 && item.vipNumber);
  return (
    <FormDialog open={open} title="New booking with points" description="Points never convert between weekday and weekend. Each night is paid fully in points or fully in money." submitText="Record booking" pending={create.isPending} error={error} onClose={close} onSubmit={() => void submit()}>
      <SelectField label="Cardholder" required value={membershipId} placeholder="Choose a card" options={eligible.map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.vipNumber}` }))} onChange={(value) => { setMembershipId(value); setVenueId(""); setRoomType(""); setCash([]); }} hint={member ? `Available: ${fmt(member.weekday.available)} weekday, ${fmt(member.weekend.available)} weekend points.` : undefined} />
      <SelectField label="Venue" required value={venueId} options={venues.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setVenueId(value); setRoomType(""); setCash([]); }} hint="Only open overnight venues of AFhomes Direct Operations are listed." />
      <SelectField label="Room type" required value={roomType} options={rooms.map((item) => ({ value: item, label: item }))} onChange={(value) => { setRoomType(value); setCash([]); }} disabled={!venueId} />
      <StandardDateField label="Check-in" required value={checkIn} onChange={(value) => { setCheckIn(value); setCash([]); }} />
      <StandardDateField label="Departure" required value={checkOut} onChange={(value) => { setCheckOut(value); setCash([]); }} />
      <PointsField label="Guests" required value={guests} onChange={setGuests} />
      <SelectField label="Staying cardholder" required value={holder} options={[{ value: "Primary cardholder", label: "Primary cardholder" }, ...(member?.productCode === "G1" ? [{ value: "Gold supplementary cardholder", label: "Gold supplementary cardholder" }] : [])]} onChange={setHolder} hint="A Gold supplementary cardholder uses the same points balance." />
      {nights.length > 0 ? (
        <fieldset className="tw:flex tw:flex-col tw:gap-2">
          <legend className="tw:text-sm tw:font-medium">Nights paid in money instead of points (optional)</legend>
          {nights.map((night) => (
            <CheckboxField key={night.date} variant="card" label={`${formatDate(night.date)} · ${night.reason === "holiday" ? "Holiday" : night.reason === "weekend" ? "Weekend" : "Weekday"} night · ${fmt(night.points)} points`} checked={cash.includes(night.date)} onChange={(checked) => setCash((current) => (checked ? [...current, night.date] : current.filter((item) => item !== night.date)))} />
          ))}
        </fieldset>
      ) : null}
      {cash.length > 0 ? <MoneyField label="Money part" required value={amount} onChange={setAmount} hint="Held as Pending Payment until Finance approves the receipt." /> : null}
      {pricing?.value ? (
        <p className="tw:rounded-md tw:bg-muted tw:p-3 tw:text-sm" aria-live="polite">
          Points needed: {fmt(pricing.value.weekdayPoints)} weekday and {fmt(pricing.value.weekendPoints)} weekend{pricing.value.cashNights > 0 ? `; ${pricing.value.cashNights} night${pricing.value.cashNights === 1 ? "" : "s"} in money` : ""}. Points table version {version?.version}.
        </p>
      ) : pricing?.message ? (
        <p className="tw:text-sm tw:text-muted-foreground" aria-live="polite">{pricing.message}</p>
      ) : null}
    </FormDialog>
  );
}
