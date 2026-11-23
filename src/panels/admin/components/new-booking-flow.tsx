"use client";

import { useState } from "react";
import { BedDouble, Trees, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import type { RedemptionOverview } from "@/data/contracts/redemption-repository";
import { useOutlets } from "@/data/settings-queries";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { RedemptionBookingDialog } from "./redemption-booking-dialog";
import { RestaurantReservationDialog } from "./restaurant-reservation-dialog";

type Step = { kind: "choose" } | { kind: "stay"; venueId: string } | { kind: "restaurant" };

const isResort = (name: string) => /resort|villa/i.test(name);

function ChoiceCard({ icon: Icon, title, text, disabled, onClick }: { icon: LucideIcon; title: string; text: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-3 tw:text-left tw:shadow-(--shadow-soft) tw:transition-colors tw:hover:border-primary/40 tw:hover:bg-muted/40 tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:outline-none tw:disabled:cursor-not-allowed tw:disabled:opacity-50">
      <span aria-hidden="true" className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--color-brand-soft) tw:text-primary"><Icon className="tw:size-5" /></span>
      <span className="tw:flex tw:min-w-0 tw:flex-col">
        <strong className="tw:text-sm">{title}</strong>
        <span className="tw:text-xs tw:text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

/**
 * New Booking starts by asking which experience the guest wants: a hotel room, a resort villa or a
 * restaurant table. Stays are paid with Stay Points or cash under doc 10; the restaurant takes
 * reservations only, with no points.
 */
export function NewBookingFlow({ overview, selected, onClose }: { overview: RedemptionOverview; selected?: MemberQrHolder; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const outlets = useOutlets();
  const hasRestaurant = (outlets.data ?? []).some((outlet) => outlet.type === "restaurant" && outlet.status === "active");

  if (step.kind === "stay") return <RedemptionBookingDialog open overview={overview} selected={selected} presetVenueId={step.venueId} onClose={onClose} />;
  if (step.kind === "restaurant") return <RestaurantReservationDialog selected={selected} onClose={onClose} />;
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>Choose what the guest wants to book.</DialogDescription>
        </DialogHeader>
        <div className="tw:flex tw:flex-col tw:gap-3">
          {overview.venues.map((venue) => (
            <ChoiceCard key={venue.id} icon={isResort(venue.name) ? Trees : BedDouble} title={venue.name} disabled={venue.status !== "open"}
              text={venue.status !== "open" ? "Not open yet" : isResort(venue.name) ? "Villa stay, paid with Stay Points or cash" : "Room stay, paid with Stay Points or cash"}
              onClick={() => setStep({ kind: "stay", venueId: venue.id })} />
          ))}
          <ChoiceCard icon={UtensilsCrossed} title="Restaurant table" disabled={!hasRestaurant}
            text={hasRestaurant ? "Reservations only, no walk-ins" : "No restaurant is set up"} onClick={() => setStep({ kind: "restaurant" })} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
