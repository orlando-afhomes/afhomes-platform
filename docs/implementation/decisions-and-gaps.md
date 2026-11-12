# Decisions and Gaps

Source: Workflow Atlas `2026-11-12.2` (`develop @ 0512a31`). The atlas now shows G01 to G12 as Decided, except G08 (Conflicting: the code still applies the 7-day wait that R8 removed) and G09 (Pending the signed IST addendum). The status values below are from the earlier atlas `2026-11-12.1`; the round results above them are the current owner rulings. None of these items is resolved here. Features that depend on an item stay blocked until the owner decides.

Related list: `AGENTS.md` section 5 "Unresolved decisions" covers the same ground from the business-rule side (Gold price, RA numbering, claim versus activation date, module-level permissions, and so on). The two lists overlap and neither replaces the other.

## Decision basis (owner, 2026-11-12)

- When a company workbook source and a platform rule document disagree, the workbook (the live manual process) wins by default. Exceptions where the stricter rule wins: signed contracts, privacy, legal and Finance control rules. Dated owner rulings outrank both.
- The company sources are in the owner's `AFHomes Document\Business Rules` folder, which is not in the repo. The current set is defined by `MASTER_FILE_REGISTER-issue29-2026-11-07`. Atlas abbreviations map as follows:
  - NUM: `AFhomes_VIP_numbering_guidelines-v6.2`.
  - AUG: Ruling Addendum 2026-08-20.
  - OCT: Ruling Addendum Issue 3 (24 Sep, revised 4 Oct; R27 to R40, I1 to I12).
  - OPS: Commission System User Manual v2.3.
  - ROLL: Rollout Guide v1.4.
  - REG: Master File Register.
  - GRANT: the signed VIP Grant contracts.
- AUG and OCT count as approved company practice. The IST Commission and Clawback Addendum is a DRAFT and is not applied until signed.
- Decisions are made in domain rounds (R1 to R11). Each answer is written directly into the affected business-rule document as a dated owner amendment.

## Round results

- **R1, cleanup and contracts (2026-11-12): Decided.** Recorded in doc 05 items 13 to 16 and §10.2, with matching edits in docs 06, 07, 08 and 09.
  - Silver is Php 240,000 under the updated contract.
  - Move A and Move B take effect on 2026-11-09.
  - Non-Standard policy: only price and schedule may differ; the Super Administrator approves, then Finance confirms; there is no price floor; commission is based on the actual TCP.
  - The stale Move B1/B2 and Move written-approval text was corrected.
