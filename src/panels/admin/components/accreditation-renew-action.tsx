"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { isRenewalAllowed, manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";
import { useRenewAccreditation } from "@/data/queries";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { Button } from "@/shared/ui/button";
import { formatDate } from "@/shared/lib/format-date";

function openingMonth(expiryDate: string): string {
  const parts = parseManilaDateOnly(expiryDate);
  if (!parts) return "the expiry month";
  return new Date(Date.UTC(parts.year, parts.month - 1, 1)).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Renewal for an approved seller (doc 03 section 5). Shown to the Administrator and the Super Administrator only.
 * Allowed from the expiry month onward; before that the papers are held, so the button says when it opens.
 * A renewal issues a new AA number; the current number moves into the AA Number History.
 */
export function AccreditationRenewAction({ record, memberName, canRenew }: { record: AccreditationRecord | null; memberName: string; canRenew: boolean }) {
  const renew = useRenewAccreditation();
  const [open, setOpen] = useState(false);

  // Leavers and unapproved records are never renewed (doc 03 section 5.2.2).
  if (!canRenew || !record || record.adminStatus !== "active" || record.endDate || !record.aaNumber || !record.expiryDate) return null;

  const today = manilaToday();
  const allowed = isRenewalAllowed(record.expiryDate, today);

  return (
    <>
      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <Button type="button" size="sm" variant="outline" disabled={!allowed || renew.isPending} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setOpen(true)}>
          <RefreshCw aria-hidden="true" />
          Renew accreditation
        </Button>
        {allowed ? null : (
          <p role="note" className="tw:text-sm tw:text-muted-foreground">
            A renewal is recorded in the expiry month or later. Renewal opens in {openingMonth(record.expiryDate)}; papers received earlier are held.
          </p>
        )}
      </div>
      <ConfirmDialog
        open={open}
        title="Renew accreditation?"
        description={`Renew the accreditation of ${memberName} today? A new AA number is issued for this month and is valid for one year from today. The current number ${record.aaNumber} is kept in the AA Number History, and all sales, team and referrer links carry over.`}
        confirmText="Renew"
        pending={renew.isPending}
        onConfirm={() => {
          void renew.mutateAsync({ recordId: record.id, expectedAaNumber: record.aaNumber ?? undefined }).then(
            (renewed) => {
              setOpen(false);
              toast.success("Accreditation renewed.", { description: `New AA number ${renewed.aaNumber ?? ""}, valid until ${formatDate(renewed.expiryDate)}.` });
            },
            (err: unknown) => {
              setOpen(false);
              toast.error("Renewal failed.", { description: err instanceof Error ? err.message : "Failed to renew accreditation." });
            },
          );
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
