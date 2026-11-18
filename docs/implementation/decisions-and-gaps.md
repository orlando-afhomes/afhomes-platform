# Decisions and Gaps

Source: Workflow Atlas `2026-11-12.3` (`develop @ b784e30`). The atlas now shows G01 to G12 as Decided, except G09 (Pending the signed IST addendum). The register below and the round results state the current owner rulings (R1 to R13, 2026-11-12). Each feature still needs explicit owner authorization before it is built.

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
- Decisions are made in domain rounds (R1 to R13). Each answer is written directly into the affected business-rule document as a dated owner amendment.

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
- **R3, network and accreditation (2026-11-12): Decided (closes G02 and G04; U05 Acting SM removed from scope by A5).** Recorded in docs 02 and 03 (owner amendments).
  - An expired seller can still log in, sell, refer and sponsor, with a reminder. The public check shows them as Expired.
  - A suspended, resigned or terminated seller cannot take new sales or sponsor.
  - A renewal is recorded in the expiry month or later and gives a new AA number; all history moves to it.
  - The AA sequence is monthly (NUM §8). The owner confirmed this on 2026-11-12.
  - A new seller needs two steps: one user enters, a second approves. Later changes, including renewals and transfers, are made by the Administrator or the Super Administrator (amended by the authority rule below).
  - A vacant seat earns nothing, and its downline counts toward the next active level.
  - No Acting SM (final; owner answer A5, 2026-11-12). A seat is filled only by promotion (doc 02 section 8) or team transfer (doc 02 section 6).
  - Settled in R9: team allowance credit follows the current upline (AUG R23); sale reports keep the original seller and team (doc 02 §6.3).
- **Authority rule (owner, 2026-11-12).** The Administrator can do everything. The Super Administrator has full control with no blocks. Both may approve their own entries, and the audit trail shows it. Finance may also approve its own receipt entries and a payout list it prepared itself (owner answer A3), flagged in the history like receipts. Clerks only enter information. Sellers only view.
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
- **R12, Redemption (2026-11-12): Decided (U11).** Recorded in doc 10. The live build stays disabled; the staff prototype was authorized on 2026-11-17.
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
13. Points plus cash for a stay is allowed; the split is by whole nights, each night paid entirely in points or entirely in money (owner answer A1, doc 10).
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
24. HR creates, activates and reactivates office staff accounts, cannot give Admin or Super Admin roles and cannot manage seller accounts (doc 01, matrix D3; owner answer A4).
25. Finance views all reports, view only (doc 01, matrix D5).
26. Website content editing is deferred (matrix D8; R11).
27. IGP property details: project name, unit or lot number, Property Owner name, TCP and payment plan (doc 14).
28. IGP cancel and reissue moves payments to the new number, recalculates commission on the new TCP, and keeps the old number as Replaced (doc 14).
29. IGP buyer VIP grant benefits are not defined in any company paper; listed as outstanding (doc 14).
30. This summary and the still-open list below.

### Alignment follow-ups (2026-11-12)

- Require the actual closing seller at approval. A blank draft may omit it.
- When one person is both closing seller and referrer, a Clerk records a short reference to an existing dated referral. The approving Administrator or Super Administrator verifies it before referral commission can attach.
- Pause VIP Number issuance when an applicable approved rate is missing. Explicit approved zero is a rate.
- Allow a provisional first-stay room hold under venue rules. Confirm points at successful check-in; cancelled or failed check-in does not set the Points Activation Date. Live Redemption stays disabled; the staff prototype is authorized.
- Plan the approved AFhomes-channel IGP sales flow and track grant paperwork. Grant terms gate IGP VIP memberships and benefits.

### Payout day decisions (2026-11-12)

The owner answered these directly on 2026-11-12. Recorded in the "Owner rulings amendment (2026-11-12, payout day)" section of doc 08.

- **D-A, payout day.** A VIP commission payout may be recorded from the first day of the month after the month in which net verified collections first reached 40%. Doc 08 says the release is paid in that month's month-end payout, made after the month is closed. Until a month-close feature exists, the start of the next calendar month stands in for month close. The 7-day wait is removed from the code.
- **D-B, which date sets the month.** For now the month is set by the verification (approval) date of the payment that reached 40%, as the code already does. Doc 13 (OCT O3) stamps Stage 1 by the receipt's own date. Aligning the code with doc 13 is a separate task; the rule is not changed.