- **R2, numbering and identity (2026-11-12): Decided (closes G05).** Recorded in doc 06 (sections 1 to 9 and 16 to 20 rewritten, amendment items 4 to 8), with matching edits in docs 04, 05, 07 and 09.
  - NUM v6.2 is adopted: one VIP Number for the Reservation Agreement, the Grant and the card. It is issued when the signed Reservation Agreement is recorded and uses a monthly sequence.
  - Validity starts on the Card Claim Date under the signed Grant.
  - The NUM upgrade rule is adopted and will be built later.
  - Numbers are never reused.
  - Left for R10: the Stay Points cycle anchor in doc 09 (activation date versus the Grant's Points Activation Date).
- **R3, network and accreditation (2026-11-12): Decided (closes G02 and G04, and U05 as deferred).** Recorded in docs 02 and 03 (owner amendments).
  - An expired seller can still log in, sell, refer and sponsor, with a reminder. The public check shows them as Expired.
  - A suspended, resigned or terminated seller cannot take new sales or sponsor.
  - A renewal is recorded in the expiry month or later and gives a new AA number; all history moves to it.
  - The AA sequence is monthly (NUM §8). The owner confirmed this on 2026-11-12.
  - A new seller needs two steps: one user enters, a second approves. Later changes, including renewals and transfers, are made by the Administrator or the Super Administrator (amended by the authority rule below).
  - A vacant seat earns nothing, and its downline counts toward the next active level.
  - No Acting SM.
  - Settled in R9: team allowance credit follows the current upline (AUG R23); sale reports keep the original seller and team (doc 02 §6.3).
- **Authority rule (owner, 2026-11-12).** The Administrator can do everything. The Super Administrator has full control with no blocks. Both may approve their own entries, and the audit trail shows it. Clerks only enter information. Sellers only view.
- **R4, roles (2026-11-12): Decided.** Recorded in doc 01 and the permission-matrix proposal.
  - Director = Super Administrator; Supervisor = Administrator; a new Clerk job (enters only); Finance unchanged.
  - Sellers view only: SVD, SSM and SM see their own and their team's records; OST sees only its own.
  - Opening a page allows viewing; sensitive actions need separate permissions.
- **R5, customers and the website (2026-11-12): Decided (G01, G03, U01 to U04).** Recorded in docs 03 and 04.
  - The closing seller is credited, plus an optional referrer, who may be a different person.
  - A seller starts a customer draft, the clerk completes it, and the Administrator approves.
  - The public OST application is kept and reviewed by the office.
  - Home gets links to seller login and the seller check.
  - Forgotten passwords are reset by an Administrator.
- **R6, payments (2026-11-12): Decided (G06, U06).** Recorded in doc 07.
  - A clerk enters each receipt with an OR or reference number.
  - Finance, the Administrator or the Super Administrator approves it.
  - Reference numbers are unique across the system.
  - A returned receipt can be fixed and resent.
  - A reversal is a dated reversal with a reason, never a deletion.
- **R7, sales counting (2026-11-12): Decided (G07).** Recorded in docs 13, 07 and 11.
  - A sale counts at 25% collected (Closed Deal), which replaces the D25 rule.
  - Months are closed, and late receipts go into the first open month.
  - A sale with no payment for 90 days is listed; an Administrator marks it Defaulted.
- **R8, commissions (2026-11-12): Decided (G08).** Recorded in doc 08.
  - Each person has set rates (DSC, DRI), frozen on the sale.
  - Only the closing seller and the referrer earn commission per sale.
  - VIP commission is paid 100% at the month-end of the month 40% is collected. The 7-day wait is removed; no company paper contained it.
  - Commission survives the person leaving (OCT R27).
- **R9, allowances and recovery (2026-11-12): Decided (G09, U07, U12).** Recorded in doc 08.
  - The system computes BA, PA and PB, with a parallel run beside Excel before go-live.
  - Team credit follows the current leader.
  - Clawbacks are recorded as owed. Automatic recovery waits until the IST addendum is signed.
  - When a Defaulted sale is reinstated, the clawback is written off.
- **R10, points (2026-11-12): Decided (G10, U13).** Recorded in doc 09.
  - The signed Grant's Annual Welcome Gift rule applies; Spend-to-Earn is removed.
  - Spending is entered by office staff with a receipt number.
  - A refund delays a tranche that has not been released yet.
  - A waiver can be approved by an Administrator or the Super Administrator.
- **R11, scope and records (2026-11-12): Decided (G11, G12, U08 to U12).** Recorded in docs 11 and 12.
  - There is no public card check.
  - IGP is built together with VIP.
  - Redemption rules are planned now.
  - Records are kept forever until legal advice.
  - History is imported and run in parallel.
  - The CMS is deferred.
- **R12, Redemption (2026-11-12): Decided (U11).** Recorded in doc 10. The build stays disabled.
  - Points pay only for room stays, using weekday or weekend points.
  - The Admin-maintained points-per-night table is fixed per card at its Card Claim Date.
  - Admins keep a holiday calendar.
  - Cancelling in time returns the points.
  - Staff make the bookings.
- **R13, IGP (2026-11-12): Decided (U10).** Recorded in new doc 14.
  - Only AFhomes-channel sales are in scope.
  - Each sale has a 16-character Series Number.
  - The JA&D ID is stored separately.
  - Closed Deal at 10%; commission 40% at 40% collected, the rest at full payment.
  - The documents are tracked as a checklist only.

## Follow-up decisions (2026-11-12)

Recorded in the "Owner rulings amendment (2026-11-12, follow-ups)" section of each named document.

1. No override for AFhomes leaders; per-sale pay goes only to the closing seller (DSC) and referrer (DRI); "Override" is a JA&D pay item only (docs 08, 02).
2. An OST clawback is recorded as owed and collected directly; no automatic deduction without a signed OST agreement (doc 08).
3. A sale counts at 25% once the Admin approves the sale record; contract finalization is tracked separately and not required (docs 13, 07, 05, 08).
4. Only a Super Administrator can create, give or remove the Super Administrator role (doc 01, matrix).
5. Sellers may upload a payment slip photo for their own customer, as proof only (docs 07, 01, 04, matrix).
6. Sellers do not prepare contracts; the Clerk prepares and the Admin approves (docs 05, 04, 01, matrix).
7. Non-Standard: the Admin approves and Finance confirms; only the Super Administrator may do both (doc 05 §10.2, matrix).
8. Imported history receipts are "Approved (imported)"; an Admin signs off each import batch once (docs 07, 11, 12).
9. A Gold supplementary holder's qualifying spend counts toward the yearly minimum (doc 09).
10. A tranche due during a Financial Hold is released when the hold ends, if it still qualifies and the card is valid (doc 09).
11. No redemption before the card is claimed (docs 09, 10).
12. Cancelling a points booking after the cut-off forfeits the points, like a no-show (doc 10).
13. Points plus cash for a stay is allowed; the whole-night or part-night split stays open (doc 10).
14. IGP with a TCP over ₱9M is blocked until a band code is defined (doc 14).
15. A seller without a JA&D accreditation number cannot be salesperson or referrer on an IGP sale (doc 14).
16. IGP refund amounts are decided outside the system; the system records the cancellation, refund amount and date, and any clawback (doc 14).
17. From company rules: stamp date is the later of the triggering receipt's date and the latest counted receipt (OCT O3); a non-Active sale loses its Closed Deal (OCT R33); Year 1 is capped at the first 24 months after full settlement (Grant §I-B(d)(i)); Clerk-entered resort bills are approved like receipts (docs 13, 09).
18. Points bookings are made by staff with the Bookings permission, without a separate approval; all audited; Admins can cancel or correct (docs 10, 12, matrix).
19. The first redemption is the first stay where points are actually used at check-in (docs 09, 10).
20. After an approved card transfer the old holder's unused points are forfeited; the new holder gets only future tranches (docs 09, 10).
21. On the cardholder's death, the heirs request a written transfer approved by management; the same rules apply (docs 09, 10).
22. A returned public OST applicant corrects the same application through a private link; the office sees the history (doc 03).
23. The Admin can approve a seller-started customer, send it back to the Clerk with a reason, or reject it with a reason; nothing is deleted (doc 04).
24. HR creates and activates office staff accounts, cannot give Admin or Super Admin roles and cannot manage seller accounts (doc 01, matrix D3).
25. Finance views all reports, view only (doc 01, matrix D5).
26. Website content editing is deferred (matrix D8; R11).
27. IGP property details: project name, unit or lot number, Property Owner name, TCP and payment plan (doc 14).
28. IGP cancel and reissue moves payments to the new number, recalculates commission on the new TCP, and keeps the old number as Replaced (doc 14).
29. IGP buyer VIP grant benefits are not defined in any company paper; listed as outstanding (doc 14).
30. This summary and the still-open list below.

### Still open

- The IGP VIP grant terms.
- An IGP band code for a TCP over ₱9M.
- The signing of the IST Commission and Clawback Addendum.
- The redemption points-per-night table, filled in by an Admin.
- Legal advice on the records retention period.

## Decisions (G01 to G12)

| ID | Title | Status | Journeys | Blocks features |
|---|---|---|---|---|
| G01 | Public route discoverability and OST intake | Decided 2026-11-12 (R5) | J01, J02 | F2.1, F3.8 |
| G02 | Accreditation dates, expiry and seller standing | Decided 2026-11-12 (R3) | J02, J04 | F3.4 |
| G03 | OST preparation, SM handoff and attribution | Decided 2026-11-12 (R5) | J04, J05, J06 | F4.4, F4.5 |
| G04 | Vacant seat and Acting SM delegation | Decided 2026-11-12 (R3; Acting SM deferred) | J04, J12 | F3.5, F3.6, F11.5 |
| G05 | Unified VIP number and card validity | Decided 2026-11-12 (R2) | J06, J10 | F5.6, F9.2, F9.3 |
| G06 | Receipt matching and verification authority | Decided 2026-11-12 (R6) | J05, J06, J07 | F6.3, F6.4 |
| G07 | Sales milestones and adjustments | Decided 2026-11-12 (R7) | J06, J07, J08 | F5.5, F6.6, F7.5 |
| G08 | Commission release, wait and disbursement | Decided 2026-11-12 (R8) | J08, J09 | F8.2, F8.4 |
| G09 | Allowances and signed recovery | Decided 2026-11-12 (R9; recovery waits for the signed addendum) | J08, J09, J12 | F7.5, F8.5, F8.6, F11.4 |
| G10 | Contract-specific benefits and points | Decided 2026-11-12 (R10) | J10, J11 | F9.4, F10.3, F10.4 |
| G11 | Reports, Public Customer Lookup and CMS | Decided 2026-11-12 (R11; no public lookup, CMS deferred) | J01, J02, J12 | F2.6, F11.6 |
| G12 | IGP, Redemption and Services scope | Decided 2026-11-12 (R11–R13; IGP in scope, Redemption planned, build disabled) | J06, J11 | F5.7, F10.5 |

### What each decision asked for (historical, before the 2026-11-12 rulings)

- **G01.** Approve where public links go and what an OST application needs to be submitted. Then add supported discovery paths and real application decision states.
- **G02.** The company workbook rule is that an Expired seller can still sell with a warning, while an effective suspension or departure blocks new sales, and renewal creates a new AA from the actual renewal date (OCT R28, R37 to R40, NUM section 8). The web prototype applies P03 helpers, and different login, verify and sales paths need separate treatment. Resolve the action-specific meaning and the date and alias compatibility.
- **G03.** The documented same-OST rule in P04 section 7.8 differs from the two UI selectors. Compare a separate OST referral lead with a role-scoped customer draft. If a referral lead is approved, keep authorized Staff and IST creation and authorized finalization as they are. DRI mapping is separate.
- **G04.** Model an effective-dated vacancy with no seat earnings and the applicable roll-up (AUG R1, R23, R25, OCT I1 to I4). If an Acting SM is wanted, it needs a named approver, authority, duration, pay treatment, audit trail and handback.
- **G05.** The company numbering guideline uses one VIP number across RA, Grant and Card, and its sections 2 and 6 differ on the trigger wording. The prototype has a separate RA and an activation-based Card ID with activation-based validity. Preserve historical identifiers and signed validity terms. Approve the issuance trigger and namespace before any new real numbers.
- **G06.** Decide what Supervisor and Finance each attest, the required payment per scheme, duplicate scope and which receipts count. Add the correction and resubmit control (U06). Keep human verification. Record the effective Move date and signed templates.
- **G07.** Closed Deal, the 40% stage and 100% settlement are distinct measures. Decide whether to keep all of them, derive them from one verified ledger, and show linked reversals. Confirm period and scope rules. Late admission, default and cure are Director decisions in the workbook.
- **G08.** Approve release policy by product and effective date. Compare the workbook's separate stages (DSC and DRI rates, monthly release) with the platform's release wait. Route a post-initiation adjustment to Finance review without hiding a recorded disbursement. Missing-date payout recording is already blocked in the working copy.
- **G09.** Build calculation review and shadow reconciliation for allowances (BA, PA, PB) only when authorized. Actual offsets or retroactive application need the applicable signed authority.
- **G10.** Preserve signed entitlements. Document prospective Spend-to-Earn. Approve the resort evidence source, cap restoration, refund treatment, rounded amounts and exceptional servicing.
- **G11.** A read-only, scoped Public Customer Lookup only after approved disclosure. The CMS role and publishing model are pending separately. Add period close and history import before replacing the workbook, and reconcile live source totals.
- **G12.** Decide whether the workbook IGP flow is in scope. Keep disabled features labeled and decide their future approval separately.

## Scenario gaps (U01 to U13)

| ID | Title | Status | Journey | Decision | Feature |
|---|---|---|---|---|---|
| U01 | Public OST application submission | Decided: keep, office reviews (R5) | J02 | G01 | F3.8 |
| U02 | Sales sign-in and AA discoverability from Home | Decided: add Home links (R5) | J01 | G01 | F2.1 |
| U03 | Account recovery | Decided: Admin temporary password until real auth (R5) | J01 | G01 | F2.4 |
| U04 | OST draft and SM finalization handoff | Decided: seller draft, clerk completes, Admin approves (R5) | J05 | G03 | F4.5 |
| U05 | Acting SM delegation | Deferred by owner (R3) | J04 | G04 | F3.6 |
| U06 | Returned payment submitter correction | Decided: Fix and resend (R6); UI still missing | J07 | G06 | F6.4 |
| U07 | Live Finance process and paid commission recovery | Decided (R9); automatic recovery after the addendum is signed | J09 | G09 | F8.5 |
| U08 | Public Customer Lookup and Customer Portal | Out of scope by owner (R11); portal deferred | J02 | G11 | F11.6 |
| U09 | CMS | Deferred by owner (R11) | J01 | G11 | F2.6 |
| U10 | IGP web flow | In scope (R13, doc 14); not built | J06 | G12 | F5.7 |
| U11 | Redemption and Services | Rules decided (R12, doc 10); stays disabled until build authorization | J11 | G12 | F10.5 |
| U12 | Durable payroll, period close and historical import | Decided (R7, R9, R11); not built | J12 | G09 | F11.4 |
| U13 | Resort spend intake and card servicing | Decided: office entry with receipt number (R10) | J10 | G10 | F9.4, F10.3 |

U01 to U13 descriptions are in the atlas `COVERAGE.md` section "Incomplete and unverified journeys".

## Known stale or conflicting documents

- ~~Doc 07 amendment item 7 (per-contract Move approval wording) is stale against doc 05 item 12.~~ Fixed in R1 (2026-11-12): item 7 is marked superseded, and the Move effective date is 2026-11-09.
- Doc 04 section 7.8 and Customer ID decision D2 were already flagged as stale in the session snapshot (`workflow/save-session.md`).
- ~~The atlas baseline `a0bdcef` predates `fc060bb`.~~ Refreshed on 2026-11-12 (atlas `2026-11-12.2`, baseline `0512a31`).
- Code and rule disagree on the commission release wait: R8 removes the 7-day wait, but `src/modules/commissions/rules.ts` still defines `PAYOUT_RELEASE_WAIT_DAYS` and the payout milestone shows "Payout opens <date>". The atlas records this under G08 (Conflicting). It is for the owner to authorize a code change.
