# AFHomes Platform — IGP Sales Business Rules

> Single source of truth for **IGP (property) sales made through the AFhomes channel: the IGP Series Number, JA&D accreditation on IGP sales, IGP collection thresholds and commission release, and the IGP document checklist**.
>
> **Owner ruling R13 (2026-11-12):** IGP is in scope and is built together with VIP (owner ruling R11). This document was created on 2026-11-12 from the company sources below and the owner's R13 answers. See the amendment at the end.
> Roles and Permissions: `docs/business-rules/01-roles-and-permissions.md`.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Accreditation: `docs/business-rules/03-ist-ost-accreditation.md`.
> VIP Card Issuance (VIP Number, not used for IGP): `docs/business-rules/06-vip-card-issuance.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Commission Management: `docs/business-rules/08-commission-management.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Reports and Analytics: `docs/business-rules/11-reports-and-analytics.md`. Audit: `docs/business-rules/12-audit-logs-and-governance.md`.

**Sources.** JA&D IGP Documentation Numbering Guidelines Rev 7 (4 October 2026; "JAD Rev 7"); AFhomes Commission System User Manual v2.3, §4.2 to §4.4, §5, §6.1, §6.2 ("OPS"); Upgrade Memorandum Ruling Addendum 2026-08-20, R13 and R23 ("AUG"); Ruling Addendum 2026-09-24 Issue 3, R27, R28, R31, R32 to R34, R38 ("OCT"); AFhomes VIP numbering guidelines v6.2 §8 and §9 ("NUM").

---

## 1. Purpose and Scope

This document defines how AFHomes Platform records and controls IGP sales.

In scope: IGP sales made through the AFhomes channel (Partner Code `A`), their Series Number, the closing seller and referrer, receipts and collection thresholds, DSC and DRI release, clawbacks, team KPI credit, the document checklist, and audit.

Out of scope: IGP sales made through JA&D's own channel (Partner Code `J`); they stay in JA&D's books (JAD Rev 7 §4). Property title, property-owner contracts and document generation are not handled by the platform.

General commission, allowance and clawback rules are in doc 08; receipt approval, unique references and month close are in docs 07 and 13. This document states only what is specific to IGP.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles, action permissions, the overriding authority rule.
- `02-sales-network-and-genealogy.md` — hierarchy, team credit.
- `03-ist-ost-accreditation.md` — AFhomes accreditation (AA number), renewal, statuses.
- `06-vip-card-issuance.md` — VIP Number (VIP only).
- `07-finance-and-payments.md` — receipts, unique reference numbers, reversals, returned cheques.
- `08-commission-management.md` — DSC and DRI rates, release, clawback, BA, PA and PB.
- `12-audit-logs-and-governance.md` — audit history.
- `13-sales-performance-reporting.md` — Closed Deal counting, month close, defaults.

---

## 3. Terminology

- **IGP sale** — a property sale brokered under JA&D authority and closed through the AFhomes channel.
- **IGP Series Number** — the 16-character tracking number of one IGP transaction (section 5).
- **Partner Code** — first character of the Series Number: `A` = AFhomes, `J` = JA&D (JAD Rev 7 §3).
- **TCP** — Total Contract Price of the property sale.
- **TCP band (T)** — TCP in whole millions, rounded up (OPS and OCT call this segment `B`).
- **JA&D accreditation number** — `JAI` or `JAO` + YYMM + NNNN, issued under JA&D authority on approval of the seller's Accreditation & Authority to Sell (AATS) (NUM §8; JAD Rev 7 §10).
- **AA number** — the seller's AFhomes accreditation (doc 03). Used for VIP sales only on documents.
- **Closed Deal** — an IGP sale whose approved collections reach 10% of TCP (AUG R13).
- **Stage 1** — approved collections reach 40% of TCP (AUG R13; OPS §6.1).
- **Full payment** — approved collections reach 100% of TCP.
- **Property Owner** — the seller of the property; signs the CTS and DOAS.

---

## 4. Approved Business Decisions (owner ruling R13, 2026-11-12)