### Owner answers to the audit questions (2026-11-12)

The owner answered the questions raised by the documentation audit on 2026-11-12.

- **A1, points plus cash stay.** Split by whole nights: each night is paid all in points or all in money. The live redemption build stays disabled; the staff prototype is authorized (docs 10, 09).
- **A2, Customer ID.** Keep Customer ID `YYYY-NNNN`, assigned at submit. It identifies the person only and is never the Reservation Agreement, Grant or card number (the VIP Number) (doc 04).
- **A3, payout list approval.** Finance, the Administrator or the Super Administrator may approve a payout list they prepared themselves; it is flagged in the history like receipts (docs 08, 12).
- **A4, HR and accounts.** HR may activate and reactivate office staff accounts, never Administrator or Super Administrator accounts and never seller accounts. The app code already does this (doc 01, matrix).
- **A5, Acting leader.** Final: there is no Acting or temporary leader, ever. The vacant seat rule stays. A seat is filled only by promotion (doc 02 section 8) or team transfer (doc 02 section 6) by the Administrator or Super Administrator. U05 is removed from scope (doc 02).
- **A6, renewal and account status.** Renewal is allowed while the login is Suspended or Deactivated; the login stays off until turned on. "Deactivated" is an account status, not resigned or terminated. Leavers are never renewed; a returning leaver gets a new AA number (doc 03).
- **A7a, card transfer and bookings.** When a card transfer takes effect, the former holder's future points bookings are cancelled. Staff inform the holder before the transfer is finalized (docs 10, 09).
- **A7b, Year 1 condition at first redemption.** If the Year 1 condition is not met at first redemption, follow the signed Grant: tranche 1 is not released and not carried over. A late-entered bill dated within the period still counts. A waiver is possible (docs 09, 10).
- **A8, My Sales.** My Sales lists sales where the member is the closing seller. A separate "Referred by me" list shows sales where the member is the referrer; these are never added to My Sales totals. The app code already does this (doc 13).

### Promo Points ruling (2026-11-13)

- **P1, separate Promo Points wallet.** Promo Points are separate from the Annual Welcome Gift (Grant Stay Points). They are earned only under admin-defined promos and never add to, change or convert into Grant points. Grant rules in docs 09 and 10 are unchanged (docs 09, 10).
- **P2, promo setup.** An Administrator or the Super Administrator defines each promo: name, start and end dates (Asia/Manila business dates), earn outlets, earn rate (pesos spent per 1 point), redeem outlets, and an optional points expiry date.
- **P3, earning.** Points are earned on Finance-approved resort bills at the promo's earn outlets, dated inside the promo dates. Whole points, rounded down. One bill earns once.
- **P4, refunds.** A refund reverses only that bill's earned promo points. It never touches Grant points or Qualifying Spend rules beyond doc 09.
- **P5, uses.** Staff record each use at a redeem outlet. A use can be voided with a reason; entries are never deleted.
- **P6, no cash value.** Promo Points have no cash value and are never cashed out. They never count toward Grant qualifying spend changes and never add Grant points.

### Admin interface rulings (2026-11-15)

These rulings change presentation and navigation only. Business rules, permissions, repository contracts and data are unchanged.

