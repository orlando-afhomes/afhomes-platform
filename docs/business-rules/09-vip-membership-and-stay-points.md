# AFHomes Platform — VIP Membership and Stay Points Business Rules

> Single source of truth for the **VIP Membership lifecycle and the Annual Welcome Gift (Stay Points)** module.
>
> **Owner ruling R10 (2026-11-12):** the points model follows the signed VIP Grant's Annual Welcome Gift (Grant §I "And Annual Welcome Gift", §I-B(c) to (e), §V). The earlier transaction-based Spend-to-Earn model is removed. Sections 1, 3, 4, 6 and 8 to 29 were rewritten on 2026-11-12; see the amendment at the end.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Redemption: `docs/business-rules/10-redemption.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.

---

## 1. Purpose and Scope

This document defines the authoritative VIP Membership lifecycle and Stay Points business rules for AFHomes Platform.

It governs membership activation and validity, the Points Activation Date, the Annual Welcome Gift tranches, measurement periods, Qualifying Spend and its intake, tranche release and non-release, refunds of qualifying bills, the Compassionate Waiver, the weekday/non-holiday and weekend/holiday buckets, the points ledger, Gold Supplementary Cardholder sharing, Membership Financial Hold, card transfer effects on points, expiration and forfeiture, historical contract protection, roles, reporting, and audit.

**Stay Points are a fixed Annual Welcome Gift, not earned per peso.** Each year the cardholder may receive one fixed tranche for their tier. A tranche is released only when the cardholder's Qualifying Spend reaches the tier minimum during that tranche's measurement period. Spending more does not earn more points.

This document does not define how points are used (bookings, points per night, holidays, cancellation). Those belong to `10-redemption.md`.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles, action permissions, the overriding authority rule.
- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — VIP tiers, pricing, contract templates.
- `06-vip-card-issuance.md` — VIP Number, activation, Card Claim Date and validity (§4.3).
- `07-finance-and-payments.md` — Finance verification, receipt references, reversals, Financial Hold.
- `10-redemption.md` — use of released points.
- `12-audit-logs-and-governance.md` — audit history.
- `13-sales-performance-reporting.md` — reporting conventions.

---

## 3. Terminology

- **VIP Membership** — lifecycle separate from customer identity: status, validity, benefits.
- **Full Settlement** — the date of the payment that completes the total purchase price, once Finance has verified it (doc 06 §4.3).
- **Card Claim Date** — the date the cardholder actually claims the card, or the first anniversary of Full Settlement if the card is not claimed within one year (Grant §I-B(a); doc 06 §4.3).
- **Validity Period** — Bronze 7, Silver 12, Gold 22 years from the Card Claim Date.
- **Points Activation Date (PAD)** — the earlier of (i) the date of the cardholder's first Stay Points redemption, or (ii) the second anniversary of the Card Claim Date (Grant §I-B(c)). The PAD anchors the release schedule and the measurement periods.
- **Annual Welcome Gift / Tranche** — one fixed annual allotment of Stay Points for the tier, split into a weekday/non-holiday part and a weekend/holiday part (Grant §I).
- **Measurement Period** — the period in which Qualifying Spend is counted for one tranche (section 9).
- **Qualifying Spend** — the gross pre-discount value of eligible paid transactions at AFhomes Direct Operations (section 10).
- **AFhomes Direct Operations** — establishments operated directly by AFhomes (Grant §I-A). Franchised, licensed and third-party concessionaire establishments are excluded.
- **Released Points** — points of a tranche that has been released; usable for redemption until the card expires.
- **Non-Activated Tranche** — a tranche whose condition was not met and no waiver was granted; it is never released (Grant §I-B(d)(iii)).
- **Unreleased Tranche** — a tranche whose release date has not yet come.
- **Weekday Points / Weekend Points** — the weekday/non-holiday and weekend/holiday buckets. They never convert into each other.
- **Compassionate Waiver** — release of a tranche without the qualifying spend (section 14).
- **Membership Financial Hold** — benefit restriction caused by a reversed or refunded membership-purchase payment (doc 07).

---

## 4. Approved Business Decisions (owner ruling R10, 2026-11-12)