1. **Scope.** Only IGP sales made through the AFhomes channel (Partner Code `A`). JA&D's own-channel sales stay in JA&D's books.
2. **Series Number.** 16 characters, `A YYMMDD NNNN T P MM S`. Issued once, when the reservation fee is paid. NNNN is monthly and restarts at 0001. T is the TCP band in whole millions, rounded up. The number is never edited; a change of property, TCP band or scheme cancels the number and issues a new one.
3. **JA&D accreditation.** `JAI`/`JAO` + YYMM + NNNN is stored separately on the seller, with its own approval date and its own one-year validity, renews under its own rules, and is used only on IGP sales. VIP sales use only the AFhomes AA number.
4. **Pay.** Closed Deal at 10% approved collection. DSC and DRI at each person's IGP rate, frozen at issue. 40% of the commission is released in the month the sale reaches 40% approved collection and the rest in the month of full payment, each paid in that month's month-end payout. Paid even if the person has left (OCT R27). Clawbacks follow doc 08 (R9). Assumed collection credit for IGP is 20% (AUG R23). IGP counts in team KPIs (VIP + IGP).
5. **Documents.** A checklist under the same Series Number (Reservation & Acknowledgement, Contract to Sell, Goodwill of VIP grant, Deed of Absolute Sale, Formal VIP Grant, Long-Term Lease, SPA), with dates and signers. Documents are not generated.

---

## 5. IGP Series Number (JAD Rev 7 §3 to §8; OPS §4.2; OCT R38)

### 5.1 Format

Fixed 16 characters, stored without spaces or dashes:

| Segment | Length | Meaning |
|---|---:|---|
| X | 1 | Partner Code; always `A` for platform sales |
| YYMMDD | 6 | Date the reservation fee is paid (Asia/Manila) |
| NNNN | 4 | Running count for the month, restarting at 0001 |
| T | 1 | TCP band, whole millions rounded up, 1 to 9 |
| P | 1 | `C` = Cash; `T` = Terms / Installment |
| MM | 2 | Payment window in months, two digits; Spot cash `01`; Terms 01 to 36 (OPS §4.2) |
| S | 1 | `S` = Standard clauses; `N` = Non-Standard clauses |

Length check: 1 + 6 + 4 + 1 + 1 + 2 + 1 = 16.

**TCP above ₱9,000,000.** The single-digit band has no code for it (OPS §4.2; OCT R38). Such a sale is blocked and cannot be recorded until JA&D or the company defines its band code (owner follow-up ruling, 2026-11-12).

### 5.2 Issuance

1. The number is issued once, when the sale is recorded with its reservation fee payment. YYMMDD is the date the reservation fee is paid.
2. **Alternative entry (JAD Rev 7 §5).** When a buyer pays a large down payment with no reservation period, the number is issued at the Contract to Sell. YYMMDD is the CTS signing date, and NNNN takes the next number in the same monthly sequence.
3. Before issuance the sale must carry: buyer details, property details (project name, unit or lot number, Property Owner name; more fields may be added later), TCP, payment scheme (Cash or Terms), term in months for Terms, Standard or Non-Standard, closing seller, and referrer if any (OPS §4.2). The closing seller and any referrer must each hold a JA&D accreditation number (section 6).
4. The IGP sequence is separate from the VIP sequence. Each restarts monthly (VIP at 00001, IGP at 0001) so a number never discloses more than one month's volume (OCT R38; JAD Rev 7 §8c).
5. A number is never reused, not after cancellation and not across periods (OCT R38).
6. The Series Number is a tracking reference. It is not a contract number and does not legally link JA&D, the Property Owner and AFhomes; each party's document stands on its own (JAD Rev 7 §2, §8f).

### 5.3 Frozen content, cancel and reissue (JAD Rev 7 §6, §8d; OPS §4.2; OCT R38)

1. Date, sequence, TCP band, payment scheme, term and clause flag are frozen once issued.
2. A change of property (unit), TCP band or payment scheme is never an edit. The old number stays in history with status Replaced, linked to the new number; a new number is issued with the next NNNN and the new date, and carries a "Replaces" link to the old number. Payments already made move to the new number and commission is recalculated on the new TCP (owner follow-up ruling, 2026-11-12). This deliberately differs from the VIP downgrade rule (OCT R32; doc 08 §14.1), where the new sale earns from zero.
3. A TCP correction within the same band, and a referrer correction, are allowed until the first receipt on the sale is approved; after that only the Administrator or the Super Administrator may correct them, and never once commission has been released (OPS §4.2; OCT R30). A TCP correction that changes the band is refused and handled by cancel and reissue.
4. A keying error found before any receipt is approved is handled by cancelling the sale and entering it again (OPS §4.2).
5. Number status is kept beside the number, never inside it (JAD Rev 7 §6c).

### 5.4 Examples (synthetic)

