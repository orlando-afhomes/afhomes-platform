# AFHomes Platform — VIP Membership and Stay Points Business Rules

> Single source of truth for the **VIP Membership lifecycle and Stay Points** module.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.

---

## 1. Purpose and Scope

This document defines the authoritative VIP Membership lifecycle and Stay Points business rules for AFHomes Platform.

It governs membership activation, validity, annual earning cycles, eligible resort spending, Spend-to-Earn Stay Points, cumulative minimum qualifying spending, Pending points and unlocking, annual earning limits, 70/30 Weekday/Weekend allocation, points ledger and balances, Gold supplementary holder sharing, refund/reversal reconciliation and Points Hold, Membership Financial Hold, cycle rollover and forfeiture, membership expiration, historical contract protection, historical points preservation, roles and access, reporting, and audit requirements.

**The Stay Points system is transaction-based Spend-to-Earn.** Stay Points are earned from verified eligible resort spending, not automatically awarded as an entire annual allowance when minimum spending is reached. ₱1 of eligible verified resort spending = 1 Stay Point.

This document does not define Redemption service rates, cash conversion, booking availability, or commission calculations. Those belong to their respective modules.

---

## 2. Related Business-Rule Documents

- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — VIP tiers, pricing, benefits.
- `06-vip-card-issuance.md` — activation and Card ID.
- `07-finance-and-payments.md` — Finance verification, reversals, Financial Hold.
- `01-roles-and-permissions.md` — roles and access.
- `13-sales-performance-reporting.md` — reporting conventions.

---

## 3. Terminology

- **VIP Membership** — separate lifecycle from customer identity; status, validity, benefits.
- **Actual Official VIP Membership Activation Date** — date of successful official activation after finalized contract and Finance-verified full payment.
- **Annual Earning Cycle** — period anchored to the actual official activation date (new policy).
- **Eligible Resort Spending** — verified spending on AFHomes Direct Resort Operations.
- **Spend-to-Earn** — ₱1 eligible verified resort spending = 1 Stay Point.
- **Annual Earning Capacity / Limit** — maximum points earnable per annual cycle per tier.
- **Pending Points** — earned but not yet spendable (minimum qualifying spend not met).
- **Spendable Points** — earned and unlocked points available for authorized use.
- **Held Points** — earned points temporarily restricted pending reconciliation.
- **Redeemed Points** — points already consumed through authorized redemption.
- **Forfeited/Expired Points** — points or allowances ineligible under governing contract/policy.
- **Remaining Earning Capacity** — annual maximum less points already counted; not the same as remaining spendable balance.
- **Weekday Points / Weekend Points** — distinct buckets, 70/30 allocation.
- **Membership Financial Hold** — hold due to unresolved contractual financial eligibility (Finance).
- **Points Hold** — hold due to invalidated qualifying resort spending or points reconciliation.

---

## 4. Approved Business Decisions

Nine approved decisions govern this module:

1. Annual Stay Points earning cycles begin from the customer's Actual Official VIP Membership Activation Date (not customer creation, reservation, contract submission/approval, first payment, full-payment claim, payment verification date alone, or card preparation).
2. Transaction-based points earning: ₱1 eligible verified resort spending = 1 Stay Point; no automatic full annual gift at minimum spending.
3. Eligible resort spending only: only verified eligible spending on AFHomes Direct Resort Operations counts; VIP membership purchase payments excluded.
4. Annual earning capacity and forfeiture: unused annual earning capacity does not carry forward; earned/unlocked points are not automatically erased at cycle rollover; failed qualifying-spend treatment of Pending points flagged if not established by contract.
5. Cumulative qualifying spending within the applicable annual cycle.
6. Points conversion rate ₱1 = 1 Stay Point for Bronze, Silver, Gold.
7. Pending points and minimum-spend unlock: points accumulate as Pending before threshold; unlock when cumulative qualifying spending reaches minimum.
8. Automatic 70/30 distribution: 70% Weekday, 30% Weekend per transaction regardless of service date; tier caps per bucket.
9. Refunded transaction and Stay Points Hold: refund/reversal triggers recalculation, affected remaining points automatically held, Finance reconciles, no automatic negative balances, no automatic clawback of redeemed points.