1. The points rule is the signed Grant's Annual Welcome Gift: fixed annual tranches per tier (section 6).
2. A tranche is released only when the cardholder's Qualifying Spend reaches the tier minimum during the measurement period.
3. The release schedule and the measurement periods are anchored to the Points Activation Date, not to membership activation.
4. Missed tranches do not carry over. At card expiry, released unused points and unreleased tranches are forfeited.
5. Qualifying Spend is the gross pre-discount value of eligible paid transactions at AFhomes Direct Operations. VIP membership payments never count.
6. Finance or office staff enter each resort bill with its official receipt number, which is unique system-wide. An automatic resort feed comes later.
7. A refund lowers Qualifying Spend. A tranche not yet released waits until spend qualifies again. A released tranche stays released and is never taken back.
8. The Administrator or the Super Administrator may grant a Compassionate Waiver with a written reason; it is audited.
9. Spend-to-Earn (₱1 = 1 point, proportional earning, a per-transaction weekday/weekend split, rounding, cap restoration) is removed.

**Superseded.** The nine earlier "Approved Business Decisions" of this section (transaction-based Spend-to-Earn, activation-date cycle anchor, Pending points and minimum-spend unlock, per-transaction bucket split, refund Points Hold) are superseded by the owner decision of 2026-11-12. They are not applied to any membership.

---

## 5. VIP Membership Lifecycle

Membership is separate from customer identity. States (use existing repository state names where verified; do not introduce/modify enums): No membership yet; Pending / Not Activated; Active; Expired; Suspended or Cancelled; Membership on Financial Hold.

A customer whose membership expires remains a customer. Preserve the customer record, VIP Number, contract, membership history, Finance history, historical benefits and audit trail. Do not automatically delete or replace expired membership records. Do not invent automatic renewal or extension rules.

### 5.1 Membership Activation Requirements

Preserve existing rules: (1) VIP contract finalized by authorized Admin; (2) full contractual payment completed; (3) the settling receipts are approved by Finance, the Administrator or the Super Administrator (doc 07 §5.2); (4) official membership activation occurs. A Confirmed Sale does not automatically mean Active VIP Membership. A Fully Paid contract does not automatically mean the official activation event occurred. Membership validity begins on the Card Claim Date, or on the first anniversary of full settlement if the card is not claimed within one year (signed Grant §I-B(a); owner ruling R2, 2026-11-12; doc 06 §4.3).

---

## 6. VIP Tier Entitlements

Current signed Grant texts (verified 2026-11-12 against the Bronze, Silver and Gold Grant training texts, clause text only):

| Item | Bronze | Silver | Gold |
|---|---:|---:|---:|
| Standard price | ₱72,000 | ₱240,000 | ₱390,000 |
| Total validity (base + extension) | 7 years (5+2) | 12 years (10+2) | 22 years (20+2) |
| VIP discount | 15% | 20% | 25% |
| Annual Welcome Gift tranches | 5 | 10 | 20 |
| Points per tranche | 10,000 | 20,000 | 25,000 |
| Weekday/non-holiday per tranche | 7,000 | 14,000 | 17,500 |
| Weekend/holiday per tranche | 3,000 | 6,000 | 7,500 |
| Maximum cumulative capacity | 50,000 | 200,000 | 500,000 |
| Minimum Qualifying Spend per measurement period | ₱1,000 | ₱2,000 | ₱3,000 |
| Primary Cardholders | 1 | 1 | 1 |
| Supplementary Cardholders | 0 | 0 | 1 |

Sources: Grant §I (tranche count, size and split), §I-B(c) (release schedule), §I-B(d)(i) (minimum spend). The "Simpleng paliwanag" training notes in the Bronze and Gold texts say "ten annual tranches"; the clause text (Bronze five, Gold twenty) governs.

Gold contract source contains a previously identified pricing inconsistency (₱390,000 vs ₱780,000), now resolved by owner ruling 2026-11-10 (doc 05 item 11), and an earlier Silver version contained unfinished amount wording, now resolved by owner ruling 2026-11-12 (doc 05 item 13, updated contract, Php 240,000). Contracts signed on earlier templates keep their executed text.

---

## 7. Membership Validity

Membership validity begins on the Card Claim Date (doc 06 §4.3, owner ruling R2, 2026-11-12). Duration follows the finalized contract's approved terms: Bronze 7 years, Silver 12 years, Gold 22 years.

Do not confuse membership validity, the Points Activation Date, measurement periods, released balances, and redemption eligibility.

---

## 8. Points Activation Date and Release Schedule (Grant §I-B(c))