- Terms: reserved 2026-11-15, first IGP reservation of November, TCP ₱1,800,000, 12-month terms, Standard → `A26111500012T12S`.
- Cash: reserved 2026-11-20, second of the month, TCP ₱850,000, spot cash, Standard → `A26112000021C01S`.
- Cancel and reissue: on 2026-12-03 the buyer of `A26111500012T12S` switches to a ₱2,600,000 property → `A26111500012T12S` Replaced; new `A26120300013T12S` with "Replaces: A26111500012T12S"; the payments already made move to the new number and commission is recalculated on ₱2,600,000.

---

## 6. Sellers, Referrers and JA&D Accreditation (NUM §8, §9; JAD Rev 7 §10)

1. The JA&D accreditation number is stored on the seller record, separately from the AA number, with its own approval date and one-year validity. Each accreditation renews under its own issuer's rules and on its own date. A JA&D renewal issues a new JA&D number that replaces the old one; IGP Series Numbers already issued do not change.
2. Only the closing seller is linked to the sale, written `SERIESNUMBER - JA&D NUMBER`, for example `A26111500012T12S - JAI26070001`. This applies to IST and OST alike. No other seller's number is attached.
3. A referrer is recorded separately on the sale and is not part of this link (owner ruling R5; doc 04).
4. A JA&D number is never linked to a VIP Number; it belongs only to IGP documents (NUM §9).
5. A seller or referrer who is suspended, or resigned or terminated with an end date before the sale date, cannot be on a new IGP sale (OCT R28). An expired accreditation does not bar a sale; it is accepted with a reminder (JAD Rev 7 §10; OCT R37).
6. A seller without a JA&D accreditation number cannot be the closing seller or the referrer on an IGP sale (owner follow-up ruling, 2026-11-12).

---

## 7. Receipts and Collection Thresholds

1. IGP receipts follow doc 07: entered with a required, system-wide unique OR or bank reference; only an approved receipt counts; reversals and returned cheques are dated entries.
2. Approval stamps, when first reached: the Closed Deal date (10%), the Stage 1 date (40%) and the Full Payment date (100%) (OPS §4.3).
3. The Closed Deal threshold in force when the number is issued is frozen on the sale. A later change by the Administrator or the Super Administrator binds only sales issued after it (OCT R31). The shipped IGP figure is 10%.
4. A receipt dated in a closed month is admitted into the first open month (owner ruling R7).
5. A sale with no approved receipt for 90 days is listed for review; the Administrator or the Super Administrator may mark it Defaulted (owner ruling R7; OPS §4.4).
6. **Cancellation and refund.** IGP refund amounts and any cancellation charges are decided outside the system by the Property Owner or JA&D. The system records the cancellation, the refund amount and refund date, and any clawback (doc 08 §14) (owner follow-up ruling, 2026-11-12).

---

## 8. Commission (DSC and DRI)

1. Per-sale commission goes only to the closing seller (DSC) and the referrer (DRI), IST or OST (doc 08).
2. The DSC rate is taken from the closing seller's IGP rate and the DRI rate from the referrer's IGP rate, both frozen on the sale when the Series Number is issued (OPS §4.2; OCT R30). Rates are maintained on the seller record by the Administrator or the Super Administrator; no values are set here.
3. Basis: the contract TCP.
4. Release: 40% of each commission in the month the sale reaches Stage 1, and the remaining 60% in the month of full payment; each paid in that month's month-end payout (OPS §5, §6.1; AUG R13).
5. Commission attached to a sale is paid whatever happens to the person later: resignation, termination (including for fraud), or suspension. An IGP remainder falling due years later on full payment is still paid (OCT R27).
6. Clawbacks follow doc 08 (owner ruling R9; OCT R32 to R34): cancellation, rescission after 90 days, downgrade, default over 90 days, and a returned cheque. Each is raised against the person paid, stage by stage.

Example: TCP ₱1,800,000. Closed Deal when approved collections reach ₱180,000; Stage 1 at ₱720,000. If the frozen DSC amount is D, 0.4 × D is released in the Stage 1 month and 0.6 × D in the full-payment month.

---

## 9. Team Credit and Allowances

1. An IGP sale counts toward BA, PA and PB only once it is a Closed Deal (10%), at the threshold frozen on the sale (OPS §6.2).
2. Team Closed Deal TCP includes VIP and IGP (OCT, team KPI definition). OST production rolls up to the IST leaders above it (OCT R29).
3. Assumed collection credit on an inherited IGP account is 20% of the month's collections (AUG R23). Example: ₱1,000,000 collected on an inherited IGP account adds ₱200,000.
4. Allowance computation and team attribution follow doc 08 and doc 02.

---

## 10. Document Checklist (JAD Rev 7 §5)