---

## 5. VIP Membership Lifecycle

Membership is separate from customer identity. States (use existing repository state names where verified; do not introduce/modify enums): No membership yet; Pending / Not Activated; Active; Expired; Suspended or Cancelled; Membership on Financial Hold.

A customer whose membership expires remains a customer. Preserve Customer ID, RA No., contract, official VIP Card ID, membership history, Finance history, historical benefits, audit trail. Do not automatically delete or replace expired membership records. Do not invent automatic renewal or extension rules.

### 5.1 Membership Activation Requirements

Preserve existing rules: (1) VIP contract finalized by authorized Admin; (2) full contractual payment completed; (3) Finance verifies full settlement; (4) official membership activation occurs. A Confirmed Sale does not automatically mean Active VIP Membership. A Fully Paid contract does not automatically mean the official activation event occurred. Membership validity begins on the actual official activation date.

---

## 6. VIP Tier Entitlements

Updated October 2026 VIP contracts establish (source-documented baselines, not retroactive):

| Item | Bronze | Silver | Gold |
|---|---:|---:|---:|
| Standard price | ₱72,000 | ₱240,000 | ₱390,000 |
| Total membership validity | 7 years | 12 years | 22 years |
| Base + extension | 5+2 | 10+2 | 20+2 |
| VIP discount | 15% | 20% | 25% |
| Annual earning cycles | 5 | 10 | 20 |
| Annual maximum points | 10,000 | 20,000 | 25,000 |
| Maximum potential lifetime points | 50,000 | 200,000 | 500,000 |
| Annual minimum eligible spending | ₱1,000 | ₱2,000 | ₱3,000 |
| Weekday annual maximum | 7,000 | 14,000 | 17,500 |
| Weekend annual maximum | 3,000 | 6,000 | 7,500 |
| Primary holders | 1 | 1 | 1 |
| Supplementary holders | 0 | 0 | 1 |

Gold contract source contains a previously identified pricing inconsistency (₱390,000 vs ₱780,000) and Silver contains unfinished amount wording. Those require authoritative contractual correction; do not silently resolve.

---

## 7. Membership Validity

Membership validity begins on the actual official activation date under the newly approved policy. Duration follows finalized contract's approved terms: Bronze 7 years, Silver 12 years, Gold 22 years.

Do not confuse membership validity, annual Stay Points earning cycles, annual minimum qualifying spending, points earning eligibility, spendable balance, and redemption eligibility.

---

## 8. Annual Earning Cycles

Annual earning periods are anchored to the actual official Membership Activation Date under the new approved policy. Use established Asia/Manila business-date convention. Exact anniversary boundary handling, including exceptional calendar dates, must be reconciled with existing documentation and contract terms. Do not invent contradictory anniversary rules.

### Annual Earning Cycle Limits

- Bronze: 5 annual earning cycles; max 10,000 points per cycle; max potential lifetime 50,000.
- Silver: 10 cycles; max 20,000 per cycle; max 200,000.
- Gold: 20 cycles; max 25,000 per cycle; max 500,000.

The standard validity periods include an additional two years beyond stated annual welcome-gift cycles. Do not assume those additional years automatically create new annual Stay Points earning allowances. Preserve any remaining eligible spendable points according to applicable signed contract and membership expiration rules. Do not invent a sixth Bronze, eleventh Silver, or twenty-first Gold earning cycle.

---

## 9. Eligible Resort Spending

Only verified eligible spending on AFHomes Direct Resort Operations counts toward Stay Points. Actual eligible service categories follow company policy and existing service/product configuration. Do not assume every product/service is automatically eligible.

### Excluded Spending

VIP membership purchase payments do not count: VIP reservation fees, down payments, installments, full purchase settlement. A customer purchasing a ₱390,000 Gold VIP membership does not automatically earn 390,000 Stay Points. VIP membership purchases and direct resort-service spending remain separate transaction categories.

### Third-Party Operations

Do not automatically award Stay Points for unrelated third-party concessionaires or externally operated services. Respect signed contract and approved AFHomes Direct Operations eligibility rules.

---

## 10. Spend-to-Earn Conversion