1. The PAD is the earlier of: (i) the date of the cardholder's first Stay Points redemption, or (ii) the second anniversary of the Card Claim Date. On the second anniversary the PAD occurs automatically, whether or not any points were redeemed.
2. Tranche 1 is due on the PAD. Each later tranche is due on an anniversary of the PAD: Bronze on the 4 succeeding anniversaries, Silver on 9, Gold on 19.
3. Each due tranche is released only if its activation condition is met (section 12) or a waiver is granted (section 14).
4. No tranche exists beyond the tier count. The two extra validity years do not create extra tranches.
5. Once set, the PAD never changes. It is recorded as a business date in Asia/Manila.
6. The first redemption is the first stay where points are actually used at check-in. A booking cancelled in time does not count (owner follow-up ruling, 2026-11-12).

Contract illustration: card claimed 2027-06-01, no redemption before then → PAD 2029-06-01 at the latest.

---

## 9. Measurement Periods (Grant §I-B(d)(i))

- **Year 1 tranche:** begins on the Full Settlement date and ends on the PAD, capped at 24 months. When the PAD is more than 24 months after Full Settlement, the period is the first 24 months after Full Settlement (literal Grant §I-B(d)(i); owner follow-up ruling, 2026-11-12).
- **Years 2 onward:** the 12 months immediately before the corresponding anniversary of the PAD.
- Spend is assigned to a period by the bill's business date (Asia/Manila). Spend never counts for two periods and never moves between periods.

The deemed PAD (second anniversary of the Card Claim Date) is often more than 24 months after Full Settlement, because the card may be claimed up to one year after settlement. In that case spend dated after the 24th month and before the PAD counts for no period; the Year 1 tranche is still decided on the PAD.

---

## 10. Qualifying Spend (Grant §I-B(d)(ii))

Qualifying Spend is the gross pre-discount value of goods, services and amenity consumptions purchased and paid by the Primary Cardholder at any AFhomes Direct Operation, settled by cash, credit card, debit card or another monetary method.

Includes:
- cash, credit-card and debit-card payments;
- bills after the VIP discount (the gross pre-discount value counts);
- bills after the statutory Senior Citizen (RA 9994) or PWD (RA 10754) discount (the gross pre-discount value counts).

Excludes:
- Stay Points redemptions;
- comped or service-recovery transactions with no monetary settlement;
- third-party concessionaire transactions;
- government-imposed taxes, fees and charges;
- voluntary tips and gratuities;
- VIP membership payments of any kind (reservation fee, down payment, installments, full settlement). A ₱390,000 Gold purchase is not Qualifying Spend.

Spend is cumulative within the measurement period; the minimum need not be reached in one bill. Peso amounts are handled as exact money (AGENTS.md §6; doc 07).

---

## 11. Spending Intake (owner ruling R10 item 4)

1. Finance or office staff enter each resort bill: the VIP Number of the membership, the venue (AFhomes Direct Operation), the bill business date, the official receipt (OR) number, the gross pre-discount amount, and the excluded components.
2. The OR number is required and unique system-wide. A duplicate is blocked.
3. A bill entered by a Clerk counts once Finance, the Administrator or the Super Administrator approves it, like a receipt (Clerk enters only; R4, the overriding authority rule and owner follow-up ruling, 2026-11-12).
4. Corrections are dated, reasoned entries; the original bill is never edited or deleted.
5. An automatic resort feed is a later feature and needs separate authorization.

---

## 12. Tranche Release and Non-Activation (Grant §I-B(d)(i), (iii))

1. On a tranche's due date, the system compares the approved Qualifying Spend of its measurement period with the tier minimum.
2. If the minimum is reached, the full fixed tranche is released: the weekday/non-holiday and weekend/holiday parts go to their buckets (section 6). There is no partial release and no extra release for higher spend.
3. If the minimum is not reached and no waiver is granted, the tranche is Non-Activated. It is not carried over, deferred, refunded in cash, and does not extend the Validity Period. Later tranches stay available on their own condition.
4. Released points stay usable until the Validity Period ends. They do not expire at the next anniversary.
5. A bill entered late but dated inside a measurement period counts for that period. If it completes the minimum for a tranche whose due date has passed, the tranche is released when the bill is approved.

---

## 13. Refunds of Qualifying Bills (owner ruling R10 item 5)

