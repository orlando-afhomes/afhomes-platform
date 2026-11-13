"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RedemptionOverview } from "@/data/contracts/redemption-repository";
import { useRedemptionConfigAction } from "@/data/redemption-queries";
import type { PointsRow, RedemptionVenue } from "@/modules/redemption/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { CheckboxField, PointsField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const num = (value: string) => Number(value.replace(/,/g, ""));

type Draft = { venueId: string; roomType: string; weekday: string; weekend: string };

/** Publishes a new dated version of the points table; older versions are never edited (doc 10 section 8). */
export function PublishVersionDialog({ open, overview, onClose }: { open: boolean; overview: RedemptionOverview; onClose: () => void }) {
  const act = useRedemptionConfigAction();
  const latest = [...overview.tableVersions].sort((a, b) => b.version - a.version)[0];
  const seed = (rows: PointsRow[]): Draft[] => rows.map((row) => ({ venueId: row.venueId, roomType: row.roomType, weekday: String(row.weekdayPoints), weekend: String(row.weekendPoints) }));
  const [effectiveDate, setEffectiveDate] = useState("");
  const [weekendDays, setWeekendDays] = useState<number[]>(latest?.weekendDays ?? []);
  const [rows, setRows] = useState<Draft[]>(() => seed(latest?.rows ?? []));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const update = (index: number, patch: Partial<Draft>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const close = () => { setError(undefined); onClose(); };
  const submit = async () => {
    setError(undefined);
    try {
      await act.mutateAsync({ action: "publish-version", input: { effectiveDate, weekendDays, note, rows: rows.map((row) => ({ venueId: row.venueId, roomType: row.roomType, weekdayPoints: num(row.weekday), weekendPoints: num(row.weekend) })) } });
      toast.success("New points table version published.");
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };
  return (
    <FormDialog open={open} title="Publish a new points table version" description="A new version applies only to cards claimed on or after its effective date. Earlier versions stay as they are." submitText="Publish version" pending={act.isPending} error={error} onClose={close} onSubmit={() => void submit()}>
      <StandardDateField label="Effective date" required value={effectiveDate} onChange={setEffectiveDate} />
      <fieldset className="tw:flex tw:flex-col tw:gap-2">
        <legend className="tw:text-sm tw:font-medium">Weekend nights</legend>
        {DAYS.map((name, day) => (
          <CheckboxField key={name} label={name} checked={weekendDays.includes(day)} onChange={(checked) => setWeekendDays((current) => (checked ? [...current, day] : current.filter((item) => item !== day)))} />
        ))}
      </fieldset>
      {rows.map((row, index) => (
        <fieldset key={index} className="tw:flex tw:flex-col tw:gap-2 tw:rounded-md tw:border tw:border-border tw:p-3">
          <legend className="tw:px-1 tw:text-sm tw:font-medium">Row {index + 1}</legend>
          <SelectField label="Venue" required value={row.venueId} options={overview.venues.map((venue) => ({ value: venue.id, label: venue.name }))} onChange={(value) => update(index, { venueId: value })} />
          <TextField label="Room type" required value={row.roomType} onChange={(value) => update(index, { roomType: value })} />
          <PointsField label="Weekday points per night" required value={row.weekday} onChange={(value) => update(index, { weekday: value })} />
          <PointsField label="Weekend points per night" required value={row.weekend} onChange={(value) => update(index, { weekend: value })} />
          <Button type="button" variant="outline" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" /> Remove row</Button>
        </fieldset>
      ))}
      <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, { venueId: overview.venues[0]?.id ?? "", roomType: "", weekday: "", weekend: "" }])}><Plus aria-hidden="true" /> Add row</Button>
      <TextAreaField label="Note" value={note} onChange={setNote} />
    </FormDialog>
  );
}

export function HolidayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const act = useRedemptionConfigAction();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const close = () => { setDate(""); setName(""); setError(undefined); onClose(); };
  const submit = async () => {
    try {
      await act.mutateAsync({ action: "add-holiday", date, name });
      toast.success("Holiday added.");
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };
  return (
    <FormDialog open={open} title="Add holiday" description="A holiday night uses weekend points. Confirmed bookings are not repriced." submitText="Add holiday" pending={act.isPending} error={error} onClose={close} onSubmit={() => void submit()}>
      <StandardDateField label="Date" required value={date} onChange={setDate} />
      <TextField label="Name" required value={name} onChange={setName} />
    </FormDialog>
  );
}

export function VenueDialog({ open, venue, onClose }: { open: boolean; venue: RedemptionVenue | null; onClose: () => void }) {
  const act = useRedemptionConfigAction();
  const [name, setName] = useState(venue?.name ?? "");
  const [status, setStatus] = useState<"open" | "not_open">(venue?.status ?? "not_open");
  const [cutoff, setCutoff] = useState(String(venue?.cutoffHours ?? 48));
  const [checkIn, setCheckIn] = useState(venue?.checkInTime ?? "14:00");
  const [error, setError] = useState<string | undefined>();
  const close = () => { setError(undefined); onClose(); };
  const submit = async () => {
    try {
      await act.mutateAsync({ action: "save-venue", input: { id: venue?.id, name, status, cutoffHours: num(cutoff), checkInTime: checkIn } });
      toast.success("Venue saved.");
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };
  return (
    <FormDialog open={open} title={venue ? "Edit venue" : "Add venue"} description="Only open overnight venues of AFhomes Direct Operations can be booked." submitText="Save venue" pending={act.isPending} error={error} onClose={close} onSubmit={() => void submit()}>
      <TextField label="Venue name" required value={name} onChange={setName} />
      <SelectField label="Status" required value={status} options={[{ value: "open", label: "Open" }, { value: "not_open", label: "Not open yet" }]} onChange={(value) => setStatus(value)} />
      <PointsField label="Cancellation cut-off (hours before check-in)" required value={cutoff} onChange={setCutoff} />
      <TextField label="Check-in time (HH:MM)" required value={checkIn} onChange={setCheckIn} />
    </FormDialog>
  );
}
