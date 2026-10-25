# AFHomes Platform — Redemption Management Business Rules

> Single source of truth for the **Redemption Management** module.
> VIP Membership and Stay Points: `docs/business-rules/09-vip-membership-and-stay-points.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.

---

## 1. Purpose and Scope

This document defines the authoritative Redemption Management business rules for AFHomes Platform.

It governs redemption request lifecycle, Admin-configurable redemption pricing, Admin-configured cancellation policies, Weekday/Weekend points usage based on actual stay/service date, manual Reservations/Operations approval, points reservation and final consumption, combined Points + Cash processing, Finance verification before mixed-payment booking confirmation, membership and points eligibility, Gold supplementary holder sharing, historical contract protection, historical redemption records, RBAC and privacy, reporting, audit history, and the disabled-module/feature-flag requirements.

**Redemption and Services modules are preserved but hidden and disabled in the planned MongoDB system.** This document specifies how Redemption must behave when authorized for implementation and activation. It does not authorize re-enabling them.

Business rules are the current approved policy and may change through future authorized decisions. Existing signed customer contracts must retain their governing terms unless lawfully amended. Historical transactions must remain traceable. Previously approved bookings must not be silently rewritten. Historical Stay Points transactions must not be erased.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — modular roles and permissions.
- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — VIP tiers, contracts, payment schemes.
- `06-vip-card-issuance.md` — activation and Card ID.
- `07-finance-and-payments.md` — Finance verification, reversals, refunds.
- `09-vip-membership-and-stay-points.md` — membership, points earning, balances, holds.
- `13-sales-performance-reporting.md` — reporting conventions.

---

## 3. Terminology

- **Redemption Request** — customer request to use Stay Points for an eligible service.
- **Reservation/Operations Approval** — manual approval by authorized staff.
- **Reserved Points** — points set aside upon approval; not yet finally consumed.
- **Consumed Points** — points finally deducted after authorized service completion.
- **Weekday/Weekend Points** — separate buckets based on actual stay/service date.
- **Points + Cash** — combined payment arrangement.
- **Pending Payment** — booking state awaiting Finance verification of monetary portion.
- **Financial Hold** — membership benefit restriction due to unresolved contractual financial eligibility.
- **Points Hold** — restriction on held points due to invalidated qualifying spending or reconciliation.

---

## 4. Current Policy and Future Revision Principles

Redemption Management is governed by business policies that may evolve. Every important rule must be distinguishable as Currently Approved, Admin-Configurable, Contract-Governed, Recommended, or Unresolved.

Admin-configurable: redemption pricing method, service-specific points cost, authorized monetary conversion settings, eligible redemption service configuration, approved cancellation and no-show policy settings.

Currently approved structural rules: Reservations/Operations manually approves redemption requests; Finance verifies monetary payments; points are reserved upon approval; final points deduction occurs after actual service completion. These may be revised later but are not automatically editable through an ordinary Admin settings page merely because they are subject to future change.

Future policy changes require preserving policy identity, version/revision, authorized change, effective date, applicable service or membership scope, previous and new policy values, audit history, and relevant historical transaction references. Do not prescribe a specific versioning database schema without checking existing architecture.

No retroactive silent changes: changing an Admin-configured points price or cancellation policy must not silently recalculate completed redemptions or override agreed terms of already approved bookings. The applicable pricing or policy terms used for a booking must remain reconstructable. Where the exact rule for choosing a policy version during request/approval/booking/service lifecycle is not established, identify it as an implementation dependency. Do not invent retroactive repricing behavior.

---

## 5. Seven Approved Redemption Rules

### Rule 1 — Flexible Redemption Pricing

Authorized Admin personnel may configure two redemption pricing methods:

- **Method A — Fixed Monetary Conversion:** Admin configures a monetary redemption conversion rate for an eligible resort service or approved service category. The configured conversion determines the monetary service value covered by redeemed points.
- **Method B — Service-Specific Points Pricing:** Admin assigns a specific points requirement to an eligible resort service. This points price does not necessarily equal the service's regular cash price.

Critical distinction: the established Stay Points earning policy states ₱1 verified eligible resort spending = 1 earned Stay Point. That rule determines how points are earned. It does not automatically determine redemption value. Do not assume 1 Stay Point = ₱1 redemption value. The redemption conversion must follow the applicable Admin-approved pricing configuration.

Pricing restrictions: preserve existing signed contracts; use only eligible services; apply the correct effective pricing policy; preserve the pricing basis associated with an approved transaction; do not invent automatic cash-out functionality; do not invent universal monetary conversion rates; do not automatically change historical redemption values.

### Rule 2 — Actual Stay/Service Date Determines Point Bucket

Redemption must use the applicable Weekday or Weekend points bucket based on the actual scheduled stay or service date. The booking submission date does not determine the bucket.

Example: booking submitted Monday, scheduled accommodation Saturday → Weekend Points required.

Holidays: holiday classification must follow the customer's applicable signed contract and authorized service policy. Do not assume all national/local/special non-working days have identical contractual treatment.

Existing points allocation: Stay Points earning allocates 70% Weekday, 30% Weekend. This earning allocation does not mean customers can freely transfer points between buckets during redemption.

Required safeguards: preserve separate balances; select the correct service-date bucket; check sufficient available points; do not use Pending points; do not use Held points; do not use already Reserved points; do not automatically exchange Weekday and Weekend balances.

Multi-day services: a booking may cover more than one day. If the requested stay spans both Weekday and Weekend dates, the implementation must correctly apply the governing contract and service rules. Do not invent whether a multi-day booking must split the points cost per night or apply a single booking-wide classification. Record that policy as unresolved unless existing documents establish it.

### Rule 3 — Manual Reservations/Operations Approval

Authorized Reservations or Operations personnel manually review and approve Stay Points redemption requests. Redemption approval is not automatic.

Before approval, authorized staff must verify: customer identity; applicable VIP Membership; membership eligibility; contractual benefit eligibility; requested service eligibility; correct Weekday or Weekend points bucket; sufficient spendable points; absence of disqualifying financial or points holds; requested stay or service date; actual availability; applicable service restrictions; correct redemption pricing.

Authority separation: Reservations/Operations controls the redemption approval. Finance controls monetary payment verification. Admin controls authorized commercial configurations. Customer and Sales Network permissions do not automatically provide redemption approval authority.

Rejection: authorized staff may reject or return an ineligible request according to the approved workflow. Preserve reasons and audit history. Do not invent unrestricted manual approval overrides that bypass membership or contractual restrictions.

### Rule 4 — Reserve Points on Approval, Deduct After Service Completion

Stay Points are not finally consumed when the customer submits a redemption request.

Approved lifecycle:

1. Customer submits redemption request.
2. Reservations/Operations reviews eligibility.
3. Reservations/Operations approves redemption.
4. Required Stay Points become Reserved.
5. Reserved points are unavailable for another redemption.
6. Customer completes the approved resort stay or service.
7. Actual service completion is verified through the authorized workflow.
8. Reserved points are finally consumed.
9. The points ledger records the completed redemption.

Reserved Points are not the same as Redeemed/Consumed Points. At approval, available balance decreases by the reserved amount and reserved balance increases; total points are not treated as finally consumed. After verified service completion, the reservation is finalized, consumed points are recorded in redemption history, and the corresponding reserved balance is cleared.

Duplicate protection: the same redemption must not reserve points multiple times, deduct points multiple times, confirm service completion multiple times, or produce duplicate ledger entries.

Pending requests: a request awaiting Reservations approval must not automatically consume points. If tentative availability or points checks are needed before approval, distinguish them from an actual approved reservation. Do not invent automatic points reservation before the required approval event.

### Rule 5 — Admin-Configured Cancellation Policies

Authorized Admin configures the applicable cancellation and no-show rules for eligible resort services. Configurable policy areas: cancellation eligibility; required cancellation notice; reserved-points release conditions; partial point retention where authorized; full point forfeiture where authorized; no-show treatment; service-specific restrictions; applicable exception procedures.

The existence of these possible settings does not establish their numerical values. Do not invent cancellation cutoff times or percentages.

Required behavior when a reservation is cancelled: identify the applicable approved policy; determine the allowed treatment; apply the authorized release, retention, or forfeiture; update Reserved and Available points correctly; preserve the original booking; record the cancellation outcome; preserve the policy version used; maintain audit history.

Authorized exceptions: Reservations/Operations staff may handle exceptions within their granted authority and approved company policy. Do not presume they can override signed contractual restrictions.

No-show handling: no-shows must follow the applicable configured policy. Do not automatically forfeit all points unless the authorized policy requires it.

Policy changes: Admin changes should apply according to the authorized effective-date and applicability rules. Do not silently replace a cancellation policy already governing an approved reservation.

### Rule 6 — Combined Stay Points + Cash

Eligible resort services may be paid using Stay Points + Monetary Payment. The monetary portion may use an approved company payment method.

Example (illustrative, not a fixed conversion): eligible resort service price ₱5,000; applicable points contribution under configured redemption policy ₱3,000 equivalent; remaining monetary payment ₱2,000.

Required business separation: points portion managed through Redemption and Stay Points workflow; monetary portion managed through Finance verification.

Finance authority: only authorized Finance personnel may verify monetary receipt. Reservations personnel cannot treat a cash payment as verified merely because a customer uploaded a receipt.

Required records: service price; applicable redemption pricing method; points requested; points reserved; applicable points valuation; monetary portion due; Finance-verified monetary payment; remaining monetary balance; booking confirmation; actual service completion; final points consumption.

Do not assume that an unverified monetary payment represents received funds. Prevent the same monetary payment from being counted more than once. Prevent the same points from being allocated to several bookings. Do not count redeemed points as new cash receipts. Refunds and reversals of monetary payments must remain distinguishable from points adjustments.

### Rule 7 — Finance Verification Before Mixed-Payment Booking Confirmation

A Points + Cash booking cannot become Confirmed until Finance verifies the required monetary portion.

Approved workflow:

1. Customer submits a Points + Cash booking request.
2. Reservations reviews the service, customer eligibility, points, and availability.
3. Reservations approves the redemption component.
4. The required Stay Points are Reserved.
5. Booking remains Pending Payment.
6. Customer submits the required monetary payment.
7. Finance verifies actual receipt.
8. Reservations confirms the booking, subject to service availability.
9. The customer receives the approved service or accommodation.
10. Once the service is completed and verified, reserved points are finally consumed.

Important distinctions: redemption approval is not booking confirmation; points reservation is not points consumption; payment submission is not Finance verification; Finance verification is not automatically service completion; booking confirmation does not automatically consume reserved points.

Availability: confirmation remains subject to actual service availability. Do not claim that points approval guarantees permanent inventory availability. If a requested service becomes unavailable before Finance verification, the system must support a controlled resolution without silently confirming an unavailable booking. Exact inventory-hold durations or payment deadlines must follow an approved policy. Do not invent deadlines or automatic cancellation timers.

---

## 5. Membership and Points Eligibility

The Redemption module must consume the authoritative VIP Membership rules from `09-vip-membership-and-stay-points.md`.

### 5.1 Membership Eligibility

Consider: Active membership status; applicable membership validity; authorized membership benefits; contract restrictions; Financial Hold; other applicable restrictions. Do not permit point usage that bypasses an active membership restriction.

### 5.2 Financial Hold

If an Active membership enters Financial Hold due to a verified membership-purchase payment reversal and resulting outstanding contractual balance, new benefit usage is restricted. The original membership and VIP Card ID remain preserved.

### 5.3 Points Hold

Points Hold is separate from Membership Financial Hold. Points may be held because a qualifying resort transaction was refunded or reversed. Held points cannot be used for new redemption while the relevant restriction remains. Finance manually reconciles affected points under the existing approved rules. Resolving one hold does not automatically resolve an unrelated hold.

### 5.4 Pending Points

Points earned before satisfying the annual minimum qualifying spend remain Pending. Pending points are not spendable.

### 5.5 Annual Earning Capacity

Unused annual earning allowance is not a spendable points balance. Do not permit redemption of merely potential annual points.

---

## 6. Weekday and Weekend Balance Management

The existing approved points policy separates Weekday and Weekend balances. Earning limits: Bronze 7,000 Weekday / 3,000 Weekend; Silver 14,000 / 6,000; Gold 17,500 / 7,500. These are earning limits, not necessarily the member's current spendable balances. The Redemption module must use the actual current eligible wallet balance for the relevant bucket.

Track separately: Earned points; Pending points; Available points; Reserved points; Held points; Consumed points; Forfeited or expired points. Redeeming points does not restore annual earning capacity. Do not permit unrestricted cross-bucket borrowing.

---

## 7. Redemption Request Lifecycle

Conceptual request states (illustrative business states; inspect repository before defining exact enum names; do not claim these are already implemented): Draft; Submitted; Under Review; Approved; Pending Payment; Confirmed; In Service; Completed; Cancelled; Rejected; No-Show; Exception Review.

Required transitions: submission; eligibility review; approval or rejection; points reservation; pending monetary verification where applicable; booking confirmation; service completion; final points consumption; cancellation and reversal; exceptions and reconciliation.

Preserve a clear separation between Redemption Request Status, Booking/Reservation Status, Points Reservation Status, and Monetary Payment Status. These must not be incorrectly collapsed into one field or state concept.

---

## 8. Service Availability

Approval and booking confirmation must follow actual service availability. Conceptually account for requested service, requested dates, capacity or inventory availability, existing confirmed reservations, applicable service restrictions, and contractual booking priority conditions. Do not invent booking availability or guarantee rooms that have not been confirmed.

If availability changes while a booking is Pending Payment, the system must allow authorized staff to resolve the booking consistently. Potential outcomes may require rescheduling, cancellation, or points release under the applicable policy. Do not automatically select a commercial resolution without authorization. Exact inventory-hold durations or payment deadlines must follow an approved policy. Do not invent deadlines or automatic cancellation timers.

---

## 9. Partial Points and Monetary Settlement

For combined Points + Cash bookings, points and monetary obligations remain linked without being confused. Points: reserved upon approval; protected from double use; consumed after completed service. Monetary portion: recorded according to Finance policies; verified only by Finance; required before booking confirmation. Completion: service completion must reconcile the actual points consumed and relevant monetary payment records. Do not independently rewrite Finance settlements within the Redemption workflow.

If a customer lacks sufficient eligible points, the system may support the normal authorized monetary booking process where applicable. Do not imply that an ineligible points request automatically changes into a confirmed cash booking.

---

## 10. Cancellations, Reversals, and Refunds

### 10.1 Cancellation Before Booking Confirmation

Document the controlled handling of a redemption that has been approved and has reserved points but remains Pending Payment. The applicable cancellation and points-release behavior must follow Admin-configured policies and governing contracts. Do not automatically retain or forfeit points merely because payment is incomplete. Document how unresolved pending monetary payment and reserved points must be reconciled.

### 10.2 Cancellation After Booking Confirmation

If a Confirmed booking is cancelled: (1) determine the applicable cancellation policy; (2) check the authorized cancellation reason and date; (3) determine points restoration or forfeiture; (4) reconcile any monetary payment obligations; (5) preserve booking and payment history; (6) update relevant balances; (7) record the cancellation decision.

Finance interaction: if monetary funds require refund or reversal, Finance controls those financial operations under its approved authority. Reservations approval does not authorize staff to independently reverse verified cash payments.

Points interaction: the points treatment follows the applicable redemption cancellation policy. Do not assume a cash refund necessarily requires identical proportional points restoration. Any mixed-payment refund allocation policy must be separately approved or verified from the governing contract.

### 10.3 Cancellation After Partial Service

A booking may be partially fulfilled. Do not invent universal partial-redemption or partial-refund formulas. Document the need to reconcile actual completed services, reserved points, monetary payments, and contractual cancellation conditions. Use existing official service-pricing policies where available. Flag missing partial-completion rules for future approval.

### 10.4 No-Shows

No-shows must be recorded and handled according to the applicable approved policy. Required business information may include original booking, scheduled service date, no-show determination, applicable cancellation policy, points reserved, points released or forfeited, financial treatment, authorized staff action, audit history. Do not automatically label an unverified absence as a final no-show without an authorized workflow.

---

## 11. Points Reservation and Ledger Integrity

### 11.1 Points Reservation

The Redemption module must not directly treat available points as consumed until the required service-completion event. A reservation must be associated with: customer, membership, redemption request, service, scheduled date, applicable point bucket, reserved amount, applicable pricing configuration, approval identity, reservation timestamp, related booking and payment state. These are conceptual requirements, not a database schema.

Available balance protection: a point reservation must prevent the same points from being used by another booking.

Multiple requests: a customer may have several authorized redemption requests. The system must verify available unreserved points when each new reservation is approved. Prevent over-reservation.

Idempotency: repeated approval, confirmation, cancellation, or completion calls must not cause duplicate point movements.

### 11.2 Final Points Consumption

Reserved points are finally consumed after actual authorized service completion. Preserve: source reservation, original points reservation, actual completed service, final points amount, correct Weekday/Weekend bucket, completion timestamp, authorized completion record, audit history. Do not generate duplicate completed redemption records. Do not silently consume points merely because the booking date has passed. Actual completion or another separately authorized contractual outcome must be established.

### 11.3 Points Restoration and Forfeiture

Reserved points may be released or retained according to applicable policies. Distinguish Release (reserved points return to eligible available balance), Forfeiture (points removed or restricted according to a valid contractual or cancellation provision), Adjustment (authorized reconciliation changes the applicable points treatment), and Hold (points remain temporarily unusable while an issue is under review). These must not be treated as identical operations. Preserve original earning, reservation, and redemption records.

---

## 12. Admin-Configurable Redemption Policies

### 12.1 Redemption Pricing Configuration

Authorized Admin must be able to manage the approved pricing model for eligible services. Conceptual configuration requirements: eligible service reference; redemption pricing method; approved conversion rate when using monetary conversion; service-specific points cost when using fixed points pricing; effective date; availability or eligibility restrictions; applicable contract limitations; configuration status; audit history. Do not invent a database structure or implement settings forms.

Future flexibility: additional redemption pricing methods may be proposed later. Do not permanently restrict the architecture to exactly two methods if the approved business model later changes. However, only the currently authorized methods should be represented as approved today.

### 12.2 Cancellation Policy Configuration

Authorized Admin can configure service-specific cancellation policies. Conceptual configuration may include: applicable service; cancellation eligibility; notice requirements; points-release behavior; authorized points-retention behavior; no-show behavior; exception permissions; policy effective date; status; audit information. Do not invent default numerical values. Do not grant unauthorized staff access to edit company-wide cancellation policy settings.

### 12.3 Configuration Changes and Historical Transactions

Future configuration changes must be controlled: authorized policy changes; clear identification of the active policy; effective dates; historical policy traceability; preservation of existing signed contract rights; protection against silent repricing of approved bookings; audit records of policy changes.

Example: an accommodation previously required 3,000 points; Admin later changes the future service price to 3,500 points. New eligible redemption requests may use the new authorized price according to its effective-date rule. Previously approved bookings must not silently become liable for another 500 points. Any authorized change to an existing booking must follow the applicable contractual and modification workflow.

---

## 13. Gold Supplementary Holders

The updated Gold VIP membership permits one eligible supplementary holder under the applicable contract. Primary and supplementary holders share the same membership's points. They do not receive independent duplicate points balances.

Redemption requirements: verify authorized holder identity; verify membership eligibility; use the shared underlying membership balance; check available unreserved points; preserve correct transaction attribution; prevent duplicate point usage; respect the signed contract's supplementary-holder restrictions. The Gold membership's annual earning cap remains shared. Do not create another annual allowance for the supplementary holder.

---

## 14. Historical Memberships

### 14.1 Preserve Historical Contracts

Existing contracts may contain Card Claim Date rules, separate Points Activation Date rules, historical welcome-gift provisions, different benefit activation timing, contract-specific expiration conditions, different redemption eligibility rules. The newly approved Redemption policy must not automatically override those signed terms.

The applicable signed contract governs the member's rights unless validly amended. Do not bulk-convert historical redemption transactions or balances into the new model. Do not invent historical redemption dates. Do not fabricate points-consumption events. Do not modify historical VIP Card IDs.

### 14.2 Historical Points Balances

If a historical membership already has a verified points balance, preserve that balance and its applicable restrictions. Do not infer that it was earned through the newer ₱1-to-1-point model. The Redemption module must distinguish actual available legacy points from new transaction-based points. Avoid double crediting, duplicate redemption, and unauthorized use.

---

## 15. Roles and Permissions

Reconcile the Redemption workflow with `docs/business-rules/01-roles-and-permissions.md`.

### Customer

May submit eligible redemption requests through the authorized customer-facing workflow when available. May view their permitted redemption records and balances. Cannot approve their own redemption.

### Reservations/Operations

May review and manually approve or reject requests according to assigned authorization. May confirm bookings after required Finance verification. May record service completion and handle authorized cancellation exceptions.

### Finance

Controls verification of monetary payments, monetary refunds, reversals, and applicable financial reconciliations. Finance payment authority must not be confused with normal Reservations approval authority.

### Admin

Controls the explicitly approved redemption pricing and cancellation policy configurations. Admin authority remains subject to existing role and module permissions.

### IST and OST

Access remains subject to established Sales Network and Customer Management privacy rules. Do not automatically grant Sales Network users permission to redeem customer points, approve bookings, or access unrelated member balances.

### Security

A sidebar item or visible page does not establish authorization. Business rules must be enforced through actual server-side and record-level controls in a future authorized implementation.

---

## 16. Current Feature Status

### 16.1 Redemption Module Preservation and Disablement

The planned standalone AFHomes MongoDB system has an explicit architectural decision: Redemption and Services modules must be preserved, but hidden and disabled for now. Do not delete their code or planned functionality. Do not reactivate them through this documentation task.

### 16.2 Required Design Distinction

Document the future intended Redemption business rules separately from current feature availability. The business-rule document can specify how Redemption must behave when authorized for implementation and activation. It does not authorize making Redemption visible in the sidebar, enabling customer redemption submissions, activating Redemption routes, enabling disabled Redemption APIs, turning on redemption feature flags, enabling automatic points consumption, reactivating Services, or modifying the deployment.

### 16.3 Future Reactivation

Reactivation must require a separate explicit authorization and controlled verification of eligibility, balances, pricing, permissions, financial integration, and existing records. Do not assume the current checkout is already the MongoDB implementation. Inspect the actual repository and describe its verified state separately.

---

## 17. Reporting

Document business-level reporting for: submitted redemption requests; requests under review; approved requests; reserved points; pending-payment bookings; confirmed bookings; completed services; final consumed points; cancelled requests; released points; forfeited points; no-shows; Points + Cash transactions; monetary payments verified by Finance; cancellation exceptions; redemption activity by service; redemption activity by VIP tier; Weekday and Weekend consumption; points reconciliation exceptions.

Reporting integrity: do not report Reserved points as finally consumed; do not report unverified cash claims as verified revenue; do not count the same redeemed points multiple times; do not classify a Pending Payment booking as Confirmed; do not assume a Confirmed booking represents a completed service.

---

## 18. Audit History

Document audit requirements for: redemption request creation; submission; eligibility review; approval or rejection; points reservation; monetary payment submission reference; Finance verification reference; booking confirmation; service completion; final points deduction; cancellation; no-show determination; points release; points forfeiture; exception approval; pricing configuration changes; cancellation policy changes; monetary refund/reversal reconciliation; historical corrections.

Audit records should identify: acting user or system; relevant customer and membership; redemption request; service; scheduled date; relevant points bucket; original and resulting amounts; applicable policy version; previous and resulting status; timestamp; reason; supporting reference.

Do not delete audit history when a redemption is cancelled, adjusted, or reversed.

---

## 19. Cross-Module Dependencies

| Module | Redemption integration |
|---|---|
| Customer Management | Customer identity and authorized transactions |
| VIP Membership and Stay Points | Membership eligibility, points balances, holds, buckets |
| VIP Products and Contracts | Contractual entitlements and restrictions |
| Finance and Payments | Monetary verification, refunds, reversals |
| Roles and Permissions | Access control |
| Sales Network | Customer/sales visibility |
| Reports and Analytics | Redemption reporting |
| Audit Logs | Traceability |
| Redemption (this module) | Request lifecycle, reservation, consumption |

---

## 20. Required Business Scenarios

(See Part XV of the task prompt for scenarios A–T; summarized here with expected outcomes.)

- **Scenario A (Weekend booking made on weekday):** Weekend points required; booking date does not determine bucket.
- **Scenario B (Service-specific points pricing):** use applicable approved points cost; do not assume 1 point = ₱1.
- **Scenario C (Monetary conversion pricing):** calculate required points using authorized conversion; preserve applied rate in transaction history.
- **Scenario D (Manual approval):** request awaits authorized Reservations/Operations review; no automatic approval.
- **Scenario E (Points reserved on approval):** 2,000 of 5,000 reserved; 3,000 remain available; no final consumption yet.
- **Scenario F (Completed service):** reserved points finalized as consumed; original reservation history preserved; no duplicate deduction.
- **Scenario G (Mixed Points + Cash):** points reservation follows approval; booking remains Pending Payment; Finance verifies monetary portion; Reservations may confirm after verification, subject to availability.
- **Scenario H (Unverified cash payment):** booking remains Pending Payment; no false Finance confirmation.
- **Scenario I (Eligible cancellation):** applicable reserved points released according to policy; original records preserved.
- **Scenario J (Late cancellation):** apply configured and contractually permitted treatment; do not invent universal penalties.
- **Scenario K (No-show):** authorized staff establishes no-show status; apply governing policy; record points and financial treatment.
- **Scenario L (Insufficient points):** do not over-reserve; do not use Pending or Held points; do not automatically approve unauthorized redemption.
- **Scenario M (Membership Financial Hold):** new redemption benefit usage restricted; historical transactions remain.
- **Scenario N (Points Hold):** held points unavailable; Finance reconciliation follows approved Stay Points rules.
- **Scenario O (Gold shared membership):** correct single shared wallet; no duplicate point allocations or independent earning entitlement.
- **Scenario P (Pricing policy change):** earlier booking remains traceable under its governing pricing policy; no silent retroactive repricing.
- **Scenario Q (Duplicate completion):** points not deducted twice; existing completion remains traceable.
- **Scenario R (Multi-day booking):** follow applicable contract and approved classification policy; do not invent split calculation if policy not established.
- **Scenario S (Historical membership):** preserve actual applicable entitlement terms; no invented historical transactions or retroactive conversion.
- **Scenario T (Redemption module disabled):** no new active redemption workflow accessible; existing historical information preserved; documentation does not authorize feature reactivation.

Do not claim these scenarios have passed executable tests. They are documentation acceptance examples.

---

## 21. Business Invariants

1. Redemption business policies may be revised through future authorized decisions.
2. Admin may configure approved redemption pricing methods.
3. No universal monetary redemption value is implied by the earning conversion.
4. Eligible redemption services must respect applicable contracts.
5. Actual scheduled stay/service date determines Weekday/Weekend points usage.
6. Holiday classification follows governing contract terms.
7. Reservations/Operations manually approves redemption requests.
8. No automatic redemption approval.
9. Points become Reserved upon approval.
10. Reserved points are unavailable for competing redemptions.
11. Points are finally consumed only after authorized actual service completion or a separately approved contractual outcome.
12. Cancellation handling follows approved Admin-configured policies.
13. Staff may handle only authorized exceptions.
14. Points + Cash is an approved payment arrangement for eligible services.
15. Finance exclusively verifies the monetary portion.
16. Mixed-payment bookings remain Pending Payment until required Finance verification.
17. Reservations confirms the booking afterward, subject to availability.
18. Pending points are not spendable.
19. Held points are not spendable.
20. Annual earning capacity is not a wallet balance.
21. Weekday and Weekend balances remain separate.
22. No unauthorized automatic bucket conversion.
23. No duplicate points reservation or consumption.
24. Membership Financial Hold restricts new benefit usage.
25. Existing signed contract rights must remain protected.
26. Historical redemption records remain auditable.
27. Admin policy changes do not silently rewrite earlier approved transactions.
28. No automatic monetary cash-out is authorized.
29. Refunds and cancellations must preserve both financial and points history.
30. The Redemption module must remain disabled in the planned MongoDB system until separately authorized.

Do not interpret these as permanent rules immune to future policy change. They represent the current approved operational baseline.

---

## 22. Outstanding Dependencies

- Exact Admin-configured redemption conversion rates.
- Exact service-specific points prices.
- Exact eligible resort-service catalog.
- Specific cancellation windows and penalties.
- No-show forfeiture rules.
- Mixed weekday/weekend multi-day booking calculations.
- Policy-version applicability when a booking spans a configuration change.
- Inventory-hold duration.
- Payment deadlines.
- Treatment when service availability changes during Pending Payment.
- Partial stay or partial service completion.
- Partial points restoration.
- Monetary refund allocation for combined Points + Cash.
- Exceptional cancellation approvals.
- Holiday calendars and contract-specific treatment.
- Treatment of refunds after completed services.
- Historical contract-specific redemption provisions.

Categorize unresolved items without turning them into unsupported requirements. Do not ask the project owner minor questions during this documentation-only task. The seven approved decisions are sufficient to document the core workflow.

---

## 23. Implementation Acceptance Checklist

### Policy Configuration
- [ ] Current approved policies are distinguishable from permanent contractual entitlements.
- [ ] Future authorized policy revisions are supported conceptually.
- [ ] Admin-configured monetary conversion is documented.
- [ ] Admin-configured service points pricing is documented.
- [ ] Cancellation policy configuration is documented.
- [ ] Effective dates and historical policy preservation are covered.

### Eligibility
- [ ] Active membership requirement.
- [ ] Contractual eligibility.
- [ ] Financial Hold restrictions.
- [ ] Points Hold restrictions.
- [ ] Pending points excluded.
- [ ] Sufficient available points.
- [ ] Gold supplementary-holder sharing.

### Redemption Approval
- [ ] Manual Reservations/Operations review.
- [ ] Availability verification.
- [ ] Correct Weekday/Weekend bucket.
- [ ] Holiday treatment.
- [ ] Approval and rejection.
- [ ] Audit history.

### Points Handling
- [ ] Reserve upon approval.
- [ ] Prevent double spending.
- [ ] Reserved versus consumed distinction.
- [ ] Final consumption after service completion.
- [ ] Correct bucket deduction.
- [ ] Cancellation restoration/forfeiture.
- [ ] No duplicate ledger movements.

### Mixed Payments
- [ ] Points + Cash allowed.
- [ ] Applicable Admin pricing used.
- [ ] Monetary amount tracked separately.
- [ ] Finance verification required.
- [ ] Booking remains Pending Payment before verification.
- [ ] Reservations confirmation after verification and availability check.
- [ ] Service completion and points consumption separated.

### Cancellation and Reconciliation
- [ ] Service-specific cancellation policies.
- [ ] No-show treatment.
- [ ] Authorized staff exceptions.
- [ ] Cash refund and points restoration distinguished.
- [ ] Historical records preserved.

### System Architecture
- [ ] RBAC consistency.
- [ ] Finance integration.
- [ ] VIP Membership integration.
- [ ] Stay Points integration.
- [ ] Historical contract protection.
- [ ] Reporting and audit requirements.
- [ ] Redemption remains disabled in planned MongoDB system.
- [ ] No unauthorized implementation assumptions.

---

## Completion Report

- **File created/updated:** `docs/business-rules/10-redemption.md`
- **Approved rules coverage:** Admin-configured redemption pricing; actual stay/service date determines points bucket; Reservations/Operations manual approval; points reservation and final consumption; Admin-configured cancellation policies; combined Points + Cash; Finance verification before mixed-payment booking confirmation.
- **Policy flexibility:** Rules described as current approved policy; future authorized revisions supported conceptually; configurable commercial settings identified; historical policy versions traceable; existing signed contractual rights protected; no unauthorized Admin powers introduced.
- **Cross-module review:** Consistent with 01, 04, 05, 06, 07, 08, 09, 13. No material contradictions identified.
- **Unresolved dependencies:** Listed in Section 22.
- **Acceptance results:** All checklist items covered. Documentation completeness does not prove implementation readiness.
- **Change scope:** Documentation only. No application code, database, migrations, other documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/10-redemption.md` created. Redemption and Services remain disabled. No unauthorized implementation assumptions.