1. A refund or reversal of a resort bill lowers the Qualifying Spend of the period of the original bill. It is a dated reversal entry; the original bill stays in history.
2. A tranche not yet released waits until spend qualifies again within its period.
3. A tranche already released stays released. Its points are never taken back, never held, and never made negative.
4. There is no Points Hold. The former refund Points Hold rule is withdrawn.

---

## 14. Compassionate Waiver (Grant §I-B(d)(iv); owner ruling R10 item 6)

1. The cardholder submits a written request within 60 days after the end of the affected year.
2. Grounds: hospitalization or serious illness of the Primary Cardholder; bona fide residence outside the Philippines for a substantial portion of the year; government travel restrictions or a public health emergency; or other extraordinary circumstances at the company's reasonable discretion. Reasonable documentation is required.
3. The Administrator or the Super Administrator grants or refuses it with a written reason. Both outcomes are audited.
4. A granted waiver releases that year's tranche in the next administrative cycle (Grant wording). The meaning of "next administrative cycle" is configured by Admin or Super Admin.
5. A waiver never creates a tranche beyond the tier count and never extends validity.

---

## 15. Points Balances and Ledger

### 15.1 Balances

Per membership and per bucket (weekday/non-holiday, weekend/holiday):

- **Released** — total released from tranches.
- **Reserved** — set aside for an approved booking (doc 10).
- **Redeemed** — used for completed stays (doc 10).
- **Available** — Released less Reserved and Redeemed.
- **Forfeited** — removed at expiry (section 19), by a no-show or by a late cancellation after the venue's cut-off (doc 10), or on an approved card transfer (section 18).
- **Not transferred** — unused points closed on an approved card transfer (section 18).

Per tranche: number, due date, measurement period, Qualifying Spend, status (Unreleased, Released, Non-Activated, Released by Waiver, Forfeited), and release date.

### 15.2 Ledger

Every points movement is a ledger entry referencing the membership, VIP Number, tranche, bucket, amount, cause (release, waiver release, reservation, redemption, cancellation return, no-show or late-cancellation forfeit, transfer closure, expiry forfeit, import), source document, actor and date. Entries are never overwritten; corrections are separate, reasoned entries. One tranche is released at most once.

---

## 16. Gold Supplementary Cardholder

The Gold Grant provides one Primary Cardholder and one Supplementary Cardholder from the immediate family (spouse, parent, child or sibling). Both draw from the same shared pool; no separate or duplicated Stay Points are issued to the Supplementary Cardholder (Gold Grant §I). The tranche count and size do not change.

The Grant defines Qualifying Spend as spend by the Primary Cardholder. By owner ruling (2026-11-12, follow-ups), the Supplementary Cardholder's own qualifying spend also counts toward the yearly minimum of the shared membership. It is entered against the same VIP Number and counted once.

---

## 17. Membership Status and Financial Hold

### 17.1 Membership Lifecycle

Keep distinct: customer identity, VIP application, finalized contract, Finance-verified payment, Confirmed Sale, Fully Paid, officially activated VIP membership, expired membership, suspended or cancelled membership, and membership on Financial Hold. Use existing repository state names where verified. Do not introduce or modify enums.

### 17.2 Financial Hold

An Active VIP Membership is placed on Financial Hold when a verified membership-purchase payment is reversed or refunded and creates an outstanding contractual balance (doc 07).

During Financial Hold: new benefit usage, including redemption, is restricted; the membership identity, VIP Number, Card Claim Date, PAD and validity schedule stay unchanged; tranche due dates keep running; history stays auditable. Finance reconciliation may restore eligibility. Restoring financial eligibility does not override expiry, cancellation or other restrictions. A tranche falling due during a Financial Hold is not released while the hold lasts. It waits and is released when the hold ends, provided its measurement period still qualifies (or a waiver was granted) and the card is still valid (owner follow-up ruling, 2026-11-12). If the card has expired by then, the tranche is forfeited under section 19.

---

## 18. Card Transfer (Grant §V)

A transfer needs a written request from the Primary Cardholder and written management approval. On an approved transfer, points not yet redeemed stay personal to the original holder and do not pass to the new holder: they are closed on the card as "not transferred" and are forfeited: neither the former holder nor the new holder may use them (owner follow-up ruling, 2026-11-12). The new holder gets only future tranches. Future tranches continue for the new holder under the original Grant terms and the original PAD. The transfer workflow is in doc 10.