**₱1 of eligible verified resort spending = 1 Stay Point.** Applies to Bronze, Silver, Gold. Do not introduce different earning multipliers based on VIP tier.

This is an earning conversion rate. It does not automatically establish a redemption cash value. Do not assume 1 Stay Point = ₱1 redemption. The future Redemption module follows separately approved redemption-value and service-eligibility rules.

Handle financial amounts and earned points consistently with existing project conventions. Inspect existing decimal, precision, and rounding standards. If fractional peso transactions or fractional point allocation require a specific commercial rounding policy, identify that dependency rather than inventing a rule that changes total customer entitlements.

---

## 11. Cumulative Qualifying Spending

Qualifying spending is cumulative within the applicable annual cycle. A member does not need to meet the minimum spending threshold through a single transaction.

Example — Bronze: Transaction 1 ₱400, Transaction 2 ₱600 → total ₱1,000. Bronze minimum satisfied.

Requirements: accumulate verified eligible spending within the applicable cycle; keep accurate transaction references; do not count unverified transactions; do not double-count repeated or duplicated transactions; do not automatically combine spending across unrelated annual cycles; reconcile reversed or refunded transactions appropriately.

---

## 12. Pending Points and Minimum-Spend Unlock

Points may accumulate before the annual minimum qualifying-spend threshold has been reached. They are initially Pending and not spendable. When cumulative verified eligible spending reaches the required minimum, the corresponding eligible Pending points become spendable.

Minimum qualifying spending:

| VIP Tier | Annual minimum eligible spending |
|---|---:|
| Bronze | ₱1,000 |
| Silver | ₱2,000 |
| Gold | ₱3,000 |

Example — Bronze: Transaction 1 ₱400 → 400 Pending points. Transaction 2 ₱600 → 600 additional points. Cumulative ₱1,000. Requirement satisfied. Accumulated 1,000 earned points become spendable.

Do not treat the first ₱1,000 as a non-earning qualification fee. The verified spending used to reach the threshold itself earns points.

Support business concepts equivalent to: Earned but Pending; Earned and Spendable; Temporarily Held; Redeemed; Reversed or Adjusted through authorized reconciliation. Do not claim these are existing implementation enum values unless verified.

---

## 13. Annual Earning Limits and Cap Enforcement

The system must prevent a member from earning more than their authorized annual maximum.

Example — Bronze: earns 4,000 + 3,000 + up to 3,000 more (cap 10,000). Total annual earned 10,000; Weekday 7,000; Weekend 3,000; remaining capacity 0. Do not record the excess 2,000 as spendable points. Preserve the source transaction and the reason the earning was capped.

If the member earns 10,000 points and later redeems 5,000, the annual earning cap remains exhausted. The member must not automatically earn another 5,000 merely because their wallet balance decreased. Separate lifetime/annual earned totals from current wallet balances.

---

## 14. Automatic 70/30 Point Distribution

Every eligible transaction's earned Stay Points must be allocated 70% Weekday Points and 30% Weekend Points. This allocation applies regardless of the day on which the customer made the transaction or stayed at the resort. Do not determine the earning bucket based on the actual service date.

Tier earning caps:

| VIP Tier | Weekday annual cap | Weekend annual cap | Total annual cap |
|---|---:|---:|---:|
| Bronze | 7,000 | 3,000 | 10,000 |
| Silver | 14,000 | 6,000 | 20,000 |
| Gold | 17,500 | 7,500 | 25,000 |

The two buckets remain distinct. Do not allow an unused Weekday balance to automatically become Weekend points. Do not transfer or exchange point buckets without a separately authorized policy. Do not allocate points beyond the applicable annual bucket limits.

If a qualifying transaction produces a fractional allocation, use an approved and consistently documented precision policy. Do not independently round both buckets in a way that creates extra total points. If the actual repository or contract documentation does not establish rounding behavior, identify it as a required implementation-level commercial clarification.

---

## 15. Points Balances and Ledger

### 15.1 Separate Points Accounting Concepts