All documents carry the same Series Number. The platform records each document's status, date and signers; it does not generate documents.

| Step | Trigger | Document | Signed by |
|---:|---|---|---|
| 1 | Reservation fee paid | Reservation & Acknowledgement (number issued) | JA&D / Buyer |
| 2 | First installment paid (Terms) | (a) Contract to Sell; (b) Goodwill of VIP grant | (a) Property Owner; (b) AFhomes (tenant) |
| 3 | Full payment (Terms) or cash payment (Cash) | Deed of Absolute Sale | Property Owner |
| 4 | After completion | Formal VIP Grant; Long-Term Lease Agreement; Special Power of Attorney | AFhomes (tenant) |

For a Cash sale, Step 2 is skipped. Under the alternative entry, Step 1 does not exist and the number starts at the CTS.

---

**Owner follow-up (2026-11-12).** Include grant paperwork in the AFhomes-channel prototype as a status, date and signer checklist. Grant benefits and IGP-linked VIP membership creation require signed terms. Keep the price-band block above ₱9 million. Use Replaced for the documented reissue flow and route imported `SUPERSEDED` statuses for review until JA&D supplies the definition.

## 11. Roles

Align with doc 01 and the overriding authority rule (owner, 2026-11-12):

- **Super Administrator and Administrator:** everything, including cancel and reissue, corrections after the first approved receipt, Defaulted marking, threshold changes and rate changes. Self-approval is allowed and audited.
- **Clerk:** enters IGP sales, receipts and checklist entries; cannot approve.
- **Finance:** approves receipts and pays commission.
- **Sellers:** view only; SVD, SSM and SM see their own and their team's IGP sales and pay; OST see only their own.

---

## 12. Audit

Audit: sale entry and approval; Series Number issuance; cancel and reissue with the "Replaces" link; corrections with reason; receipt approval, reversal and returned cheque; threshold stamps; status changes (Cancelled, Rescinded, Downgraded, Defaulted, reinstated); commission release, payout and clawback; checklist updates; JA&D accreditation changes. Each record keeps actor, timestamp, previous and resulting values, reason and reference. Nothing is deleted.

---

## 13. Acceptance Criteria

- [ ] Only Partner Code `A` sales are recorded; `J` channel sales are not.
- [ ] Series Number is 16 characters in the section 5.1 format, with a monthly IGP sequence separate from VIP.
- [ ] Number issued once, at reservation fee payment or at the CTS for the alternative entry.
- [ ] Frozen segments never edited; property, band or scheme change uses cancel and reissue with "Replaces".
- [ ] Cancelled numbers kept and never reused.
- [ ] TCP above ₱9,000,000 is blocked until JA&D or the company defines its band code (section 5.1).
- [ ] JA&D number stored separately on the seller with its own dates; used only on IGP sales.
- [ ] Only the closing seller's JA&D number is linked to the Series Number.
- [ ] Suspended or departed persons refused on new sales; expired accreditation accepted with a reminder.
- [ ] A seller without a JA&D accreditation number refused as closing seller or referrer.
- [ ] Cancellation records the refund amount and date decided outside the system, and any clawback.
- [ ] Closed Deal at the frozen 10% threshold; Stage 1 at 40%; full payment at 100%.
- [ ] DSC and DRI rates frozen at issue; 40% / 60% staged release in month-end payouts.
- [ ] Commission not stopped by the person's status; clawbacks on sale events only.
- [ ] IGP counts in team KPI; 20% assumed collection credit.
- [ ] Document checklist with dates and signers; no document generation.
- [ ] Clerk enters only; Admin and Super Admin self-approval audited.

---

## 14. Outstanding Dependencies

- Doc 08 (R8/R9 rewrite) carries the general commission, allowance and clawback rules this document refers to.
- Cross-references to this document are in place in docs 02, 03, 08, 11, 12 and 13 (consistency update, 2026-11-12).
- Frontend: IGP sales register, Series Number allocator, and checklist are on the frontend backlog; nothing is built yet.

### Outstanding owner decisions