- **UI1, one page per area, with tabs.** The sidebar becomes a short flat list of areas. Related pages become tabs on one area page. Old links still open the right tab. Each person sees only the tabs they are allowed to use, under the same rules as before.
- **UI2, sample-data notices removed.** Sentences such as "Sample table. Replace with the approved table." and the "Sample" badges and labels are removed from the screens. This overrides the earlier "clearly marked sample" wording. The `sample` flags stay in the data.
- **UI3, at most 5 table columns.** A table shows at most 5 data columns plus the row menu. Each column holds one value. Everything else moves to "View full details".
- **UI4, same brand colors and fonts.** Only layout, spacing, hierarchy and clutter change. The design tokens in `src/theme/tokens.css` stay as they are.
- **UI5, button colors by purpose.** The main action is dark green. Approve, Confirm and Verify are green. Reject, Cancel (a record), Delete and Decline are red. Send back, Return, Adjust, Correct and Hold are amber. Export, Download, Print and View records are blue. Cancel and Close inside pop-ups are neutral white. The colors are built from the existing tokens; the tokens do not change.
- **UI6, tables.** Links in tables are not underlined, and row menus have no "View full details" item: the whole row opens the record. A full details page shows its action buttons once, in the page header; the row "..." menu appears only on table rows. An empty value shows an em dash. Each column holds one value, and a details view shows every value of the row. This refines UI3, where the extra values moved to "View full details".
- **UI7, page actions at the heading.** The action buttons of a page sit at the right of the page heading, not under the tabs.
- **UI8, plain wording for staff.** Screens show no "version" labels and no technical IDs. The points table is shown as "From <date>", a venue that is not yet open is shown as "Coming soon", and reports use a From and To date range instead of a preset.
- **UI9, VIP tier levels and product details.** An Administrator manages the VIP tier levels (add, rename, set the colour, retire); a level is never deleted while it is used. Each VIP product has an optional image and description. A new product code must be one letter and one digit and may not be a reserved or historical code. The code segment of the VIP Number is not changed (doc 05 §3 and §4.1).
- **UI10, IGP JA&D number and property catalog.** Staff type the JA&D number in a guided form: JAI or JAO, then YYMM from the approval date, then 4 digits from the JA&D paper. The platform never invents it. An Administrator manages the IGP projects and units, and the property owner is set on the unit. A sale keeps a copy of the project, unit and owner names. A unit change on an issued sale still means cancel and reissue (doc 14 §5.3).

### Simpler staff workflows (2026-11-16)

The owner asked for fewer steps and clicks (keep it simple). Every business event is still recorded and audited; only the clicks change.

- **UI11, one row action shows as a button.** When a table row has exactly one action, that action is a direct button in the row instead of a "..." menu. Rows with two or more actions keep the menu.
- **UI12, confirmations only for risky actions.** An "Are you sure?" pop-up stays for one-way, money-out, cancel, delete, reject and close-month actions. Routine actions run at once: Verify receipt and Activate membership have no pop-up (a mistaken verification is fixed with the audited Reverse).
- **UI13, customer to contract in one pass.** Submitting a new customer also submits the contract; staff do not reopen the contract to submit it. Due dates are not typed; they follow the reservation date. Customer acceptance is asked once. New applications default to Standard (S). The success pop-up is replaced by a short message (doc 05 items 26 to 29).
- **UI14, receipts.** Finance "Payment history" and "Verification" are one "Receipts" tab with a Show filter (All, Waiting, Exceptions). The tab opens on All unless its link specifies a filter. "Start review" is no longer offered. The receipt form pre-fills the purpose and amount of the next unpaid line and today's date (doc 07 follow-up items 4 and 5). The Administrator dashboard shows the receipts waiting for approval.
- **UI15, fewer daily tabs.** The "VIP Products" menu is renamed "Settings" and also holds the setup tabs Points table, Holidays, Venues, Lists, Historical import and IGP projects. The Scheme guide moves to Sales. Finance "Holds" becomes the "On financial hold" option of the Collections filter. Permissions of every moved tab are unchanged, and old links redirect.
- **UI16, Clerk to-do dashboard.** The Clerk sees a small to-do list (returned receipts, contracts and customers to finish or fix) instead of an empty dashboard.
- **UI17, Approve deal.** One "Approve deal" Administrator action replaces four approvals: customer, sale, signed Reservation Agreement (VIP Number) and finalization. Each step is still recorded and audited on its own, and a held contract is finalized by running it again (doc 05 items 30 and 31; doc 04 item 24; doc 06 item 10; doc 12, 2026-11-16).
- **UI18, month-end payouts in bulk.** Closing a month prepares the payout list automatically. After the list is approved, payouts are recorded and confirmed for all ready commissions at once, each still audited (doc 08, 2026-11-16). The Payouts tab joins the Commissions tab.
- **Open for the owner:** the Clerk no longer sees the Commissions area (its only task there, preparing the list, is now automatic); there is no Hold action to leave one commission out of a bulk payout.

### Plain screen words (2026-11-16)