- **Annual Earning Capacity** — maximum points earnable during the applicable annual cycle.
- **Earned Points** — points generated from eligible verified resort transactions.
- **Pending Points** — earned points not yet available for use because the annual minimum qualifying-spend condition has not been met.
- **Spendable Points** — earned and unlocked points available for authorized benefit use.
- **Held Points** — previously earned points temporarily restricted pending authorized reconciliation or another applicable financial restriction.
- **Redeemed Points** — points already consumed through an authorized redemption process.
- **Forfeited or Expired Points** — points or unused allowances that have become ineligible under the applicable governing contract or approved business policy.
- **Remaining Earning Capacity** — annual maximum less points already counted against the annual earning limit, subject to authorized reconciliation rules. Not the same as remaining spendable balance.

### 15.2 Transaction-Level Points Ledger

Points must be traceable to actual financial and membership events. Conceptually, each earning event should preserve references to: canonical customer identity; VIP membership; VIP tier and finalized entitlement snapshot; applicable annual earning cycle; original eligible resort transaction; authorized financial verification; verified eligible spending amount; earned points; Weekday allocation; Weekend allocation; Pending or unlocked status; current hold status; relevant reconciliation events; audit history. This is a business data contract, not authorization to create database tables or schemas. Inspect existing models before determining implementation structures.

Historical integrity: do not overwrite original earning transactions to disguise adjustments. Use traceable correction, reversal, or reconciliation events. Prevent multiple point-awarding events from the same source transaction unless the original transaction legitimately contains distinct authorized earning components.

---

## 16. Gold Supplementary Holders

The updated Gold contract provides one primary VIP holder and one eligible immediate-family supplementary holder. Both share the same underlying membership benefits and Stay Points pool.

The supplementary holder must not receive an independent annual 25,000-point allowance. The Gold membership's annual cap remains 25,000 total shared points (17,500 Weekday, 7,500 Weekend).

Eligible verified resort spending associated with authorized primary or supplementary-holder use must follow the shared membership entitlement. Do not duplicate earned points merely because more than one holder is associated with the membership. The applicable contractual permission for supplementary transactions and redemption must be preserved. Do not invent additional supplementary-holder eligibility or transfer permissions.

---

## 17. Membership Status and Financial Hold

### 17.1 Membership Lifecycle

Document the distinction between customer identity, VIP application, finalized contract, Finance-verified payment, Confirmed Sale, Fully Paid, officially activated VIP membership, expired membership, suspended or cancelled membership, and membership on Financial Hold. Use existing repository state names where verified. Do not introduce or modify enums.

### 17.2 Existing Finance Financial Hold Rule

The approved Finance business rules establish that an Active VIP Membership must be placed on Financial Hold when a verified membership-purchase payment is reversed or refunded and creates an outstanding contractual balance.

During Financial Hold: new VIP benefit usage must be restricted; original membership identity remains intact; original VIP Card ID remains unchanged; original activation date remains unchanged; existing validity schedule is preserved; financial and membership history remains auditable. Finance reconciliation may restore eligibility once applicable verified settlement conditions are satisfied. Restoring financial eligibility must not override independent membership expiry, cancellation, or other applicable restrictions.

### 17.3 Distinguish Two Different Holds

**Membership Financial Hold** — caused by unresolved contractual financial eligibility, such as reversal of a previously verified membership-purchase payment.

**Stay Points Hold** — caused by invalidated qualifying resort spending or another authorized points-reconciliation condition.

These holds may coexist but must not be treated as interchangeable. A customer resolving one hold does not automatically resolve the other.

---

## 18. Refunds and Reversals (Stay Points)

When a previously verified qualifying resort transaction is refunded or reversed, the system must reconcile its impact on qualifying spending and the associated earned points.

Required behavior:

1. A verified eligible resort transaction has generated Stay Points.
2. The underlying transaction is later refunded or reversed through authorized Finance action.
3. The system recalculates eligible qualifying spending.
4. Affected remaining Stay Points are automatically placed on Hold.
5. The system restricts the affected held points from new redemption or use.
6. Finance reviews and reconciles the affected points.
7. Historical earning and redemption records remain preserved.
8. No automatic negative points balance is created.
9. No automatic clawback of points already redeemed.