On the death of the Primary Cardholder, the Grant permits transfer to one direct legal heir, subject to management approval, inheritance documents and a Successor Customer Acknowledgement Annex. Stay Points already perfected through redemption before death pass to the heir (Grant §V). The heirs request a written transfer, which management approves, and the same transfer rules apply: released but unredeemed points are forfeited and the heir gets only future tranches (owner follow-up ruling, 2026-11-12).

---

## 19. Expiration and Forfeiture (Grant §I-B(e))

1. At the end of the Validity Period, released unused points (both buckets) and every unreleased tranche are forfeited automatically, without compensation, refund or carry-over.
2. A Non-Activated tranche is never released later (section 12), except through a waiver granted within the Grant's terms.
3. The company may, at its discretion, give advance notice of expiry; it is not obliged to. Any reminder schedule is configured by Admin or Super Admin.
4. Expiration never erases history. The membership, VIP Number, tranches and ledger stay traceable.
5. Validity is never extended because points remain unused. No automatic renewal or reinstatement.

### 19.1 Historical Signed Contracts

Each membership follows the Grant template it was signed on. The rules above are the clauses of the current signed templates. A template with different points terms applies only to contracts signed on it. Do not bulk-convert historical memberships, fabricate historical tranches, or reinterpret past releases. If a historical contract's points clause differs, record the difference and follow the signed text.

---

## 20. Historical Points Preservation

Imported memberships (history import, owner ruling R11) carry: Full Settlement date, Card Claim Date, PAD if already set, tranche history (released, non-activated, waived), released, redeemed and forfeited balances per bucket, and supporting references.

Required: preserve verified historical balances and dates; do not fabricate missing receipts or qualifying-spend events; do not re-run tranche decisions already made; avoid duplicate crediting; do not activate inactive memberships; keep adjustments traceable. Inspect existing import documentation and code before asserting that specific import functions exist.

---

## 21. Redemption Integration

This module decides membership eligibility, the PAD, tranche release, balances per bucket, forfeiture and transfer effects. The Redemption module (`10-redemption.md`) decides how released points are used: venues, points per night (Terms of Use), weekday/weekend and holiday classification, bookings, cancellation (with forfeit after the cut-off) and no-shows.

Points cannot be redeemed before the card is claimed (owner follow-up ruling, 2026-11-12). A first redemption before the second anniversary of the Card Claim Date sets the PAD (section 8). Redemption stays disabled in the application until the owner authorizes its build (AGENTS.md section 5). Points have no cash value and are never cashed out.

---

## 22. Roles and Record Visibility

Align with `01-roles-and-permissions.md` and the overriding authority rule (owner, 2026-11-12):

- **Super Administrator and Administrator:** can do everything in this module, including waivers and corrections. They may approve their own entries; the audit history shows the same person entered and approved.
- **Finance:** enters and approves resort bills and refunds; verifies membership payments.
- **Clerk:** enters resort bills; cannot approve.
- **Sellers (SVD, SSM, SM, OST):** view only, within their record scope (SVD, SSM and SM: own and team customers; OST: own customers). They never enter bills, release tranches or adjust points.
- **Customers:** a customer portal is deferred.

Each sensitive action (approve a bill, record a refund, grant a waiver, correct a balance, import) needs its own action permission (R4 item 6).

---

## 23. Reporting

Report: active, expired and Financial-Hold memberships; tier distribution; PAD set by redemption versus deemed; tranches due, released, released by waiver and non-activated per period; Qualifying Spend per measurement period and progress to the minimum; released, reserved, redeemed, available and forfeited points per bucket; waivers requested, granted and refused; refunds of qualifying bills; memberships nearing expiry with unused points; imported historical balances.

Integrity: a tranche's capacity is not a released balance; Non-Activated tranches are not counted as released; reserved points are not redeemed; Gold primary and supplementary holders share one balance and are counted once.

Time dimensions kept separate: Full Settlement, Card Claim Date, PAD, tranche due date, bill date, approval date, release date, redemption date, refund date, expiry date.

---

## 24. Audit Requirements

Audited events: membership activation; Card Claim Date recording (actual or deemed); PAD setting and its cause; bill entry, approval, correction and refund; tranche release, non-activation and waiver release; waiver request, grant or refusal with reason; reservation, redemption, cancellation return, and no-show or late-cancellation forfeit (doc 10); transfer closure; expiry forfeit; Financial Hold and restoration; historical import.