- **UI19, plain words on every screen.** The owner asked that no screen use hard words. Screens now use plain words; the business-rule documents keep their official terms. Company words stay in brackets where staff know them, for example "Property Sales (IGP)". Only labels changed: routes, `?tab=` keys, stored values, audit codes and rules are the same.

| Screen word now | Official term in the documents |
|---|---|
| Property Sales (IGP), Property Projects (IGP) | IGP sales, IGP projects (doc 14) |
| Payment Plan Guide, Payment Plans, Payment plan | Scheme Guide, Payment Schemes (docs 05, 07) |
| Card Levels, Card level | Tier levels (doc 05 item 21) |
| Points per Night | Points table (doc 10) |
| Dropdown Choices | Lists |
| Import Old Records | Historical import (doc 11 §26) |
| Close the Month | Month-end close (doc 13) |
| Compare with Spreadsheet, difference, Confirm | Reconciliation, variance, sign-off |
| Commission Paybacks, Payback, Not collected | Clawback recovery, clawback, written off (doc 08) |
| Leader Allowances; Basic Allowance, Performance Allowance, Performance Bonus | Allowances; BA, PA, PB (doc 08) |
| Confirm Paid Out, Payment sent | Disbursement (doc 08) |
| Ready-to-Pay Date | Release date (doc 08) |
| Confirmed Sale; When a Sale Counts; minimum paid | Closed Deal; Sale Counting Rule; threshold (docs 07, 13, 14) |
| Ready to Activate | Activation queue (doc 09) |
| Gift Exceptions, Gift Exception | Compassionate Waiver (doc 09 §14) |
| yearly gift, Given, Lost, Spending that counts | Tranche, released, forfeited, Qualifying Spend (doc 09) |
| Card Points | Cardholder points (doc 10) |
| Team Tree, Team below, Leaders above, Position | Genealogy, downline, upline, designation (doc 02) |
| Internal Seller (IST), Outsourced Seller (OST), Seller Applications | IST, OST, OST registrations (doc 03) |
| Accreditation Number | AA number (doc 03) |
| Stopped Paying | Defaulted (doc 13) |
| Undo, Undo or Refund Payment | Reversal (doc 07) |
| Payment Hold | Financial Hold (docs 07, 09) |
| Cancelled, Payments Kept; Amount the company keeps | Cancelled with forfeiture (doc 07) |
| Contract type | Contract classification (doc 05) |
| Extra cardholder | Supplementary cardholder (doc 09) |

Kept as official names: VIP Number, Reservation Agreement, Grant, Series Number, OR number, Accreditation, JA&D, Standard / Non-Standard, Welcome Gift, Resort Bills, Promo Points, Payout List, Collections, Cardholder, Special Arrangement.

### Non-Standard approval (2026-11-16)

- **UI20, Non-Standard terms and approval.** Staff choosing Contract type Non-Standard enter the total price, the number of monthly payments (1 to 36) and a reason, next to the normal terms. The schedule is the plan's reservation fee and then equal monthly payments (the last takes the leftover centavos); the payment code is `T` plus the months. The Administrator approves inside "Approve deal" with the signed-approval reference; Finance then confirms or sends back from the contract page ("Confirm Non-Standard Terms", "Send Back"). The Finance dashboard lists "Non-Standard Terms to Confirm", linking to Collections filtered to them. A send-back clears both approvals (doc 05 item 32).
- **Known limit:** commission amounts must be exact centavos (no approved rounding, D14), so a Non-Standard price whose commission does not divide exactly is refused when the VIP Number is issued. A rounding rule from the owner would remove this limit.

### Still open

- **AFHomes and JA&D:** Supply the signed Goodwill and Formal VIP Grant terms, a band code above ₱9M, and a written definition of `SUPERSEDED`. Until then, track grant paperwork only, block sales above ₱9M, and refer that status for review.
- **Legal and Finance:** Review the IST Commission and Clawback Addendum and record who has signed it. Until a signed agreement authorizes deductions, record the debt and collect directly under the existing policy.
- **Administrator:** Prepare the first dated points-per-night table by venue, room type, and night class, together with the holiday calendar and venue cancellation cut-offs. Apply the version in effect on the Card Claim Date.
- **Data Protection Officer and Legal:** Supply a written retention schedule by record type, with a start date for each period, legal holds, and secure disposal. The prototype has no automatic deletion. Update the interim rule after the approved schedule is available.
- **Commission stamping (D-B):** Stage 1 uses the counted receipt date under doc 13 (OCT O3). Monthly payout lists require the month to be closed.

