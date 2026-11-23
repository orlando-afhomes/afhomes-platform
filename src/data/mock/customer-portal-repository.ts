import type { CustomerPortalRepository } from "@/data/contracts/customer-portal-repository";
import { currentCardHolders, issueHolderCode } from "./member-qr-repository";
import { visibleMembership } from "./business-effects";
import { membershipPointsLedger } from "./redemption-points-source";
import type { MockStore } from "./seed";
import type { Customer } from "@/modules/customers/types";
import type { Membership } from "@/modules/membership/types";
import type { PortalActivity, PortalContactInput, PortalCustomer, PortalMembership, PortalOverview } from "@/modules/customer-portal/types";
import { promoBalance, promoBalanceByPromo } from "@/modules/promos/rules";
import { validateEmailAddress, validateLandline, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validateProfileImageDataUrl } from "@/shared/forms/validation/image";
import { manilaToday } from "@/shared/lib/dates";

// shortcut: one shared mock customer password; replace with real authentication (Better Auth) when the backend is authorized. Never shown in the UI.
export const MOCK_CUSTOMER_PASSWORD = "Afhomes@2026";

const contactOf = (customer: Customer | undefined, key: "mobileNumber" | "email" | "landline") => customer?.[key]?.trim() ?? "";

/** Browser-scoped customer portal data. No staff lookup, no stored business data. */
export class MockCustomerPortalRepository implements CustomerPortalRepository {
  /** `customerId` is the signed-in mock session, never a URL or form value. */
  constructor(private readonly store: MockStore, private readonly customerId: string | null) {}

  sampleCustomers(): PortalCustomer[] {
    return this.store.customers
      .filter((customer) => customer.email && this.membershipsFor(customer.id).some((membership) => membership.cardId))
      .map((customer) => ({ id: customer.id, displayName: customer.displayName, email: customer.email! }));
  }

  /**
   * The one customer who signs in with this email. The email must belong to exactly one customer record
   * (cardholder or not); only then is that customer checked for a card. Shared emails sign nobody in.
   */
  findCustomerByEmail(email: string): PortalCustomer | undefined {
    const term = email.trim().toLowerCase();
    if (!term) return undefined;
    const owners = this.store.customers.filter((customer) => customer.email?.trim().toLowerCase() === term);
    if (owners.length !== 1) return undefined;
    return this.sampleCustomers().find((customer) => customer.id === owners[0].id);
  }

  /** Mock sign-in: the same message for an unknown email and a wrong password, so neither is revealed. */
  authenticate(email: string, password: string): PortalCustomer | undefined {
    const match = this.findCustomerByEmail(email);
    return match && password === MOCK_CUSTOMER_PASSWORD ? match : undefined;
  }

  private currentCustomer(): Customer {
    if (!this.customerId) throw new Error("Sign in first.");
    const customer = this.store.customers.find((item) => item.id === this.customerId);
    if (!customer) throw new Error("Customer account not found.");
    return customer;
  }

  overview(): PortalOverview {
    const customer = this.currentCustomer();
    const memberships = this.membershipsFor(customer.id);
    const membership = memberships.find((item) => item.status === "active" && item.cardId) ?? memberships.find((item) => item.cardId);
    if (!membership) throw new Error("No VIP membership is linked to this customer.");

    const entries = this.store.promoPoints.filter((entry) => entry.membershipId === membership.id);
    const byPromo = promoBalanceByPromo(entries, manilaToday(), this.store.promos);
    const ledger = membershipPointsLedger(membership, this.store);
    const qr = currentCardHolders(this.store, membership.id).flatMap(({ info }) => {
      const issued = issueHolderCode(this.store, membership.id, info.holder);
      return issued ? [{ holder: issued.holder, holderName: issued.holderName, vipNumber: issued.vipNumber, code: issued.code }] : [];
    });

    return {
      customer: {
        id: customer.id, displayName: customer.displayName, customerNumber: customer.customerNumber ?? null,
        firstName: customer.firstName ?? null, lastName: customer.lastName ?? null,
        mobileNumber: contactOf(customer, "mobileNumber"), email: contactOf(customer, "email"), landline: contactOf(customer, "landline"),
        photoUrl: customer.profilePhoto?.dataUrl ?? null,
      },
      memberships: memberships.map((item) => this.viewMembership(item)),
      membership: this.viewMembership(membership),
      promo: {
        total: promoBalance(entries, manilaToday(), this.store.promos),
        byPromo: [...byPromo].map(([promoId, balance]) => ({
          promoId, promoName: this.store.promos.find((promo) => promo.id === promoId)?.name ?? "Promo Points", balance,
        })),
      },
      stay: ledger ? {
        spendableWeekday: ledger.balances.spendableWeekday,
        spendableWeekend: ledger.balances.spendableWeekend,
        released: ledger.balances.released,
        reserved: ledger.balances.reserved,
        redeemed: ledger.balances.redeemed,
      } : null,
      qr,
      activity: this.activity(membership),
    };
  }