Each record keeps the actor, timestamp, membership and VIP Number, tranche and bucket, previous and resulting values, reason, and supporting reference (OR number, request letter, approval). Never delete or rewrite history to conceal a correction.

---

## 25. Cross-Module Integrations

| Module | Membership/Stay Points integration |
|---|---|
| Customer Management | Canonical customer identity |
| VIP Products and Contracts | Finalized contractual entitlements and tier benefits |
| VIP Card Issuance | VIP Number, Full Settlement, Card Claim Date, validity |
| Finance and Payments | Verified payment, receipt references, reversals, Financial Hold |
| Redemption | Use of released points; first redemption sets the PAD; disabled until authorized |
| Roles and Permissions | Access control and action permissions |
| Sales Performance Reporting | Reporting conventions |
| Audit Logs | Traceability |

---

## 26. Required Business Scenarios

Dates are Asia/Manila business dates.

- **A (Deemed PAD):** Silver card claimed 2027-06-01, no redemption → PAD 2029-06-01. Tranche 1 due 2029-06-01; tranches 2 to 10 due on 2030-06-01 through 2038-06-01.
- **B (PAD by redemption):** Silver, Full Settlement 2027-03-20, claimed 2027-05-02, first redemption 2028-08-10 → PAD 2028-08-10. Year 1 period 2027-03-20 to 2028-08-10; Year 2 period the 12 months before 2029-08-10.
- **C (Bronze qualifies):** bills of ₱400 and ₱600 in the period → ₱1,000 reached; on the due date 10,000 points are released (7,000 weekday, 3,000 weekend).
- **D (Bronze does not qualify):** ₱700 in the period, no waiver → tranche Non-Activated; nothing carries over; next tranche on its own condition.
- **E (Higher spend):** Gold spends ₱50,000 in a period → one tranche of 25,000 (17,500 / 7,500); no extra points.
- **F (Refund before release):** Silver bills ₱2,000, then ₱500 refunded before the due date → spend ₱1,500; tranche waits until spend reaches ₱2,000 again within the period.
- **G (Refund after release):** a bill refunded after its tranche was released → spend record lowered; released points stay.
- **H (Membership payment):** a ₱390,000 Gold payment → no Qualifying Spend.
- **I (Excluded items):** a ₱5,000 bill less 15% VIP discount, plus tax and a tip → Qualifying Spend ₱5,000; tax and tip excluded.
- **J (Waiver):** Gold cardholder hospitalized, written request 30 days after year end, Admin grants with reason → tranche released in the next administrative cycle; audited.
- **K (Gold shared pool):** primary and supplementary holders use one balance; no second tranche.
- **L (Transfer):** approved transfer with 4,000 unused points → those points closed as not transferred and unavailable to the new holder; later tranches continue for the new holder.
- **M (Expiry):** Bronze card expires with 2,500 unused weekend points and no unreleased tranches → 2,500 forfeited; history kept.
- **N (Duplicate OR):** a bill entered with an OR number already used → blocked.

These are documentation acceptance examples, not executed tests.

---

## 27. Business-Rule Invariants

1. Customer creation does not activate VIP Membership.
2. Fully Paid is not automatically official activation.
3. Validity starts on the Card Claim Date.
4. The PAD is the earlier of the first redemption or the second anniversary of the Card Claim Date, and never changes once set.
5. Tranche count, size and bucket split are fixed by tier and the signed Grant.
6. A tranche is released only when the period's Qualifying Spend reaches the tier minimum, or by waiver.
7. No partial tranche and no extra points for higher spend.
8. Missed tranches never carry over.
9. Weekday/non-holiday and weekend/holiday points never convert.
10. VIP membership payments are never Qualifying Spend.
11. OR numbers are unique system-wide.
12. A released tranche is never taken back by a refund.
13. Unused points and unreleased tranches are forfeited at expiry.
14. Unused points do not pass on a transfer.
15. Gold primary and supplementary holders share one pool.
16. Membership Financial Hold restricts new benefit use.
17. Every points movement is a ledger entry and is audited.
18. Signed contracts keep their own terms; no bulk recalculation of historical memberships.
19. No cash value, no cash-out.
20. Redemption stays disabled until separately authorized.

---

## 28. Outstanding Dependencies and Owner Decisions