## Decisions (G01 to G12)

| ID | Title | Status | Journeys | Blocks features |
|---|---|---|---|---|
| G01 | Public route discoverability and OST intake | Decided 2026-11-12 (R5) | J01, J02 | F2.1, F3.8 |
| G02 | Accreditation dates, expiry and seller standing | Decided 2026-11-12 (R3) | J02, J04 | F3.4 |
| G03 | OST preparation, SM handoff and attribution | Decided 2026-11-12 (R5) | J04, J05, J06 | F4.4, F4.5 |
| G04 | Vacant seat and Acting SM delegation | Decided 2026-11-12 (R3; No Acting SM, final, A5) | J04, J12 | F3.5, F3.6, F11.5 |
| G05 | Unified VIP number and card validity | Decided 2026-11-12 (R2) | J06, J10 | F5.6, F9.2, F9.3 |
| G06 | Receipt matching and verification authority | Decided 2026-11-12 (R6) | J05, J06, J07 | F6.3, F6.4 |
| G07 | Sales milestones and adjustments | Decided 2026-11-12 (R7) | J06, J07, J08 | F5.5, F6.6, F7.5 |
| G08 | Commission release, wait and disbursement | Decided 2026-11-12 (R8); code updated: payout from the first day of the next month | J08, J09 | F8.2, F8.4 |
| G09 | Allowances and signed recovery | Decided 2026-11-12 (R9; recovery waits for the signed addendum) | J08, J09, J12 | F7.5, F8.5, F8.6, F11.4 |
| G10 | Contract-specific benefits and points | Decided 2026-11-12 (R10) | J10, J11 | F9.4, F10.3, F10.4 |
| G11 | Reports, Public Customer Lookup and CMS | Decided 2026-11-12 (R11; no public lookup, CMS deferred) | J01, J02, J12 | F2.6, F11.6 |
| G12 | IGP, Redemption and Services scope | Decided 2026-11-12 (R11–R13; IGP in scope, Redemption staff prototype authorized 2026-11-17, live build disabled) | J06, J11 | F5.7, F10.5 |

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
| U05 | Acting SM delegation | Removed from scope (no Acting SM, final; R3, A5) | J04 | G04 | F3.6 |
| U06 | Returned payment submitter correction | Decided: Fix and resend (R6); implemented in mock | J07 | G06 | F6.4 |
| U07 | Live Finance process and paid commission recovery | Decided (R9); automatic recovery after the addendum is signed | J09 | G09 | F8.5 |
| U08 | Public Customer Lookup and Customer Portal | Out of scope by owner (R11); portal deferred | J02 | G11 | F11.6 |
| U09 | CMS | Deferred by owner (R11) | J01 | G11 | F2.6 |
| U10 | IGP web flow | In scope (R13, doc 14); implemented in mock within doc 14 restrictions | J06 | G12 | F5.7 |
| U11 | Redemption and Services | Rules decided (R12, doc 10); staff prototype authorized 2026-11-17; live Redemption separately unauthorized | J11 | G12 | F10.5 |
| U12 | Durable payroll, period close and historical import | Decided (R7, R9, R11); period close and historical receipt preview built in mock; durable payroll and transition pending | J12 | G09 | F11.4 |
| U13 | Resort spend intake and card servicing | Decided: office entry with receipt number (R10); resort spend entry implemented in mock, card servicing walkthrough pending | J10 | G10 | F9.4, F10.3 |

U01 to U13 descriptions are in the atlas `COVERAGE.md` section "Incomplete and unverified journeys".

## Known stale or conflicting documents