Minimum threshold impact: if the refund reduces the member's cumulative eligible spending below the minimum threshold, previously unlocked points for the affected cycle must be reconsidered under the minimum-spend eligibility rule. Do not leave points spendable merely because the threshold had been reached before a subsequent invalidating refund. However, do not destroy historical records or invent a recovery balance.

Reconciliation: Finance may perform authorized corrections and adjustments. All changes must remain traceable. The system must distinguish original eligible transaction, original earned points, original bucket allocations, refunded amount, impacted remaining points, already redeemed points, held points, Finance reconciliation decision, and resulting eligible balances.

No automatic negative balances: if points have already been redeemed, preserve the original redemption transaction. Do not automatically create negative point balances or deductions from unrelated future points allocations. Any separate recovery mechanism requires explicit business approval.

---

## 19. Expiration and Forfeiture

### 19.1 Annual Cycle Expiration

At the end of the annual earning cycle: stop new earnings from exceeding the completed cycle's annual cap; preserve its actual earned points history; close unused annual earning capacity; start the next eligible annual cycle according to the applicable contract; do not automatically reset or erase points earned in previous eligible cycles; do not carry unused annual earning capacity forward.

Do not confuse cycle rollover with membership expiration.

### 19.2 Membership Expiration

When the VIP Membership reaches its applicable contractual expiration: new benefit use must be restricted according to contract rules; remaining unused points are subject to the governing contract's expiration and forfeiture provisions; historical earning and redemption records remain preserved; expiration must not erase audit history; the original membership identity and VIP Card ID must remain historically traceable.

Do not extend membership validity merely because points remain unused. Do not create unauthorized automatic renewal or reinstatement policies.

### 19.3 Historical Signed Contracts

Some historical contracts contain provisions based on Card Claim Date, separate Points Activation Date, first redemption, second anniversary timing, conditional Annual Welcome Gift releases, or other contract-specific qualification and expiration provisions. The newly approved transaction-based policy must not automatically override those legally applicable terms.

For every membership, determine the applicable approved contractual terms. Do not assume all historical memberships use the new Spend-to-Earn system. Do not bulk-convert historical points into newly calculated points. Do not generate fictional historical earning transactions. Do not reinterpret past benefit releases as though they were produced by the new policy.

If an existing contractual clause conflicts with the newly approved policy, identify the conflict and the need for an appropriate approved contract revision. Do not claim that product-owner approval in this software discussion legally amends previously signed customer contracts.

### 19.4 Annual Forfeiture of Unearned Capacity

Unused annual earning capacity does not accumulate indefinitely. When an annual cycle ends, the unearned allowance for that completed cycle does not carry forward into a subsequent cycle. This does not mean that all previously earned points expire at the end of each annual cycle. Keep unearned annual allowance, earned points, unlocked points, redeemed points separate.

The previously approved annual forfeiture principle applies to gifts or allowances that fail their qualifying conditions. The new transaction-based system must reconcile the treatment of accrued but still locked Pending points when a cycle ends without reaching its minimum spending threshold. Do not silently convert those Pending points into spendable balances or carry them into the next annual cycle. Preserve transaction history and document the exact contractual treatment. If the existing signed contract and approved rules do not establish whether such pending entries must be forfeited, expired, or otherwise closed, flag the precise policy dependency rather than inventing a deletion or balance-creation rule.

Existing signed contracts may provide separately applicable conditions or compassionate-waiver provisions. Preserve those rights. Do not automatically grant waivers without approved authorization.

---

## 20. Historical Points Preservation

The platform may support customer imports containing historical Stay Points balances. An imported verified balance must not automatically generate a new transaction-based earning history.

Required distinctions: historical certified balance; new transaction-based points earnings; points already redeemed; reconciliation adjustments; current eligible spendable balance.

When importing pre-existing records: (1) preserve verified historical balances; (2) preserve the original membership identity; (3) avoid duplicate crediting; (4) do not fabricate missing transaction receipts; (5) do not invent prior qualifying-spend events; (6) do not re-run annual earning calculations over historical balances without an approved migration policy; (7) do not automatically activate inactive memberships; (8) preserve applicable membership validity dates; (9) maintain traceability of adjustments.

Inspect existing import documentation and source code before asserting that specific import functions or balance fields are already implemented.

---