Owner decisions resolved 2026-11-12 (none outstanding in this document):
- If the Year 1 condition is not met when the first redemption sets the PAD, tranche 1 is not released and is not carried over, following the signed Grant; later tranches keep their own conditions. A bill entered late but dated inside the period still counts (section 12.5), and an Administrator or the Super Administrator can grant a waiver (section 14) (owner ruling A7, 2026-11-12; decisions-and-gaps.md).

Configured by Admin or Super Admin (no value invented here): the meaning of "next administrative cycle" for waivers; expiry reminder schedule; eligible venue list.

Other dependencies: anniversary boundary convention (including 29 February); automatic resort feed (later); membership suspension consequences outside Financial Hold.

Resolved: Non-Standard contracts keep Standard tier benefits (doc 05 §10.2). Settled 2026-11-12 (follow-ups amendment): the Year 1 period when Full Settlement to PAD exceeds 24 months, Gold Supplementary spend, tranches due during a Financial Hold, the approval of Clerk-entered resort bills, and no redemption before card claim.

---

## 29. Implementation Acceptance Criteria

### Membership
- [ ] Activation prerequisites enforced.
- [ ] Validity from the Card Claim Date (actual or deemed).
- [ ] Separate customer, sale, contract and membership identities.
- [ ] Historical signed contract protection.

### Points Activation Date and Schedule
- [ ] PAD = earlier of first redemption or second anniversary of the Card Claim Date.
- [ ] PAD fixed once set.
- [ ] Tranche due dates on the PAD and its anniversaries; correct count per tier (5, 10, 20).
- [ ] Measurement periods computed per section 9; Year 1 capped at the first 24 months after Full Settlement.

### Qualifying Spend
- [ ] Gross pre-discount value counted; exclusions applied.
- [ ] VIP membership payments excluded.
- [ ] OR number required and unique system-wide.
- [ ] Clerk entries need approval; Admin and Super Admin self-approval audited.

### Release
- [ ] Fixed tranche released when the minimum is reached (₱1,000 / ₱2,000 / ₱3,000).
- [ ] Fixed bucket split (7,000/3,000; 14,000/6,000; 17,500/7,500).
- [ ] No partial or extra release; no carry-over.
- [ ] Refund before release delays it; refund after release changes nothing.
- [ ] Waiver release with written reason and audit.

### Balances and Expiry
- [ ] Released, reserved, redeemed, available and forfeited per bucket.
- [ ] No bucket conversion.
- [ ] Forfeiture at expiry; unused points not passed on transfer.
- [ ] Gold shared pool.
- [ ] Financial Hold restricts new use; a tranche due during the hold is released when the hold ends if it still qualifies and the card is valid.
- [ ] Gold Supplementary Cardholder spend counts toward the shared minimum.
- [ ] No redemption before the card is claimed.

### System Integration
- [ ] Consistent with docs 01, 04, 05, 06, 07, 10, 12, 13.
- [ ] Spend-to-Earn engine removed from the rules (`src/modules/stay-points/engine.ts` is on the frontend backlog for rework).
- [ ] Redemption remains disabled until authorized.

---

## Completion Report

- **File updated:** `docs/business-rules/09-vip-membership-and-stay-points.md` (major rewrite 2026-11-12, owner ruling R10).
- **Coverage:** Annual Welcome Gift tranches, Points Activation Date, measurement periods, Qualifying Spend and intake, release and non-activation, refunds, Compassionate Waiver, ledger, Gold sharing, Financial Hold, transfer, expiry.
- **Sources:** signed Bronze, Silver and Gold Grant texts §I, §I-A, §I-B(a) to (e), §V; owner rulings R2, R10, R12 and the overriding authority rule (2026-11-12).
- **Outstanding:** section 28.
- **Change scope:** documentation only. No application code, database, or Git operation.

---

## Owner rulings amendment (2026-11-12, rounds R10 / R12)

These rulings take precedence over earlier text in this document where they differ.

