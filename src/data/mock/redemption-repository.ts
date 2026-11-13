import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type {
  BookingInput,
  BookingView,
  MemberPoints,
  RedemptionOverview,
  RedemptionRepository,
  TableVersionInput,
  VenueInput,
} from "@/data/contracts/redemption-repository";
import { isModuleGranted } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";
import type { Membership } from "@/modules/membership/types";
import { REDEMPTION_AUDIT_ACTIONS as ACTIONS } from "@/modules/redemption/audit";
import { cancellationOutcome, checkMembershipEligibility, evaluateFirstRedemption, priceStay, selectTableVersion } from "@/modules/redemption/rules";
import type {
  Holiday,
  PointsBucket,
  PointsTableVersion,
  RedemptionBooking,
  RedemptionLedgerEntry,
  RedemptionState,
  RedemptionVenue,
} from "@/modules/redemption/types";
import { BusinessRepository, customerName, DATE_ONLY, nowIso, today } from "./business-base";
import { availableByBucket, isGiftRelease, trancheAvailable } from "@/modules/stay-points/engine";
import { addYearsToDate } from "@/shared/lib/dates";
import { findReferenceConflict } from "@/modules/finance/rules";
import { engineBackedPointsSource, pointsMovement, type PointsSource } from "./redemption-points-source";
import { hasImportedReceiptReference, hasResortReceiptReference } from "./resort-receipt-reference";
import type { MockStore } from "./seed";
import { isActiveIdentity } from "./scope";
import { recordDueDeemedClaim } from "./card-claim";