## 21. Redemption Integration

The Membership and Stay Points module determines membership eligibility, points earning, Pending points, unlocked points, annual limits, available balances, held points, expiration, and reconciliation. The Redemption module determines the actual authorized use of points for eligible services.

**₱1 earned spending = 1 Stay Point does not establish that 1 Stay Point equals ₱1 of redemption value.** Do not invent cash conversion rates, resort room redemption prices, service point costs, booking availability, refund-to-points ratios, or cash-out rights. These require separate approved Redemption business rules.

The separate planned MongoDB system has a decision to preserve Redemption and Services code while hiding and disabling those modules until future authorization. Do not re-enable either module through this documentation task. Document points earning and balance eligibility without requiring active public redemption functionality. Where existing applications have different feature states, report the observed implementation rather than assuming modules are currently active or disabled.

---

## 22. Roles and Record Visibility

Align with `docs/business-rules/01-roles-and-permissions.md`. The platform uses modular roles and record-level access restrictions.

- **Customer/member access:** An authorized VIP customer may view information permitted by the customer-facing membership workflow, including applicable balances and points history. Do not automatically give customers internal Finance audit access.
- **IST/OST access:** Sales Network members must not receive unrestricted access to unrelated customer points information. Respect existing own-customer, direct-sale, downline, and account-visibility rules.
- **Finance:** Finance controls verification of customer payments and the approved financial reconciliation processes affecting points.
- **Admin:** Authorized administrators may manage VIP products and entitlements according to existing rules. Changes to product configurations must not automatically rewrite finalized contractual membership benefits.

Separation of authority: do not allow ordinary points-view permissions to perform financial reconciliation; do not allow a public customer lookup to modify points; do not allow OST or IST users to manually award arbitrary points merely because they can view or submit related transactions.

---

## 23. Reporting

Define business reporting requirements for: active memberships; expired memberships; memberships on Financial Hold; VIP tier distribution; annual earning cycles; verified eligible resort spending; minimum qualifying-spend progress; Pending points; earned points; unlocked points; available Weekday points; available Weekend points; held points; redeemed points; forfeited or expired points; remaining annual earning capacity; memberships reaching earning caps; refund-related reconciliation cases; historical imported balances.

Reporting integrity: do not count annual earning capacity as actually earned points; do not count Pending points as spendable points; do not treat redeemed points as newly available balance; do not treat Points Hold as permanent forfeiture; do not double-count primary and supplementary Gold membership balances.

Time dimensions: separate membership activation date, annual earning-cycle start, eligible spending transaction date, payment verification date, points earning date, points unlock date, points redemption date, refund/reversal date, points reconciliation date, membership expiry date. Use existing project reporting conventions. Do not invent financial recognition dates that contradict Finance documentation.

---

## 24. Audit Requirements

All state-changing membership and points operations must remain auditable. Required events include membership activation; annual cycle creation or rollover; eligible transaction verification reference; points earning; Weekday allocation; Weekend allocation; Pending points accrual; minimum-spend threshold completion; points unlocking; annual cap enforcement; points redemption when enabled and authorized; refunded qualifying transaction; automatic Points Hold; Finance reconciliation; hold release or adjustment; membership Financial Hold; membership restoration; membership expiration; points forfeiture; historical balance import or reconciliation.

Preserve: acting user or system identity; timestamp; membership reference; relevant contract entitlement; source transaction; previous and resulting states; previous and resulting amounts; points bucket; applicable annual cycle; adjustment reason; supporting reference; Finance reconciliation identity where applicable. Do not delete or rewrite historical events to conceal corrections.

---

## 25. Cross-Module Integrations

| Module | Membership/Stay Points integration |
|---|---|
| Customer Management | Canonical customer identity |
| VIP Products and Contracts | Finalized contractual entitlements and tier benefits |
| VIP Card Issuance | Activation date and Card ID |
| Finance and Payments | Verified payment, reversals, Financial Hold |
| Sales Network | Customer/sales attribution visibility |
| Sales Performance Reporting | Reporting conventions |
| Roles and Permissions | Access control |
| Redemption (future) | Points use; not enabled |
| Stay Points (this module) | Earning, balances, holds, expiration |
| Audit Logs | Traceability |

