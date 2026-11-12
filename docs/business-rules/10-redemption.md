# AFHomes Platform — Redemption Management Business Rules

> **STATUS: DISABLED.** Redemption is planned but stays disabled in the application until the owner authorizes its build (AGENTS.md section 5; owner rulings R11 and R12, 2026-11-12). This document defines how Redemption must behave once authorized. It does not authorize enabling routes, APIs, navigation, feature flags, or customer submissions.
>
> Single source of truth for the **Redemption Management** module (use of Stay Points).
>
> **Owner ruling R12 (2026-11-12):** rewritten to the signed VIP Grant (Grant §I "And Annual Welcome Gift", §I-A, §V) and the owner's R12 answers. See the amendment at the end.
> VIP Membership and Stay Points: `docs/business-rules/09-vip-membership-and-stay-points.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> Roles and Permissions: `docs/business-rules/01-roles-and-permissions.md`.

---

## 1. Purpose and Scope

This document defines how released Stay Points are used: eligible venues, the points-per-night redemption basis, weekday/weekend and holiday classification, the holiday calendar, bookings, points reservation and consumption, cancellation and no-shows, the link to the Points Activation Date, card transfers, roles, reporting and audit.

Releasing points (tranches, Qualifying Spend, waivers, expiry) belongs to `09-vip-membership-and-stay-points.md`.

Signed customer contracts keep their governing terms. Historical bookings and points movements stay traceable and are never silently rewritten.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles, action permissions, the overriding authority rule.
- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — VIP tiers and contracts.
- `06-vip-card-issuance.md` — VIP Number, Card Claim Date, validity.
- `07-finance-and-payments.md` — Finance verification, receipt references, reversals.
- `09-vip-membership-and-stay-points.md` — Points Activation Date, tranches, balances, Financial Hold.
- `12-audit-logs-and-governance.md` — audit history.

---

## 3. Terminology

- **AFhomes Direct Operations** — establishments operated directly by AFhomes (Grant §I-A). Franchised, licensed and third-party concessionaire establishments are excluded.
- **Overnight venue** — an AFhomes Direct Operation offering overnight stays.
- **Redemption basis (Terms of Use table)** — the Admin-maintained, versioned table stating the points required per night, with effective dates.
- **Weekday/non-holiday night** and **weekend/holiday night** — the night classification that selects the points bucket.
- **Holiday calendar** — the yearly list of holidays kept by Admin or Super Admin.
- **Cut-off** — the venue's configured deadline for cancelling without loss of points.
- **Reserved points** — points set aside for a confirmed booking, not yet consumed.
- **Consumed points** — points finally deducted after the completed stay.
- **No-show** — a confirmed booking where the guest did not arrive, as recorded by authorized staff.
- **Points Activation Date (PAD)** — defined in doc 09 §8.

---

## 4. Approved Business Decisions (owner ruling R12, 2026-11-12)

1. Points pay only for accommodation at AFhomes Direct Operations that offer overnight stays: the AFhomes Smart Wellness Hotel when open, and the AFhomes Hotspring & Ecofarm Resort when open (first-portion opening targeted April 2028). Third-party concessionaires are excluded. No redemption before full payment is acknowledged.
2. Weekday points are used for weekday and non-holiday stays; weekend points for weekend and holiday stays. They never convert.
3. The points-per-night redemption basis is an Admin-maintained, versioned table with effective dates. Each card uses the version in effect on its Card Claim Date (Grant §I). Later changes apply only to cards issued after them.
4. Admin or Super Admin keeps a yearly holiday calendar.
5. Cancellation before the venue's cut-off returns the points to the same bucket. A no-show forfeits them. Cut-off times are part of each venue's configuration.
6. Office or front-desk staff make bookings for now. A customer self-service portal is deferred.
7. A card transfer needs a written request and written management approval. Unused points do not pass to the new holder (Grant §V).
8. The first redemption sets the Points Activation Date if it comes before the second anniversary of the Card Claim Date (doc 09).
9. The build stays disabled until the owner authorizes it.

**Superseded.** The earlier "Seven Approved Redemption Rules" (undated) are replaced as follows: Rule 1 (Admin-configured monetary conversion or service-specific points pricing for any resort service) and Rule 5 (Admin-configured partial retention and no-show policies) are superseded by decisions 1, 3 and 5. Rule 2 (stay date selects the bucket), Rule 3 (staff review), Rule 4 (reserve, then consume after the stay) and Rule 7 (Finance verifies any money portion) are retained as refined below. Rule 6 (Points + Cash) is retained only for accommodation, with the split by whole nights (section 9.3).

---

## 5. Eligible Venues and Use (Grant §I, §I-A)

1. Points settle accommodation charges only, at overnight venues of the AFhomes Direct Operations that are open at the time of the stay.
2. Points are not used for dining, wellness, entrance or other services, and never at concessionaires, even if they use the AFhomes brand.
3. The venue list is configured by Admin or Super Admin with each venue's opening status, so a venue becomes bookable only once open. Additional directly operated venues designated by the company are added the same way (Grant §I-A).
4. Points have no cash value, are never cashed out, and are not sold, bartered or used as collateral (Grant §V).
5. Use is subject to availability and each venue's reservation and check-in protocols (Grant §I).

---

## 6. Eligibility

A booking with points requires all of:

1. full payment acknowledged (Finance-verified Full Settlement, doc 06 §4.3);
2. an Active membership within its Validity Period (doc 06 §4.3);
3. no Membership Financial Hold (doc 09 §17.2);
4. enough available released points in the bucket each night needs (doc 09 §15);
5. an open overnight venue with availability;
6. the card has been claimed (Card Claim Date recorded, doc 06 §4.3).

Unreleased, Non-Activated or forfeited tranches are never usable. Points cannot be redeemed before the card is claimed, even by a fully paid cardholder (owner follow-up ruling, 2026-11-12; doc 09 §21).

---

## 7. Weekday/Weekend Buckets and Holidays

1. Each night of a stay is classified by its own date: weekday/non-holiday nights use weekday points; weekend nights and holiday nights use weekend points. The booking date does not matter.
2. A stay crossing both kinds of night draws each night from its own bucket.
3. Buckets never convert. A shortfall in one bucket cannot be covered from the other.
4. Which nights of the week are weekend nights is set in the Terms of Use configuration by Admin or Super Admin; no default is assumed here.
5. Admin or Super Admin keeps the yearly holiday calendar. A date listed as a holiday is a holiday night. Calendar changes are versioned and do not reprice confirmed bookings.

---

## 8. Redemption Basis (Terms of Use table)

1. Admin or Super Admin maintains the points-per-night table: venue, room type or category where applicable, night classification (weekday/non-holiday or weekend/holiday), points per night, version, and effective date.
2. Each card uses the version in effect on its Card Claim Date for its whole validity. A later version applies only to cards whose Card Claim Date is on or after its effective date (Grant §I: "applies only to VIP Privilege Cards issued after such adjustment").
3. Versions are never edited in place or deleted; a change is a new version.
4. The points value of each booking (version used, nights, points per night) is stored on the booking.
5. No points values are set in this document; they are configured by Admin or Super Admin.

---

## 9. Booking Workflow

### 9.1 Steps

1. Authorized office or front-desk staff record the booking request for the cardholder: VIP Number, venue, dates, room type, guests.
2. Staff check eligibility (section 6), night classification (section 7), the card's redemption basis version (section 8) and availability.
3. If this is the first redemption and the PAD is not yet set, the PAD rules apply (section 11).
4. On confirmation the required points are Reserved in each bucket. Reserved points cannot be used for another booking.
5. After the completed stay, staff record completion and the Reserved points become Consumed.

A booking request does not consume points. Confirmation is not consumption. Completion is recorded once; repeated actions never move points twice.

### 9.2 Who books

Bookings are an action permission (R4 item 6). Front-desk or office staff holding the Bookings operation permission make bookings. There is no separate approval step. Every booking is audited, and an Administrator (or the Super Administrator) can cancel or correct any booking (owner follow-up ruling, 2026-11-12). Sellers never book, approve or view unrelated members' points.

### 9.3 Points plus money

Points plus cash for a stay is allowed (owner follow-up ruling, 2026-11-12). Where a stay is paid partly in money, the money part follows doc 07: it counts only after Finance (or the Administrator or the Super Administrator) approves the receipt, with a unique reference number. The booking stays Pending Payment until then. A stay is split by whole nights: each night is paid fully in points or fully in money (owner follow-up ruling, 2026-11-12).

---

## 10. Cancellation and No-Show (owner ruling R12 item 5)

1. Each venue's configuration holds its cancellation cut-off, set by Admin or Super Admin.
2. Cancellation before the cut-off returns the Reserved points to the same bucket they came from.
3. A no-show forfeits the Reserved points. Staff record the no-show; it is never assumed from the date passing.
4. Cancellation after the cut-off forfeits the Reserved points, like a no-show (owner follow-up ruling, 2026-11-12). Staff record the late cancellation with its date and time.
5. Points returned on cancellation keep their original tranche and remain subject to forfeiture at card expiry (doc 09 §19).
6. Every cancellation, return and forfeit is a ledger entry with actor, date and reason.

---

## 11. Points Activation Date Link (R12 item 8; Grant §I-B(c))

1. If the PAD is not yet set, the first redemption before the second anniversary of the Card Claim Date sets the PAD on that date. The first redemption is the first stay where points are actually used at check-in; a booking cancelled in time does not count (owner follow-up ruling, 2026-11-12).
2. Tranche 1 is due on the PAD and is released only if the Year 1 condition is met (doc 09 §12). The booking proceeds only if points are then available.
3. If the Year 1 condition is not met at that moment, tranche 1 is not released and is not carried over (owner follow-up ruling, 2026-11-12; doc 09). The booking proceeds only if other released points are available.

---

**Owner follow-up (2026-11-12).** Before the first gift is available, staff may hold a room provisionally under the venue's normal booking rules. This hold reserves no points. At check-in, confirm points use only when the gift qualifies and covers the requested points nights. Record the first actual use and its Points Activation Date together. Cancellation or unsuccessful check-in does not set that date or forfeit points from a provisional request. Redemption remains disabled until separately authorized.

## 12. Card Transfer (R12 item 7; Grant §V)

1. A transfer needs a formal written request from the Primary Cardholder and written management approval. Sellers cannot approve it.
2. The transfer takes effect only after the company's required documents and conditions are met; any transfer fee is set by management. Unapproved transfers are void.
3. The old holder's unused points are forfeited and cannot be used by anyone; they are closed as "not transferred" (doc 09 §18). The new holder gets only future tranches, under the original Grant terms (owner follow-up ruling, 2026-11-12).
4. Confirmed future points bookings of the former holder are cancelled when the transfer takes effect, because the former holder's points are forfeited. Staff inform the former holder before the transfer is finalized (owner follow-up ruling, 2026-11-12).
5. On the cardholder's death, the heirs request a written transfer, which management approves; the same transfer rules apply (owner follow-up ruling, 2026-11-12; Grant §V; doc 09 §18).

---

## 13. Points Ledger Integrity

Every movement (reserve, consume, cancellation return, no-show forfeit, transfer closure) is a ledger entry referencing membership, VIP Number, booking, bucket, tranche, amount, redemption basis version, actor and date (doc 09 §15.2). Prevent over-reservation and double use. Repeated approval, cancellation or completion calls never create duplicate movements. Original records are never overwritten.

---

## 14. Gold Supplementary Cardholder

The Gold Supplementary Cardholder books from the same shared pool as the Primary Cardholder (Gold Grant §I). There is one balance per bucket; the booking records which holder stays.

---

## 15. Historical Memberships

Each membership follows the Grant template it was signed on. Imported balances and bookings are preserved as recorded (doc 09 §20). Do not fabricate historical redemptions or recompute past bookings under a new basis version.

---

## 16. Roles and Permissions

Align with `01-roles-and-permissions.md` and the overriding authority rule (owner, 2026-11-12):

- **Super Administrator and Administrator:** everything, including the Terms of Use table, holiday calendar, venue configuration and cut-offs, exceptions and corrections. Self-approval is allowed and audited.
- **Office or front-desk staff:** bookings, completion and no-show recording, within their action permissions.
- **Finance:** verifies any money part and its refunds.
- **Clerk:** enters only.
- **Sellers:** view only within their record scope; never book or approve.
- **Customers:** self-service portal deferred.

A visible page is never authorization; enforcement must be server-side once built.

---

## 17. Current Feature Status

Redemption and Services code is preserved but hidden and disabled. Do not make Redemption visible, enable routes, APIs, feature flags or customer submissions, or reactivate Services through documentation work. Reactivation needs separate explicit owner authorization and verification of eligibility, balances, basis versions, permissions, Finance integration and existing records.

---

## 18. Reporting

Report: bookings requested, confirmed, completed, cancelled and no-show; points reserved, consumed, returned and forfeited per bucket; nights by venue and night classification; bookings by tier; PADs set by redemption; points plus money bookings and their Finance status; transfers.

Integrity: Reserved is not Consumed; a Pending Payment booking is not Confirmed; the same points are never counted twice; Gold primary and supplementary holders share one balance.

---

## 19. Audit History

Audit: booking creation, confirmation, completion, cancellation, no-show; each points movement; PAD set by redemption; Terms of Use table versions; holiday calendar changes; venue and cut-off changes; transfer requests and approvals; Finance verification references; corrections. Each record keeps actor, timestamp, membership, booking, bucket, amounts, basis version, previous and resulting status, reason and reference. Audit history is never deleted.

---

## 20. Cross-Module Dependencies

| Module | Redemption integration |
|---|---|
| VIP Membership and Stay Points | PAD, released balances, buckets, Financial Hold, forfeiture |
| VIP Card Issuance | VIP Number, Card Claim Date, validity |
| Finance and Payments | Money part verification, refunds, reversals |
| VIP Products and Contracts | Contract template and entitlements |
| Customer Management | Customer identity |
| Roles and Permissions | Action permissions |
| Reports and Analytics | Redemption reporting |
| Audit Logs | Traceability |

---

## 21. Required Business Scenarios

- **A (Weekend night booked on a weekday):** booking made Monday for a Saturday night → weekend points.
- **B (Mixed stay):** Thursday and Friday nights where Friday is a configured weekend night → one night from each bucket.
- **C (Holiday):** a Tuesday listed in the holiday calendar → weekend/holiday points.
- **D (Shortfall in one bucket):** enough weekday but not weekend points for a Saturday → cannot borrow; booking not confirmed with points for that night.
- **E (Basis version):** card claimed 2028-05-01; Admin publishes a new table effective 2029-01-01 → the card keeps the earlier version.
- **F (Concessionaire):** a concessionaire restaurant under the AFhomes brand → points not accepted.
- **G (Not yet paid):** cardholder with a balance → no redemption.
- **H (Cancellation before cut-off):** points returned to the same bucket.
- **I (No-show):** staff record the no-show → reserved points forfeited.
- **J (First redemption):** first booking before the second anniversary of the Card Claim Date → PAD set; tranche 1 release check runs.
- **K (Transfer):** approved transfer with unused points → points not passed to the new holder.
- **L (Duplicate completion):** completion recorded twice → points consumed once.
- **M (Financial Hold):** membership on Financial Hold → no new booking with points.
- **N (Module disabled):** no redemption workflow is reachable in the application until authorized.

These are documentation acceptance examples, not executed tests.

---

## 22. Business Invariants

1. Points pay only for accommodation at open AFhomes Direct Operations overnight venues.
2. No redemption before full payment is acknowledged.
3. Each night's date selects the bucket; buckets never convert.
4. Holidays follow the Admin-kept yearly calendar.
5. Each card uses the redemption basis version in effect on its Card Claim Date.
6. Basis changes apply only to cards issued after them.
7. Cancellation before cut-off returns points to the same bucket; a cancellation after cut-off or a no-show forfeits them.
8. Points are reserved on confirmation and consumed only after the completed stay.
9. No duplicate reservation or consumption.
10. The first redemption sets the PAD if before the second anniversary of the Card Claim Date.
11. Unused points do not pass on a transfer.
12. No cash value and no cash-out.
13. Any money part is verified under doc 07.
14. Redemption stays disabled until the owner authorizes the build.

---

## 23. Outstanding Dependencies and Owner Decisions

Outstanding owner decisions:
- Resolved 2026-11-12: points plus money is split by whole nights; a former holder's future points bookings are cancelled at transfer; a failed Year 1 condition means tranche 1 is not released.

Configured by Admin or Super Admin (no values set here): points per night per venue and room type; which nights are weekend nights; holiday calendar; venue list and opening status; cut-off per venue; transfer fee (management).

Other dependencies: customer self-service portal (deferred); booking inventory and availability source.

---

## 24. Implementation Acceptance Checklist

### Configuration
- [ ] Venue list with opening status; overnight venues only.
- [ ] Versioned points-per-night table with effective dates.
- [ ] Yearly holiday calendar.
- [ ] Cut-off per venue.

### Eligibility
- [ ] Full payment acknowledged.
- [ ] Active membership within validity.
- [ ] No Financial Hold.
- [ ] Sufficient released points per bucket.
- [ ] No redemption before the card is claimed.

### Booking
- [ ] Per-night bucket selection; no conversion.
- [ ] Card's basis version applied and stored.
- [ ] Reserve on confirmation; consume after completion.
- [ ] First redemption sets the PAD.
- [ ] Money part verified under doc 07.

### Cancellation and Transfer
- [ ] Return to same bucket before cut-off.
- [ ] No-show forfeit recorded by staff.
- [ ] Cancellation after the cut-off forfeits the points.
- [ ] Unused points not passed on transfer.

### System
- [ ] Action permissions per doc 01; Admin and Super Admin self-approval audited.
- [ ] Ledger and audit complete.
- [ ] Redemption remains disabled until authorized.

---

## Completion Report

- **File updated:** `docs/business-rules/10-redemption.md` (rewrite 2026-11-12, owner ruling R12).
- **Sources:** signed Grant §I, §I-A, §I-B(c), §V (Silver text lines 51 to 81 and the Bronze and Gold equivalents); owner rulings R10, R11, R12 and the overriding authority rule.
- **Outstanding:** section 23.
- **Change scope:** documentation only. Redemption and Services remain disabled. No application code, database, or Git operation.

---

## Owner rulings amendment (2026-11-12, rounds R10 / R12)

These rulings take precedence over earlier text in this document where they differ.

1. **Scope of use.** Points pay only for accommodation at AFhomes Direct Operations offering overnight stays (the Smart Wellness Hotel when open; the Hotspring & Ecofarm Resort when open, targeted April 2028). Third-party concessionaires are excluded. No redemption before full payment is acknowledged.
2. **Buckets.** Weekday points for weekday and non-holiday stays; weekend points for weekend and holiday stays. They never convert.
3. **Redemption basis.** The points-per-night Terms of Use table is Admin-maintained, versioned and dated. Each card uses the version in effect on its Card Claim Date; later changes apply only to cards issued after them. This supersedes the earlier monetary-conversion and service-specific pricing methods.
4. **Holiday calendar.** Admin or Super Admin keeps a yearly holiday calendar.
5. **Cancellation.** Cancellation before the venue's cut-off returns the points to the same bucket. A no-show forfeits them. Cut-off times are part of each venue's configuration. This supersedes the earlier Admin-configured partial-retention policies.
6. **Bookings.** Office or front-desk staff make bookings for now. A customer self-service portal is deferred.
7. **Transfer.** A card transfer needs a written request and written management approval. Unused points do not pass to the new holder.
8. **Points Activation Date.** The first redemption sets the PAD if it comes before the second anniversary of the Card Claim Date (R10).
9. **Disabled.** The build stays disabled until the owner authorizes it.
10. **Earning model (R10).** Points come only from released Annual Welcome Gift tranches (doc 09). The earlier references to ₱1-per-point earning, a per-transaction 70/30 split, Pending points and Points Hold are withdrawn.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

11. **No redemption before card claim.** Points cannot be redeemed before the card is claimed (section 6; doc 09 §21).
12. **Late cancellation.** Cancelling a points booking after the venue's cut-off forfeits the points, like a no-show (section 10).
13. **Points plus cash.** Points plus cash for a stay is allowed (section 9.3). The split is by whole nights (owner follow-up ruling, 2026-11-12).
18. **Bookings.** Room bookings with points are made by front-desk or office staff with a Bookings operation permission. There is no separate approval step. Every booking is audited, and Admins can cancel or correct any booking (section 9.2).
19. **First redemption.** The redemption that can set the Points Activation Date is the first stay where points are actually used at check-in. A booking cancelled in time does not count (section 11).
20. **Card transfer.** After an approved card transfer, the old holder's unused points are forfeited and cannot be used; the new holder gets only future tranches (section 12).
21. **Death of the cardholder.** The heirs request a written transfer, which management approves; the same transfer rules apply (section 12).
