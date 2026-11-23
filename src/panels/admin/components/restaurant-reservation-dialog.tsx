"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { useCreateRestaurantReservation } from "@/data/reservation-queries";
import { useOutlets } from "@/data/settings-queries";
import { MAX_PARTY_SIZE, reservationProblem } from "@/modules/reservations/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { PointsField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { outletItems } from "./outlet-options";

/** Records a table reservation. The restaurant takes reservations only; nothing is paid with points or money here. */
export function RestaurantReservationDialog({ onClose, selected }: { onClose: () => void; selected?: MemberQrHolder }) {
  const create = useCreateRestaurantReservation();
  const outlets = useOutlets();
  const restaurants = (outlets.data ?? []).filter((outlet) => outlet.type === "restaurant" && outlet.status === "active");
  const [venueChoice, setVenueChoice] = useState("");
  const venueId = venueChoice || (restaurants.length === 1 ? restaurants[0].id : "");
  const [guestName, setGuestName] = useState(selected?.holderName ?? "");
  const [contactNumber, setContactNumber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [occasion, setOccasion] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const input = { venueId, membershipId: selected?.membershipId, guestName, contactNumber, date, time, partySize: Number(partySize.replace(/,/g, "")), occasion, note };
    const problem = reservationProblem(input, manilaToday());
    if (problem) return setError(problem);
    try {
      const reservation = await create.mutateAsync(input);
      toast.success(`Reservation ${reservation.reference} recorded.`);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record the reservation.");
    }
  };

  return (
    <FormDialog open title="Restaurant Reservation" description="Reservations only. The restaurant does not accept walk-ins." submitText="Record Reservation" pending={create.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <SelectField label="Restaurant" required value={venueId} placeholder="Choose the restaurant" options={outletItems(restaurants)} onChange={(value) => { setVenueChoice(value); setError(undefined); }} />
      <TextField label="Guest name" required value={guestName} onChange={setGuestName} maxLength={80} />
      <TextField label="Contact number" required value={contactNumber} onChange={setContactNumber} maxLength={30} inputMode="tel" />
      <StandardDateField label="Date" required value={date} onChange={(value) => { setDate(value); setError(undefined); }} />
      <TextField label="Time" required value={time} onChange={(value) => { setTime(value); setError(undefined); }} placeholder="HH:MM, for example 18:30" maxLength={5} hint="Use 24-hour time." />
      <PointsField label="Number of guests" required value={partySize} onChange={(value) => { setPartySize(value); setError(undefined); }} hint={`Up to ${MAX_PARTY_SIZE} guests per reservation.`} />
      <TextField label="Occasion" value={occasion} onChange={setOccasion} maxLength={80} hint="Optional, for example birthday or business dinner." />
      <TextAreaField label="Notes" value={note} onChange={setNote} maxLength={300} />
    </FormDialog>
  );
}