const BUCKETS: PointsBucket[] = ["weekday", "weekend"];
const OPEN_STATUSES = ["pending_payment", "confirmed"];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isDate = (value: string) => DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export class MockRedemptionRepository extends BusinessRepository implements RedemptionRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}, private readonly points: PointsSource = engineBackedPointsSource) {
    super(store, getIdentity, asyncOptions);
  }

  private get state(): RedemptionState {
    return this.store.redemption;
  }

  private canView(identity: DevIdentity): boolean {
    return isActiveIdentity(identity) && isModuleGranted(identity, "redemption");
  }

  private nextId(prefix: string): string {
    const id = `${prefix}-${this.state.sequence}`;
    this.state.sequence += 1;
    return id;
  }

  /** Points set aside for open bookings of a membership: reserved minus returned, per bucket. Consumed and forfeited points stay deducted. */
  private deducted(membershipId: string): Record<PointsBucket, number> {
    const result = { weekday: 0, weekend: 0 };
    for (const entry of this.state.ledger) {
      if (entry.membershipId !== membershipId) continue;
      if (entry.type === "reserve") result[entry.bucket] += entry.points;
      if (entry.type === "return") result[entry.bucket] -= entry.points;
    }
    return result;
  }

  private openReserved(membershipId: string): Record<PointsBucket, number> {
    const result = { weekday: 0, weekend: 0 };
    for (const booking of this.state.bookings) {
      if (booking.membershipId === membershipId && !booking.provisional && OPEN_STATUSES.includes(booking.status)) {
        result.weekday += booking.reservedWeekday;
        result.weekend += booking.reservedWeekend;
      }
    }
    return result;
  }

  private available(membership: Membership): Record<PointsBucket, number> {
    if (this.points.ledger) {
      const ledger = this.points.ledger(membership, this.store);
      return ledger ? availableByBucket(ledger) : { weekday: 0, weekend: 0 };
    }
    const gross = this.points.grossSpendable(membership, this.store);
    const deducted = this.deducted(membership.id);
    return { weekday: gross.weekday - deducted.weekday, weekend: gross.weekend - deducted.weekend };
  }

  private entry(booking: RedemptionBooking, type: RedemptionLedgerEntry["type"], bucket: PointsBucket, points: number, actorId: string, reason: string | null, trancheId: string | null = null): void {
    if (points <= 0) return;
    this.state.ledger.push({
      id: this.nextId("rled"), membershipId: booking.membershipId, vipNumber: booking.vipNumber, bookingId: booking.id, type, bucket, points,
      basisVersionId: booking.basisVersionId, trancheId, actorId, at: nowIso(), reason,
    });
  }

  private moveReserved(booking: RedemptionBooking, type: "return" | "consume" | "forfeit", actorId: string, reason: string): void {
    const reservations = this.state.ledger.filter((entry) => entry.bookingId === booking.id && entry.type === "reserve");
    for (const { bucket, points, trancheId } of reservations) this.entry(booking, type, bucket, points, actorId, reason, trancheId);
  }

  private reserve(booking: RedemptionBooking, membership: Membership, actorId: string): void {
    const ledger = this.points.ledger?.(membership, this.store);
    const movement = pointsMovement(this.store, membership.id);
    for (const bucket of BUCKETS) {
      let needed = bucket === "weekday" ? booking.reservedWeekday : booking.reservedWeekend;
      if (!ledger) {
        this.entry(booking, "reserve", bucket, needed, actorId, "Booking confirmed");
        continue;
      }
      for (const release of ledger.entries.filter((entry) => isGiftRelease(entry) && entry.bucket === bucket).sort((a, b) => a.tranche - b.tranche)) {
        const points = Math.min(needed, trancheAvailable(release, ledger.entries, movement));
        this.entry(booking, "reserve", bucket, points, actorId, "Booking confirmed", String(release.tranche));
        needed -= points;
        if (!needed) break;
      }
    }
  }

  private claimDate(membership: Membership): string | null {
    const contract = this.store.contracts.find((item) => item.id === membership.contractId);
    if (contract) recordDueDeemedClaim(this.store, membership, contract);
    return this.points.ledger ? membership.cardClaimDate ?? null : membership.cardClaimDate ?? membership.activationDate;
  }

  private requireBalance(available: Record<PointsBucket, number>, weekday: number, weekend: number): void {
    for (const bucket of BUCKETS) {
      const needed = bucket === "weekday" ? weekday : weekend;
      if (needed > available[bucket]) throw new Error(`Not enough ${bucket} points: ${needed.toLocaleString("en-PH")} needed, ${available[bucket].toLocaleString("en-PH")} available. Points never convert between buckets.`);
    }
  }

  private event(booking: RedemptionBooking, actorId: string, event: string, note: string | null): void {
    booking.history.push({ at: nowIso(), actorId, event, note });
  }

  private view(booking: RedemptionBooking): BookingView {
    const venue = this.state.venues.find((item) => item.id === booking.venueId);
    const membership = this.store.memberships.find((item) => item.id === booking.membershipId);
    return clone({ ...booking, customerName: membership ? customerName(this.store, membership.customerId) : "Unknown customer", venueName: venue?.name ?? booking.venueId });
  }

  private find(bookingId: string): RedemptionBooking {
    const booking = this.state.bookings.find((item) => item.id === bookingId);
    if (!booking) throw new Error("Booking not found.");
    return booking;
  }

  private auditBooking(identity: DevIdentity, booking: RedemptionBooking, action: string, previous: string | null, reason: string | null): void {
    this.audit(identity, { module: "stay-points", action, entityType: "redemption-booking", entityId: booking.id, displayReference: booking.reference, previousValue: previous, newValue: booking.status, reason, relatedRecordIds: [booking.membershipId] });
  }

  async overview(options?: MockAsyncOptions): Promise<RedemptionOverview> {
    return this.run(options, (identity) => {
      if (!this.canView(identity)) throw new Error("You do not have access to Redemption.");
      const members: MemberPoints[] = this.store.memberships
        .filter((membership) => membership.activationDate)
        .map((membership) => {
          const claimDate = this.claimDate(membership);
          const version = claimDate ? selectTableVersion(this.state.tableVersions, claimDate) : null;
          const available = this.available(membership);
          const reserved = this.openReserved(membership.id);
          return {
            membershipId: membership.id,
            customerName: customerName(this.store, membership.customerId),
            productCode: membership.productCode,
            vipNumber: membership.cardId,
            claimDate,
            tableVersion: version?.version ?? null,
            padDate: this.state.pads[membership.id]?.date ?? this.store.stayPoints.deemedPads[membership.id] ?? null,
            weekday: { available: available.weekday, reserved: reserved.weekday },
            weekend: { available: available.weekend, reserved: reserved.weekend },
            blockedReasons: checkMembershipEligibility({ ...membership, cardClaimDate: claimDate }, today(), today()),
          };
        });
      return clone({
        venues: this.state.venues,
        tableVersions: this.state.tableVersions,
        holidays: this.state.holidays,
        bookings: [...this.state.bookings].reverse().map((booking) => this.view(booking)),
        members,
        ledger: [...this.state.ledger].reverse(),
      });
    });
  }

  async createBooking(input: BookingInput, options?: MockAsyncOptions): Promise<BookingView> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", "Only office staff with the Bookings permission can book with points.");
      if (!input.requestId.trim()) throw new Error("A request key is required.");
      const known = this.state.requests[input.requestId];
      if (known) return this.view(this.find(known));

      if (!Number.isInteger(input.guests) || input.guests < 1) throw new Error("Guests must be a whole number of at least 1.");
      if (!isDate(input.checkIn) || !isDate(input.checkOut)) throw new Error("Enter valid check-in and departure dates.");
      if (input.checkOut <= input.checkIn) throw new Error("The departure date must be after the check-in date.");
      if (input.checkIn < today()) throw new Error("The check-in date cannot be in the past.");
      if (!Number.isInteger(input.cashAmountCentavos) || input.cashAmountCentavos < 0) throw new Error("The money part must be a whole number of centavos.");
      if (!input.stayingHolder.trim()) throw new Error("Choose who is staying.");

      const membership = this.store.memberships.find((item) => item.id === input.membershipId);
      if (!membership) throw new Error("Membership not found.");
      const claimDate = this.claimDate(membership);
      const blocked = checkMembershipEligibility({ ...membership, cardClaimDate: claimDate }, input.checkIn, input.checkOut);
      if (blocked.length > 0) throw new Error(blocked[0]);
      if (!claimDate) throw new Error("The card has not been claimed.");

      const venue = this.state.venues.find((item) => item.id === input.venueId);
      if (!venue) throw new Error("Venue not found.");
      if (venue.status !== "open") throw new Error("This venue is not open yet.");

      const version = selectTableVersion(this.state.tableVersions, claimDate);
      if (!version) throw new Error("No points table covers this card's Card Claim Date.");
      const holidays = new Set(this.state.holidays.filter((item) => !item.removed).map((item) => item.date));
      const pricing = priceStay({ version, venueId: venue.id, roomType: input.roomType, checkIn: input.checkIn, checkOut: input.checkOut, holidays, cashNightDates: input.cashNightDates });
      if (pricing.weekdayPoints + pricing.weekendPoints === 0) throw new Error("Pay at least one night with points.");
      if (pricing.cashNights > 0 && input.cashAmountCentavos <= 0) throw new Error("Enter the money part for the nights paid in cash.");
      if (pricing.cashNights === 0 && input.cashAmountCentavos > 0) throw new Error("A money part needs at least one night paid in cash.");

      const available = this.available(membership);
      const padSet = Boolean(this.state.pads[membership.id] || this.store.stayPoints.deemedPads[membership.id]);
      const provisional = Boolean(this.points.ledger && !padSet && !available.weekday && !available.weekend);
      if (!this.points.ledger) {
        const first = evaluateFirstRedemption({ padSet, claimDate, checkIn: input.checkIn, yearOneConditionMet: this.points.yearOneConditionMet(membership, this.store, input.checkIn) });
        if (!first.ok) throw new Error(first.message);
      }
      if (!provisional) this.requireBalance(available, pricing.weekdayPoints, pricing.weekendPoints);

      const sequence = this.state.sequence;
      const booking: RedemptionBooking = {
        id: this.nextId("rbk"),
        reference: `RDM-${String(sequence).padStart(4, "0")}`,
        membershipId: membership.id,
        vipNumber: membership.cardId as string,
        venueId: venue.id,
        roomType: input.roomType,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        stayingHolder: input.stayingHolder.trim(),
        nights: pricing.nights,
        basisVersionId: version.id,
        basisVersion: version.version,
        reservedWeekday: pricing.weekdayPoints,
        reservedWeekend: pricing.weekendPoints,
        ...(provisional ? { provisional } : {}),
        cashNights: pricing.cashNights,
        cashAmountCentavos: input.cashAmountCentavos,
        cashReference: null,
        status: pricing.cashNights > 0 ? "pending_payment" : "confirmed",
        createdBy: identity.id,
        createdAt: nowIso(),
        history: [],
      };
      this.state.bookings.push(booking);
      this.state.requests[input.requestId] = booking.id;
      this.event(booking, identity.id, ACTIONS.BOOKING_CREATED, booking.status === "pending_payment" ? "Pending Payment until Finance approves the money part." : null);
      if (!provisional) this.reserve(booking, membership, identity.id);
      this.auditBooking(identity, booking, ACTIONS.BOOKING_CREATED, null, null);
      return this.view(booking);
    });
  }

  async approveCashPayment(bookingId: string, reference: string, options?: MockAsyncOptions): Promise<BookingView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "Only Finance, the Administrator or the Super Administrator can approve the money part.");
      const booking = this.find(bookingId);
      const ref = reference.trim();
      if (!ref) throw new Error("A receipt reference is required.");
      if (booking.status === "confirmed" && booking.cashReference === ref) return this.view(booking);
      if (booking.status !== "pending_payment") throw new Error("Only a booking in Pending Payment can be approved.");
      if (this.state.bookings.some((item) => item.cashReference?.toLowerCase() === ref.toLowerCase())
        || findReferenceConflict(this.store.payments, ref) || hasResortReceiptReference(this.store, ref) || hasImportedReceiptReference(this.store, ref)) throw new Error("This receipt reference is already used.");
      booking.cashReference = ref;
      booking.status = "confirmed";
      this.event(booking, identity.id, ACTIONS.BOOKING_CONFIRMED, `Money part approved, reference ${ref}.`);
      this.auditBooking(identity, booking, ACTIONS.BOOKING_CONFIRMED, "pending_payment", `Receipt reference ${ref}`);
      return this.view(booking);
    });
  }

  async cancelBooking(bookingId: string, reason: string, cancelledAt?: string, options?: MockAsyncOptions): Promise<BookingView> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", "Only office staff with the Bookings permission can cancel a booking.");
      const booking = this.find(bookingId);
      if (booking.status === "cancelled" || booking.status === "late_cancelled") return this.view(booking);
      if (!OPEN_STATUSES.includes(booking.status)) throw new Error("This booking can no longer be cancelled.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const at = cancelledAt ?? nowIso();
      if (Number.isNaN(Date.parse(at))) throw new Error("Enter a valid cancellation date and time.");
      const venue = this.state.venues.find((item) => item.id === booking.venueId);
      if (!venue) throw new Error("Venue not found.");
      const outcome = booking.provisional ? "return" : cancellationOutcome(venue, booking.checkIn, at);
      const previous = booking.status;
      this.moveReserved(booking, outcome, identity.id, reason.trim());
      booking.status = outcome === "return" ? "cancelled" : "late_cancelled";
      const note = booking.provisional ? "Provisional booking cancelled without moving points."
        : outcome === "return" ? "Cancelled by the cut-off; points returned to the same buckets." : "Cancelled after the cut-off; points forfeited.";
      this.event(booking, identity.id, outcome === "return" ? ACTIONS.BOOKING_CANCELLED : ACTIONS.BOOKING_LATE_CANCELLED, `${note} Recorded ${at}. ${reason.trim()}`);
      this.auditBooking(identity, booking, outcome === "return" ? ACTIONS.BOOKING_CANCELLED : ACTIONS.BOOKING_LATE_CANCELLED, previous, reason.trim());
      return this.view(booking);
    });
  }

  async recordNoShow(bookingId: string, reason: string, options?: MockAsyncOptions): Promise<BookingView> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", "Only office staff with the Bookings permission can record a no-show.");
      const booking = this.find(bookingId);
      if (booking.status === "no_show") return this.view(booking);
      if (booking.status !== "confirmed") throw new Error("Only a confirmed booking can be a no-show.");
      if (today() < booking.checkIn) throw new Error("A no-show can be recorded from the check-in date.");
      if (!reason.trim()) throw new Error("A reason is required.");
      this.moveReserved(booking, "forfeit", identity.id, reason.trim());
      booking.status = "no_show";
      this.event(booking, identity.id, ACTIONS.BOOKING_NO_SHOW, booking.provisional ? `No points were reserved. ${reason.trim()}` : `Points forfeited. ${reason.trim()}`);
      this.auditBooking(identity, booking, ACTIONS.BOOKING_NO_SHOW, "confirmed", reason.trim());
      return this.view(booking);
    });
  }

  async completeBooking(bookingId: string, options?: MockAsyncOptions): Promise<BookingView> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", "Only office staff with the Bookings permission can complete a booking.");
      const booking = this.find(bookingId);
      if (booking.status === "completed") return this.view(booking);
      if (booking.status !== "confirmed") throw new Error("Only a confirmed booking can be completed.");
      const membership = this.store.memberships.find((item) => item.id === booking.membershipId);
      if (!membership) throw new Error("Membership not found.");
      const claimDate = this.claimDate(membership);
      if (!claimDate) throw new Error("The card has not been claimed.");
      const actual = this.points.ledger ? today() : booking.checkIn;
      const padSet = Boolean(this.state.pads[membership.id] || this.store.stayPoints.deemedPads[membership.id]);
      const setsPad = !padSet && actual < addYearsToDate(claimDate, 2)!;
      if (!this.points.ledger) {
        if (today() < booking.checkOut) throw new Error("A booking can be completed once the stay has ended.");
        if (!padSet && !this.points.yearOneConditionMet(membership, this.store, actual)) throw new Error("The Year 1 condition is not met.");
      } else {
        if (actual < booking.checkIn || actual >= booking.checkOut) throw new Error("Check-in is available between arrival and departure.");
        const blocked = checkMembershipEligibility({ ...membership, cardClaimDate: claimDate }, actual, booking.checkOut);
        if (blocked.length > 0) throw new Error(blocked[0]);
        if (booking.provisional) {
          if (setsPad) {
            if (!this.points.yearOneConditionMet(membership, this.store, actual)) throw new Error("The Year 1 condition is not met.");
            const contract = this.store.contracts.find((item) => item.id === membership.contractId)!;
            this.requireBalance({ weekday: contract.benefits.weekdayPointsPerCycle, weekend: contract.benefits.weekendPointsPerCycle }, booking.reservedWeekday, booking.reservedWeekend);
          } else {
            this.requireBalance(this.available(membership), booking.reservedWeekday, booking.reservedWeekend);
          }
        }
      }
      if (setsPad) {
        this.state.pads[membership.id] = { date: actual, bookingId: booking.id };
        this.audit(identity, { module: "stay-points", action: ACTIONS.PAD_SET, entityType: "redemption-booking", entityId: booking.id, displayReference: booking.reference, newValue: actual, reason: "First redemption sets the Points Activation Date.", relatedRecordIds: [membership.id] });
      }
      if (booking.provisional) {
        this.reserve(booking, membership, identity.id);
        booking.provisional = false;
      }
      this.moveReserved(booking, "consume", identity.id, "Stay completed");
      booking.status = "completed";
      this.event(booking, identity.id, ACTIONS.BOOKING_COMPLETED, setsPad ? `Points Activation Date set to ${actual}.` : null);
      this.auditBooking(identity, booking, ACTIONS.BOOKING_COMPLETED, "confirmed", null);
      return this.view(booking);
    });
  }

  async cancelFutureBookingsForTransfer(membershipId: string, effectiveDate: string, options?: MockAsyncOptions): Promise<BookingView[]> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", "Only office staff with the Bookings permission can cancel bookings for a transfer.");
      if (!isDate(effectiveDate)) throw new Error("Enter a valid transfer effective date.");
      return this.cancelForTransfer(identity, membershipId, effectiveDate);
    });
  }

  cancelForTransfer(identity: DevIdentity, membershipId: string, effectiveDate: string): BookingView[] {
    const cancelled: BookingView[] = [];
    for (const booking of this.state.bookings) {
      if (booking.membershipId !== membershipId || !OPEN_STATUSES.includes(booking.status) || booking.checkIn < effectiveDate) continue;
      const previous = booking.status;
      this.moveReserved(booking, "forfeit", identity.id, "Card transfer: unused points not transferred");
      booking.status = "transfer_cancelled";
      this.event(booking, identity.id, ACTIONS.BOOKING_TRANSFER_CANCELLED, `Cancelled for a card transfer effective ${effectiveDate}; the former holder's points are forfeited.`);
      this.auditBooking(identity, booking, ACTIONS.BOOKING_TRANSFER_CANCELLED, previous, `Card transfer effective ${effectiveDate}`);
      cancelled.push(this.view(booking));
    }
    return cancelled;
  }

  async publishTableVersion(input: TableVersionInput, options?: MockAsyncOptions): Promise<PointsTableVersion> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.configure", "Only an Administrator can change the points table.");
      if (!isDate(input.effectiveDate)) throw new Error("Enter a valid effective date.");
      const days = [...new Set(input.weekendDays)];
      if (days.length === 0 || days.length === 7 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Choose between one and six weekend nights.");
      if (input.rows.length === 0) throw new Error("Add at least one row.");
      const seen = new Set<string>();
      for (const row of input.rows) {
        if (!this.state.venues.some((venue) => venue.id === row.venueId)) throw new Error("A row names an unknown venue.");
        if (!row.roomType.trim()) throw new Error("Every row needs a room type.");
        if (!Number.isInteger(row.weekdayPoints) || row.weekdayPoints < 1 || !Number.isInteger(row.weekendPoints) || row.weekendPoints < 1) throw new Error("Points per night must be whole numbers of at least 1.");
        const key = `${row.venueId}|${row.roomType.trim().toLowerCase()}`;
        if (seen.has(key)) throw new Error("A venue and room type can appear only once.");
        seen.add(key);
      }
      const latest = this.state.tableVersions.reduce<PointsTableVersion | null>((best, item) => (!best || item.effectiveDate > best.effectiveDate || (item.effectiveDate === best.effectiveDate && item.version > best.version) ? item : best), null);
      // Real versions never apply backwards: later versions affect only cards claimed on or after their date (doc 10 section 8.2).
      if (latest && (input.effectiveDate < latest.effectiveDate || (input.effectiveDate === latest.effectiveDate && !latest.sample))) {
        throw new Error(`The effective date must be later than ${latest.effectiveDate}, the date of the latest version.`);
      }
      const version: PointsTableVersion = {
        id: this.nextId("ptv"),
        version: Math.max(0, ...this.state.tableVersions.map((item) => item.version)) + 1,
        effectiveDate: input.effectiveDate,
        weekendDays: days.sort(),
        rows: input.rows.map((row) => ({ ...row, roomType: row.roomType.trim() })),
        note: input.note?.trim() || null,
        sample: false,
        createdAt: nowIso(),
        createdBy: identity.id,
      };
      this.state.tableVersions.push(version);
      this.audit(identity, { module: "stay-points", action: ACTIONS.TABLE_VERSION_PUBLISHED, entityType: "redemption-config", entityId: version.id, displayReference: `Points table v${version.version}`, previousValue: latest ? `v${latest.version}` : null, newValue: `v${version.version} effective ${version.effectiveDate}` });
      return clone(version);
    });
  }

  async addHoliday(date: string, name: string, options?: MockAsyncOptions): Promise<Holiday> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.configure", "Only an Administrator can change the holiday calendar.");
      if (!isDate(date)) throw new Error("Enter a valid date.");
      if (!name.trim()) throw new Error("A holiday name is required.");
      if (this.state.holidays.some((item) => item.date === date && !item.removed)) throw new Error("This date is already a holiday.");
      const holiday: Holiday = { id: this.nextId("hol"), date, name: name.trim(), removed: false, addedBy: identity.id, addedAt: nowIso() };
      this.state.holidays.push(holiday);
      this.audit(identity, { module: "stay-points", action: ACTIONS.HOLIDAY_ADDED, entityType: "redemption-config", entityId: holiday.id, displayReference: holiday.name, newValue: date });
      return clone(holiday);
    });
  }

  async removeHoliday(holidayId: string, reason: string, options?: MockAsyncOptions): Promise<Holiday> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.configure", "Only an Administrator can change the holiday calendar.");
      const holiday = this.state.holidays.find((item) => item.id === holidayId);
      if (!holiday) throw new Error("Holiday not found.");
      if (!reason.trim()) throw new Error("A reason is required.");
      if (!holiday.removed) {
        holiday.removed = true;
        this.audit(identity, { module: "stay-points", action: ACTIONS.HOLIDAY_REMOVED, entityType: "redemption-config", entityId: holiday.id, displayReference: holiday.name, previousValue: holiday.date, reason: reason.trim() });
      }
      return clone(holiday);
    });
  }

  async saveVenue(input: VenueInput, options?: MockAsyncOptions): Promise<RedemptionVenue> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.configure", "Only an Administrator can change venues.");
      if (!input.name.trim()) throw new Error("A venue name is required.");
      if (!Number.isInteger(input.cutoffHours) || input.cutoffHours < 0) throw new Error("The cut-off must be a whole number of hours, 0 or more.");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.checkInTime)) throw new Error("Enter the check-in time as HH:MM.");
      const existing = input.id ? this.state.venues.find((item) => item.id === input.id) : undefined;
      if (input.id && !existing) throw new Error("Venue not found.");
      const summary = (v: Pick<RedemptionVenue, "status" | "cutoffHours" | "checkInTime">) => `${v.status}, cut-off ${v.cutoffHours}h, check-in ${v.checkInTime}`;
      const previous = existing ? summary(existing) : null;
      const venue: RedemptionVenue = existing ?? { id: this.nextId("venue"), name: "", status: "not_open", cutoffHours: 0, checkInTime: "14:00", sample: false };
      Object.assign(venue, { name: input.name.trim(), status: input.status, cutoffHours: input.cutoffHours, checkInTime: input.checkInTime, sample: false });
      if (!existing) this.state.venues.push(venue);
      this.audit(identity, { module: "stay-points", action: ACTIONS.VENUE_SAVED, entityType: "redemption-config", entityId: venue.id, displayReference: venue.name, previousValue: previous, newValue: summary(venue) });
      return clone(venue);
    });
  }
}