---

## 26. Required Business Scenarios

(See Part XVI of the task prompt for scenarios A–N; summarized here with expected outcomes.)

- **Scenario A (Bronze minimum spend):** ₱400 + ₱600 verified → 1,000 earned points, minimum satisfied, 700 Weekday/300 Weekend spendable, no automatic 10,000-point gift.
- **Scenario B (Silver minimum spend):** ₱500 + ₱1,500 → 2,000 earned, 1,400 Weekday/600 Weekend spendable.
- **Scenario C (Gold minimum spend):** ₱1,000 + ₱2,000 → 3,000 earned, 2,100 Weekday/900 Weekend spendable.
- **Scenario D (Bronze reaches annual cap):** ₱12,000 eligible → 10,000 earned (7,000 Weekday, 3,000 Weekend), no excess credited.
- **Scenario E (Points used during year):** earn 10,000, redeem 5,000 → earning capacity exhausted, redemption reduces spendable balance, cap does not reset.
- **Scenario F (Failed annual minimum):** ₱700 verified in cycle → accrued points never auto-spendable; no full annual gift; unused capacity does not carry forward; exact closure treatment follows applicable contract/policy.
- **Scenario G (New annual cycle):** Year 2 gets own capacity; Year 1 unused allowance does not carry forward; Year 1 earned/unlocked remaining balances not automatically erased.
- **Scenario H (Resort transaction refund):** earn 2,000 from ₱2,000; refund ₱1,000 → recalculate qualifying spending, affected remaining points held, Finance reconciles, no automatic negative balance, history preserved.
- **Scenario I (VIP purchase payment):** ₱390,000 Gold payment → no Stay Points earned; may contribute to membership settlement/activation.
- **Scenario J (Gold supplementary holder):** shared pool, single 25,000 annual cap, no duplicate.
- **Scenario K (Membership Financial Hold):** reversed verified purchase payment creating outstanding balance → Financial Hold, new benefit usage restricted, original Card ID and activation date remain, Finance reconciliation governs restoration.
- **Scenario L (Historical membership):** preserve actual historical records; do not invent transaction-based points; do not overwrite historical contractual timing/balances.
- **Scenario M (Duplicate verification):** already processed transaction processed again → no duplicate points credited; original earning reference traceable.
- **Scenario N (Membership reaches expiration):** apply governing contract expiration provisions; preserve history; do not invent extension/renewal.

For each scenario, describe preconditions, triggering action, expected financial/membership state, expected points balances, relevant authorization, required audit outcome. These are business acceptance scenarios, not proof that application tests have been executed.

---

## 27. Business-Rule Invariants

1. Customer creation does not automatically activate VIP Membership.
2. Confirmed Sale is not the same as Fully Paid.
3. Fully Paid is not automatically official membership activation.
4. Annual earning cycles follow official activation under the new policy.
5. Existing signed contracts retain their governing rights.
6. Stay Points are earned through eligible verified resort spending.
7. ₱1 eligible resort spending earns 1 point.
8. VIP membership purchase payments do not earn Stay Points.
9. The full annual earning cap is not automatically granted at the spending threshold.
10. Qualifying spending is cumulative within each annual cycle.
11. Points earned before the minimum threshold remain Pending.
12. The minimum threshold unlocks eligible accumulated Pending points.
13. Annual earning caps are tier-specific.
14. Weekday points receive 70% of eligible earnings.
15. Weekend points receive 30%.
16. Weekday and Weekend buckets remain separate.
17. Annual earning capacity does not reset when points are redeemed.
18. Unused annual earning capacity does not carry forward.
19. Earned and unlocked points are not automatically erased at each annual rollover.
20. No duplicate earning from repeated transaction processing.
21. Refunded qualifying spending requires reconciliation.
22. Affected remaining points automatically enter Hold.
23. Finance manually reconciles affected points.
24. No automatic negative point balances.
25. Historical redemption records remain preserved.
26. Gold supplementary holders share the original membership's points pool.
27. Membership Financial Hold and Points Hold are separate conditions.
28. Product edits do not retroactively change finalized contract entitlements.
29. No invented cash redemption rate.
30. Every balance-changing action must be auditable.
31. Existing historical memberships must not be bulk-renumbered or automatically recalculated.
32. The Redemption module must not be re-enabled without explicit authorization.