1. ~~**Unit details.**~~ Settled 2026-11-12 (follow-ups): project name, unit or lot number, Property Owner name, TCP and payment plan; more fields may be added later (section 5.2).
2. ~~**Cancel and reissue effects.**~~ Settled 2026-11-12 (follow-ups): payments move to the new number, commission is recalculated on the new TCP, and the old number stays in history as Replaced (section 5.3). Former wording: Whether approved receipts move from the cancelled number to the new number, whether released commission on the old number is clawed back or carried over, and whether rates and the threshold are frozen again on the new number. The sources define the numbering only.
3. **TCP above ₱9,000,000.** Decided 2026-11-12 (follow-ups): such a sale stays blocked until JA&D or the company defines its band code (section 5.1). The band code itself is still an open input from JA&D or the company; the block lifts only when it is supplied.
4. ~~**Missing JA&D accreditation.**~~ Settled 2026-11-12 (follow-ups): a seller without a JA&D accreditation number cannot be the closing seller or the referrer (section 6).
5. ~~**Reservation fee refund and cancellation charges.**~~ Settled 2026-11-12 (follow-ups): decided outside the system by the Property Owner or JA&D; the system records the cancellation, refund amount and date, and any clawback (section 7).
6. **The buyer's VIP grant: waiting for the company's IGP VIP grant terms.** The Goodwill VIP Grant (after the first installment) and the Formal VIP Grant (after completion) are issued by AFhomes as tenant, but their benefits are not defined in any company paper (all current source texts searched, 2026-11-12). Nothing is invented. Former wording: What the Goodwill of VIP grant and the Formal VIP Grant confer (privileges, Stay Points) and whether they create a VIP membership record under docs 06 and 09.
7. **Number status SUPERSEDED.** JAD Rev 7 §6c lists ACTIVE, CANCELLED and SUPERSEDED but defines only CANCELLED; when SUPERSEDED applies is not defined.

---

## Completion Report

- **File created:** `docs/business-rules/14-igp-sales.md` (2026-11-12, owner ruling R13).
- **Sources:** JAD Rev 7 §1 to §10; OPS v2.3 §4.2 to §4.4, §5, §6.1, §6.2; AUG R13, R23; OCT R27 to R34, R37, R38; NUM §8, §9.
- **Outstanding:** section 14.
- **Change scope:** documentation only. No application code, database, or Git operation.

---

## Owner rulings amendment (2026-11-12, round R13)

1. **Scope.** Only IGP sales made through the AFhomes channel (Partner Code A). JA&D's own-channel sales stay in JA&D's books.
2. **IGP Series Number.** 16 characters, `A YYMMDD NNNN T P MM S`, issued once when the reservation fee is paid; NNNN monthly from 0001; T the TCP band in whole millions rounded up; never edited; a change of property, TCP band or scheme cancels the number and issues a new one.
3. **JA&D accreditation.** Stored separately on the seller with its own approval date and one-year validity; renews under its own rules; used only on IGP sales. VIP sales use only the AFhomes AA number.
4. **Pay.** Closed Deal at 10%; DSC and DRI at each person's IGP rate frozen at issue; 40% released at Stage 1 and the rest at full payment, in month-end payouts; paid even if the person has left (OCT R27); clawbacks per R9; assumed credit 20% (AUG R23); IGP counts in team KPIs.
5. **Documents.** Checklist under the same Series Number with dates and signers; not generated.
6. **Gaps.** Items found in the sources that need an owner decision are listed in section 14.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ. Item numbers follow the master follow-up list in `docs/implementation/decisions-and-gaps.md` (hence the gaps between 9 and 27); do not renumber.

7. **TCP above ₱9M.** An IGP sale with a TCP over ₱9,000,000 is blocked until JA&D or the company defines its band code (section 5.1). The band code is still an open input; nothing is invented.
8. **JA&D accreditation required.** A seller without a JA&D accreditation number cannot be the salesperson (closing seller) or the referrer on an IGP sale (sections 5.2 and 6).
9. **Refunds.** IGP refund amounts are decided outside the system by the Property Owner or JA&D. The system records the cancellation, the refund amount and date, and any clawback (section 7).
27. **IGP property details.** The sale records the project name, unit or lot number, Property Owner name, TCP and payment plan. More fields can be added later (section 5.2).
28. **Cancel and reissue.** When a Series Number is cancelled and reissued (change of unit, TCP band or scheme), the payments already made move to the new number, commission is recalculated on the new TCP, and the old number stays in history with status Replaced, linked to the new number (section 5.3). This differs from the VIP downgrade rule (OCT R32), where the new sale starts from zero; the owner chose this deliberately for IGP re-numbering.
29. **Buyer's VIP grant.** The benefits of the IGP buyer's Goodwill VIP Grant (after the first installment) and Formal VIP Grant (after completion), both issued by AFhomes as tenant, are not defined in any company paper; all current source texts were searched on 2026-11-12. Outstanding owner item: waiting for the company's IGP VIP grant terms (section 14). Nothing is invented.