1. **Annual Welcome Gift adopted.** The points rule is the signed Grant's Annual Welcome Gift: Bronze 5 tranches of 10,000 (7,000 weekday / 3,000 weekend), Silver 10 of 20,000 (14,000 / 6,000), Gold 20 of 25,000 (17,500 / 7,500). Values verified against each tier's Grant clause text on 2026-11-12.
2. **Activation condition.** A tranche is released only when Qualifying Spend in its measurement period reaches Bronze ₱1,000, Silver ₱2,000 or Gold ₱3,000 (Grant §I-B(d)(i), verified per tier).
3. **Cycle anchor.** The anchor is the Points Activation Date (earlier of first redemption or the second anniversary of the Card Claim Date). Year 1 runs from Full Settlement to the PAD (at most 24 months); later years are the 12 months before each PAD anniversary. This settles the R2 carry-over; membership activation is no longer the anchor.
4. **No carry-over; forfeiture.** Missed tranches do not carry over. At card expiry, released unused points and unreleased tranches are forfeited.
5. **Qualifying Spend** is the gross pre-discount value of eligible paid transactions at AFhomes Direct Operations, excluding free items, points redemptions, third-party purchases, taxes and tips. VIP membership payments never count.
6. **Intake.** Finance or office staff enter each bill with its OR number, unique system-wide. An automatic resort feed comes later.
7. **Refunds.** A refund lowers Qualifying Spend. An unreleased tranche waits until spend qualifies again; a released tranche is never taken back. The Points Hold rule is withdrawn.
8. **Compassionate Waiver.** Admin or Super Admin may release a tranche without the qualifying spend, with a written reason; audited.
9. **Spend-to-Earn removed.** ₱1 = 1 point, proportional earning, the per-transaction weekday/weekend split, rounding and cap restoration are removed. The earlier section 4 decisions are superseded by this owner decision. The prototype engine `src/modules/stay-points/engine.ts` goes on the frontend backlog for rework.
10. **Redemption link (R12).** The first redemption sets the PAD if it comes before the second anniversary of the Card Claim Date. Unused points do not pass on a card transfer (Grant §V). Redemption rules are in doc 10 and stay disabled until the owner authorizes the build.

## Owner rulings amendment (2026-11-12, follow-ups)

Item numbers are kept as first cited; the master follow-up list is in `docs/implementation/decisions-and-gaps.md`, so numbers may skip or differ from it.

These rulings take precedence over earlier text in this document where they differ.

11. **Gold Supplementary spend (owner ruling).** A Gold Supplementary Cardholder's qualifying spend counts toward the yearly minimum (section 16).
12. **Tranche due during a Financial Hold (owner ruling).** The tranche waits and is released when the hold ends, if it still qualifies and the card is still valid (section 17.2).
13. **No redemption before card claim (owner ruling).** Points cannot be redeemed before the card is claimed (section 21; doc 10).
14. **Year 1 measurement period (resolved from company rules: literal Grant §I-B(d)(i)).** The period begins on Full Settlement and is capped at 24 months, so it covers the first 24 months after Full Settlement when the Points Activation Date is later (section 9).
15. **Resort bill approval (resolved from company rules: receipt approval in doc 07 §5.2 and the overriding authority rule).** Resort bills entered by a Clerk are approved by Finance, the Administrator or the Super Administrator, like receipts (section 11).
19. **First redemption (owner ruling).** The first redemption, which can set the Points Activation Date, is the first stay where points are actually used at check-in. A booking cancelled in time does not count (section 8).
20. **Card transfer (owner ruling).** After an approved card transfer, the old holder's unused points are forfeited and cannot be used; the new holder gets only future tranches (section 18).
21. **Death of the cardholder (owner ruling).** The heirs request a written transfer, which management approves; the same transfer rules apply (section 18).

## Owner ruling amendment (2026-11-13, Promo Points)

These rulings take precedence over earlier text in this document where they differ. They add a separate wallet and change no Grant rule above.

22. **Separate wallet.** Promo Points are separate from the Annual Welcome Gift. They are a different balance, never added to, converted into or mixed with the weekday and weekend Grant points.
23. **Admin-defined promos.** Promo Points exist only under a promo defined by an Administrator or the Super Administrator, with dates (Asia/Manila business dates), earn outlets, an earn rate (pesos spent per point), redeem outlets, and an optional points expiry date.
24. **Earning.** Promo Points are earned on Finance-approved resort bills at a promo's earn outlets, dated within the promo dates. Whole points, rounded down; a bill earns once.
25. **Refunds.** A refund of a bill reverses only that bill's earned Promo Points. Promo Points never change Qualifying Spend, tranche release or any Grant balance (sections 11 to 13 are unchanged).
26. **Uses and no cash value.** Staff record Promo Points uses at the promo's redeem outlets. A use is voidable with a reason and never deleted. Promo Points have no cash value and are never cashed out.