- ~~Doc 07 amendment item 7 (per-contract Move approval wording) is stale against doc 05 item 12.~~ Fixed in R1 (2026-11-12): item 7 is marked superseded, and the Move effective date is 2026-11-09.
- ~~The atlas baseline `a0bdcef` predates `fc060bb`.~~ Refreshed on 2026-11-12 (atlas `2026-11-12.3`, baseline `b784e30`).
- ~~Code and rule disagree on the commission release wait: R8 removes the 7-day wait, but `src/modules/commissions/rules.ts` still defines `PAYOUT_RELEASE_WAIT_DAYS` and the payout milestone shows "Payout opens <date>". The atlas records this under G08 (Conflicting). It is for the owner to authorize a code change.~~ Fixed 2026-11-12: the wait was removed; payout opens on the first day of the month after 40% (owner decision D-A).

### Public seller check and staff Customer Look Up (2026-11-16)

- **UI21, pages copied from the earlier project.** The process and the shown data are copied from the earlier project; the screens are new.
  - **Customer Look Up is a standalone staff page at `/admin/customer-lookup`.** Earlier bookmarks for the Customers tab redirect to this page.
    - It is open to the Super Administrator, Administrator, Clerk and Finance, through the new `customers.lookup` operation. Sellers do not get it.
    - The search needs at least 2 characters and is a partial match on the name, Customer ID, VIP Number or email. Only active, unexpired memberships are returned, up to 50.
    - Up to 6 suggestions are shown. The card shows the tier card, the name, the VIP Number, Valid Until, and total, weekday and weekend points.
  - **The public seller check (`/verify`)** adds the v2 output and steps. The output is the masked name, the photo, Copy ID, and the support and bank block. The steps are the privacy tick, the visitor's contact details (kept for 24 hours) and 3 successful checks per 24 hours. It keeps the doc 03 rules: Expired is shown, and Valid Until is shown for OST only (doc 03 §9.4).
  - **The public header, footer and home have a new look**, with the same links.
  - **The support and bank values are copied from the v2 settings.**
- **Known limits:**
  - The daily limit and the visitor receipt live in browser memory and reset on reload. The v2 robot check is not built; both need the server.
  - The privacy notice is a draft and needs legal review. Its privacy contact is the company email; the earlier personal address was not reused.
  - The v2 government-ID side of the card is not built, because v3 stores no ID images.
  - Valid Until uses the provisional membership end date (D12).

### New public website (2026-11-16)

- **UI22, public website rebuilt from the old WordPress site.** The content of afhomes.com.ph is carried over; the design and layout are new.
  - **Pages:** Home, About, three Experiences (Hotspring & Ecofarm Resort, Smart Wellness Hotel, ALM Japanese Restaurant), VIP Privilege, Compliance, FAQ, Blog (9 posts with a category filter) and Contact. The seller check (`/verify`), Sales Sign-In and the OST application stay where they were. Content lives as typed data in `src/modules/public-site/content/`.
  - **Pictures:** 64 pictures were downloaded from the old site and shrunk (max 1600 px, WebP) into `public/images/site/`. The three VIP card pictures already in `public/images/cards` are reused.
  - **Contact form:** it checks the fields and opens the visitor's email app addressed to info@afhomes.com.ph. Nothing is stored or sent by AFhomes.
  - **VIP page:** the old numbers (15/20/25 percent; 10,000/20,000/25,000 points a year) match docs 05 and 09. The old wording "upon activation" is replaced by the doc 09 rule: each year's points are released when that year's qualifying spend is met.
  - **Not added:** room rates, booking, a public customer or card lookup (R11), and the old site's comment forms and blog search.
- **Open items (not blocking):**
  - The old site gives two hot-spring counts ("over 10 eyes" on About, "over 5" in the FAQ), so no number is shown until the owner confirms it.
  - The old blog posts are copied as written. The REBAP post (Nov 2024) mentions a 50% VIP discount promotion and "potential investors", and the Expo post (Oct 2024) gives "over 20 hectares of hot springs and resort areas" and "more than 600 staycation units". Confirm whether to keep, edit or archive them.
  - The old "Teppanyaki Lounge" post says four lounges in the text and two in a caption.
  - Whether the HR email (hrconnect@afhomes.com.ph) should be shown publicly. It is not shown now.
  - The old Smart Wellness Hotel grand opening is "November 2026": update the status once it opens.
  - A legal review of the disclaimer and the compliance statements, and a privacy policy page (the old site has none).
  - The old rooms-and-amenities and "what is a homestyle resort" pages were not carried over as separate pages. Their content is in the resort page and the FAQ.