---

## 28. Outstanding Dependencies

- Precise rounding of fractional Stay Points.
- Treatment of remaining Pending points when the annual cycle ends below the minimum spending threshold.
- Leap-year and anniversary boundary conventions.
- Refund-driven restoration of annual earning capacity.
- Partial resort transaction refunds.
- Refunds affecting points that have already been fully redeemed.
- Contract-specific waiver conditions.
- Historical Points Activation Date clauses.
- Special benefit restrictions for Non-Standard contracts.
- Redemption service rates and conversion rules.
- Membership suspension consequences outside the approved Financial Hold rules.

Do not automatically treat these as approved. Use classifications Approved / Existing documented / Recommended / Unresolved. Avoid speculative complexity.

---

## 29. Implementation Acceptance Criteria

### Membership
- [ ] Official activation prerequisites.
- [ ] Actual activation date as the new-policy cycle anchor.
- [ ] Separate Customer/Sale/Contract/Membership identities.
- [ ] Validity based on finalized contractual entitlement.
- [ ] Historical signed contract protection.
- [ ] Expiration rules.

### Stay Points Earning
- [ ] ₱1 eligible spending = 1 point.
- [ ] VIP purchase payments excluded.
- [ ] Verified resort spending required.
- [ ] Transaction-based earning.
- [ ] No automatic full annual gift.
- [ ] Cumulative minimum spending.
- [ ] Pending points before threshold.
- [ ] Unlocking at minimum spending.
- [ ] Duplicate earning prevention.

### Annual Limits
- [ ] Bronze 10,000 annual cap.
- [ ] Silver 20,000 annual cap.
- [ ] Gold 25,000 annual cap.
- [ ] Correct number of earning cycles.
- [ ] Maximum potential lifetime points.
- [ ] No carryforward of unused earning capacity.
- [ ] Spending points does not replenish annual cap.
- [ ] Prior earned-point history preserved.

### Allocation
- [ ] Automatic 70% Weekday distribution.
- [ ] Automatic 30% Weekend distribution.
- [ ] Separate bucket limits.
- [ ] No unauthorized bucket conversion.
- [ ] Rounding dependencies identified.

### Finance
- [ ] Verified transaction requirement.
- [ ] Automatic recalculation after refunds.
- [ ] Affected points automatically held.
- [ ] Finance manual reconciliation.
- [ ] No automatic negative points.
- [ ] Previous redemption history preserved.
- [ ] Membership Financial Hold distinguished from Points Hold.

### Membership Benefits
- [ ] Gold primary and supplementary sharing.
- [ ] No supplementary duplicate allowances.
- [ ] Existing contractual benefits protected.
- [ ] Expiration behavior.
- [ ] New policy not applied retroactively to historical signed contracts.

### System Integration
- [ ] Finance and Payments consistency.
- [ ] Customer Management consistency.
- [ ] VIP Contracts consistency.
- [ ] Card Issuance consistency.
- [ ] Roles and Permissions consistency.
- [ ] Reporting consistency.
- [ ] Audit consistency.
- [ ] Redemption module boundaries preserved.
- [ ] Historical import protections.

---

## Completion Report

- **File created/updated:** `docs/business-rules/09-vip-membership-and-stay-points.md`
- **Approved rules coverage:** Activation-date-based annual cycles; transaction-based points earning; eligible direct resort spending; annual earning-cap forfeiture; cumulative qualifying spending; ₱1 = 1 Stay Point conversion; Pending points and minimum-spend unlocking; automatic 70/30 bucket allocation; refund-related Points Hold and manual Finance reconciliation.
- **Cross-module reconciliation:** Consistent with 01, 04, 05, 06, 07, 13. No material contradictions. Historical contract conflicts flagged.
- **Outstanding dependencies:** Listed in Section 28.
- **Acceptance results:** All checklist items covered. Documentation completeness does not prove implementation readiness.
- **Change scope:** Documentation only. No application code, database, migrations, other documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/09-vip-membership-and-stay-points.md` created.