  updateContact(input: PortalContactInput): PortalOverview {
    const customer = this.currentCustomer();
    const mobileNumber = input.mobileNumber.trim();
    const email = input.email.trim();
    const landline = input.landline.trim();
    const error = validateMobileNumber(mobileNumber)
      ?? validateEmailAddress(email)
      ?? validateLandline(landline);
    if (error) throw new Error(error);
    const taken = this.store.customers.some((other) => other.id !== customer.id && other.email?.trim().toLowerCase() === email.toLowerCase());
    if (taken) throw new Error("This email can't be used. Enter a different one.");
    customer.mobileNumber = mobileNumber;
    customer.email = email;
    customer.landline = landline || null;
    return this.overview();
  }

  updateProfilePhoto(photo: { dataUrl: string; fileName: string } | null): PortalOverview {
    const customer = this.currentCustomer();
    if (photo) {
      const error = validateProfileImageDataUrl(photo.dataUrl);
      if (error) throw new Error(error);
      customer.profilePhoto = { dataUrl: photo.dataUrl, fileName: photo.fileName.slice(0, 120) };
    } else {
      customer.profilePhoto = null;
    }
    return this.overview();
  }

  private membershipsFor(customerId: string): Membership[] {
    return this.store.memberships.filter((membership) => membership.customerId === customerId && visibleMembership(this.store, membership));
  }

  private viewMembership(membership: Membership): PortalMembership {
    const product = this.store.products.find((item) => item.code === membership.productCode);
    return {
      id: membership.id,
      productCode: membership.productCode,
      tierName: product?.name ?? membership.productCode,
      cardId: membership.cardId,
      status: membership.status,
      activationDate: membership.activationDate,
      validityEndDate: membership.validityEndDate,
      financialHold: membership.financialHold,
    };
  }

  private activity(membership: Membership): PortalActivity[] {
    const promoName = (id: string) => this.store.promos.find((promo) => promo.id === id)?.name ?? "Promo";
    const outletName = (id?: string) => id ? this.store.outlets.find((outlet) => outlet.id === id)?.name ?? id : null;
    const promo: PortalActivity[] = this.store.promoPoints
      .filter((entry) => entry.membershipId === membership.id)
      .map((entry) => {
        const base = { id: `promo-${entry.id}`, date: entry.date, kind: "promo" as const, reference: entry.sourceBillId ?? entry.rewardName ?? null };
        switch (entry.type) {
          case "earn":
            return { ...base, label: "Promo Points earned", detail: `${promoName(entry.promoId)} · ${outletName(entry.outletId) ?? "Outlet"}`, points: entry.points, direction: "credit" as const };
          case "earn_reversal":
            return { ...base, label: "Promo Points reversed", detail: entry.note ?? promoName(entry.promoId), points: entry.points, direction: "debit" as const };
          case "use":
            return { ...base, label: "Promo Points used", detail: entry.rewardName ?? `${promoName(entry.promoId)} · ${outletName(entry.outletId) ?? "Outlet"}`, points: entry.points, direction: "debit" as const };
          case "use_void":
            return { ...base, label: "Promo Points use voided", detail: entry.note ?? "Returned to your balance", points: entry.points, direction: "credit" as const };
          case "expiry":
            return { ...base, label: "Promo Points expired", detail: promoName(entry.promoId), points: entry.points, direction: "debit" as const };
        }
      });

    const stay: PortalActivity[] = this.store.stayPoints.ledger
      .filter((entry) => entry.membershipId === membership.id)
      .map((entry) => ({
        id: `stay-${entry.tranche}-${entry.bucket}-${entry.type}-${entry.date}`,
        date: entry.date,
        kind: "stay" as const,
        label: entry.type === "release" ? "Annual Welcome Gift released"
          : entry.type === "waiver_release" ? "Welcome Gift released by exception"
            : entry.type === "expiry" ? "Stay Points expired" : "Stay Points closed on transfer",
        detail: `${entry.bucket === "weekday" ? "Weekday" : "Weekend"} · Year ${entry.tranche}`,
        points: entry.points,
        direction: entry.type === "release" || entry.type === "waiver_release" ? "credit" as const : "debit" as const,
        reference: entry.reference,
      }));

    const bills: PortalActivity[] = this.store.resortSpends
      .filter((spend) => spend.membershipId === membership.id && spend.status === "verified")
      .map((spend) => ({
        id: `bill-${spend.id}`, date: spend.date, kind: "bill" as const, label: "Approved bill",
        detail: `${spend.description} · ${outletName(spend.venueId) ?? "AFhomes"}`, points: null, direction: "info" as const,
        reference: spend.verificationRef,
      }));

    const bookings: PortalActivity[] = this.store.redemption.bookings
      .filter((booking) => booking.membershipId === membership.id)
      .map((booking) => ({
        id: `booking-${booking.id}`, date: booking.checkIn, kind: "booking" as const, label: "Stay booking",
        detail: `${booking.roomType} · ${booking.status.replaceAll("_", " ")}`, points: null, direction: "info" as const,
        reference: booking.reference,
      }));

    return [...promo, ...stay, ...bills, ...bookings].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }
}
