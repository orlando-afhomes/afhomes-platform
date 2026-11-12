# AFHomes Platform — Sales Performance Reporting Business Rules

> Single source of truth for **Sales Network dashboard reporting, Confirmed vs Pending Sales, payment reversals, reconfirmations, and contract price amendments**.
> Sales Network structure: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Accreditation: `docs/business-rules/03-ist-ost-accreditation.md`.

---

## 1. Purpose and Scope

This document defines the approved Sales Performance Reporting business rules for AFHomes Platform.

It governs:

- Sales Network dashboard views (My Sales, Team Sales)
- Sales status breakdown (Confirmed, Pending, Overall Recorded)
- Confirmed Sales recognition conditions
- Reservation-only transactions
- Contract-based sales value
- Reporting date and period
- Stage 1 and Full Payment milestone dates
- Month close
- Defaulted sales
- Payment reversals and reconfirmations
- Contract price amendments

IGP sales are in scope and follow `docs/business-rules/14-igp-sales.md` for their own thresholds and numbering; this document's count structure applies to them as that document states. An IGP sale reaches Closed Deal at 10% approved collection of its TCP, at the threshold frozen on the sale (doc 14 §7).

It does not define commission calculations, VIP activation requirements, refund entitlement rules, payment installment schedules, or contract cancellation authorization. Those belong to their respective modules.

---

## 2. Dashboard Views

The Sales Network dashboard supports two primary views:

- **My Sales** — sales personally recorded by the logged-in member.
- **Team Sales** — for authorized IST managers, includes the manager's own direct sales plus authorized downline sales.

Count each distinct sale only once. A nested genealogy must not cause double counting.

Example: Own sales ₱200,000 + Downline sales ₱800,000 = Combined Team Sales ₱1,000,000.

---

## 3. Sales Status Breakdown

Display separately:

- **Confirmed Sales**
- **Pending Sales**
- **Overall Recorded Sales**

**Overall Recorded Sales = Confirmed Sales + Pending Sales**

Cancelled and Rejected sales are excluded from those totals. Keep Cancelled and Rejected records available for authorized historical review and audit.

### 3.1 Dashboard Sales Counts (owner decision, 2026-11-10)

Status: **RESOLVED.** This settles the dashboard count presentation. Do not reopen it merely because earlier sections do not specify counts. Item 1's confirmation trigger was re-decided by owner ruling R7 (2026-11-12); the rest of the count structure stays.

1. **Confirmed Sales Count** — number of distinct sales currently Confirmed (Closed Deal) whose Closed Deal date falls within the selected reporting period. A sale reaches Closed Deal when approved receipts reach 25% of the contract price (section 4).
2. **Pending Sales Count** — number of distinct sales currently awaiting confirmation. This is a real-time snapshot, independent of the selected date range. It includes reservation-only and other unconfirmed sales and excludes Cancelled and Rejected sales, and sales shown under another non-Active status such as Defaulted (section 4.6).
3. **Overall Recorded Sales Count** — number of distinct sales currently Confirmed or Pending, taken from the same current snapshot for both statuses. Never add a period-filtered Confirmed Count to an unfiltered Pending Count.
4. **Sales Value** — monetary values stay separate from transaction counts. Confirmed Sales Value uses the full qualifying contract value and the applicable dated adjustments (sections 4.2, 5, 6), not collected payments.
5. **Reversals** — a reversal updates the sale's current status while the original reporting history and dated adjustments are preserved. A reconfirmation never duplicates the underlying sale.
6. **Centralization** — one shared sales KPI calculation serves the Admin, Sales, Finance, and Reporting dashboards, with role-based record visibility applied consistently.
7. **Labeling** — each KPI states whether it covers the selected reporting period or is a current snapshot.

---

## 4. Confirmed Sales Recognition

**Owner ruling R7, 2026-11-12.** A VIP sale counts as sold (Closed Deal / Confirmed Sale) when 25% of the contract price has been collected through approved receipts (doc 07 §5.2; workbook OPS §4.3). This replaces the earlier rule "finalized contract plus Finance verification of the required payment". An IGP sale counts at 10% approved collection instead (owner ruling R13; doc 14 §7); the rest of this section applies to it with that threshold.

A sale counts at 25% once an Administrator has approved the sale record; receipts on a sale can be approved only after the sale itself is approved (OPS §4.2). Formal contract finalization (doc 05) is tracked separately and is not required for the count (owner follow-up ruling 3, 2026-11-12).

### 4.1 Reservation-Only Transactions

A reservation-only transaction remains Pending even if its reservation receipt is approved, until approved receipts reach 25% of the contract price.

### 4.2 Contract-Based Sales Value

Confirmed Sales report the full confirmed contract price, not merely cash already collected.

Example: Contract price ₱240,000; approved receipts ₱60,000 (25%); outstanding balance ₱180,000; Confirmed Sales value ₱240,000.

Finance separately tracks actual payments, collections, and balances. Future installment payments do not repeatedly increase the same sale's recognized contract value.

### 4.3 Reporting Date

The reporting date is the date approved receipts first reach 25% of the contract price (the Closed Deal date). Preserve the original sale recording date separately.

Example: Sale recorded October 20; approved receipts reach 25% on October 28; Confirmed Sales performance period October 28.

The Closed Deal, Stage 1 and Full Payment dates are each stamped as the later of the triggering receipt's own date and the date of the latest receipt already counted. Where receipts are approved out of date order, the stamp may be late, never early (company rule OCT O3, Ruling Addendum 2026-09-24 Issue 3, clarifying AUG R12).

If a member transfers teams before the Closed Deal date, the sale still belongs to the original team at sale recording.

### 4.4 Stage 1 and Full Payment Dates

The date approved receipts first reach 40% of the contract price (Stage 1) and the date they reach 100% (Full Payment) are stamped and tracked separately (OPS §4.3). They follow the same stamping rule as section 4.3 (OCT O3). They do not change the sale's Closed Deal date or count it again. Commission release uses these dates as doc 08 states; activation eligibility uses Full Payment (doc 07 §16).

### 4.5 Month Close

The Administrator or the Super Administrator closes a month (owner ruling R7 item 2; OPS §5 step 3). After a month is closed, its figures never change. A receipt dated in a closed month is admitted into the first open month and counts there (doc 07 §9.1). Any later event that affects a closed month (reversal, returned cheque, cancellation, default, price amendment) is recorded as a dated adjustment in the open month in which it happens (sections 5 and 6).

### 4.6 Defaulted Sales

The system lists sales with no approved receipt for 90 days (owner ruling R7 item 3; OPS §4.4). The Administrator or the Super Administrator decides which listed sales to mark Defaulted. If the buyer pays again (an approved receipt), the sale returns to Active. The original sale, its history and its dates are preserved. Clawback and reinstatement effects on commissions are governed by doc 08.

A Defaulted sale, like any sale whose status is not Active, loses its Closed Deal at once (company rule OCT R33). It leaves the Confirmed count and is shown under its own status, not as Pending. A Defaulted buyer may keep paying and those receipts are counted. Reinstatement to Active restores the Closed Deal. Effects on a closed month are recorded as dated adjustments in the open month (section 4.5).

---

## 5. Payment Reversals and Reconfirmations

If an approved receipt is reversed (doc 07 §14) and approved receipts fall below 25% of the contract price:

- Return the sale to Pending.
- Remove it from current Confirmed Sales.
- Preserve the original sale and contract.
- Preserve historical confirmation and reversal records.
- Do not duplicate the sale.

### 5.1 Different-Month Reversal

Example: October +₱240,000 original confirmation; November −₱240,000 payment reversal. Maintain October's original reporting history and record the negative adjustment in November. Current Confirmed Sales excludes the reversed transaction.

### 5.2 Replacement Payment

When a replacement receipt is approved and approved receipts again reach 25% of the contract price:

- Restore Confirmed status.
- Record a new positive adjustment in the month of reconfirmation.
- Preserve earlier adjustment records.

Example: October +₱240,000; November −₱240,000; December +₱240,000. Net recognized amount ₱240,000. Do not create a second VIP sale.

---

## 6. Contract Price Amendments

For authorized changes to an already confirmed contract price, report the difference in the month the amendment is officially approved.

Example: Original confirmed price ₱240,000; amended price ₱220,000; adjustment −₱20,000; net recognized sales value ₱220,000. If the amended price increases, record a corresponding positive adjustment.

Preserve original price, revised price, approval date, actor, reason and amendment record, and full adjustment history. Do not overwrite historical sales events or create duplicate sales.

The detailed authorization workflow for contract amendments is outside the scope of this documentation task.

---

## 7. Historical Ownership and Audit Principles

Every relevant operation must preserve historical accountability. Document audit requirements for: account creation; parent assignment; team transfer; genealogy reassignment; IST/OST conversion; promotion and demotion; accreditation renewal; accreditation date correction; AA number replacement and restoration; sales confirmation (Closed Deal), Stage 1 and Full Payment dates; payment reversal; sales reconfirmation; contract price amendment; month close; late-receipt admission; Defaulted marking and return to Active.

Important invariants:

- A sale retains its original salesperson and team ownership.
- Later transfers do not rewrite prior sales ownership.
- Historical genealogy remains traceable.
- Administrative activity preserves actor and timestamp.
- Reversible business states do not erase earlier events.
- Distinct adjustments must not duplicate the underlying sale.
- Combined operations that require atomicity cannot partially succeed.

Distinguish current state from historical records.

---

## 8. Examples

### Team Sales Calculation

Own sales ₱200,000 + downline sales ₱800,000 = Team Sales ₱1,000,000 (no double counting).

### Pending vs Confirmed

Reservation-only transaction with an approved reservation receipt remains Pending; becomes Confirmed (Closed Deal) when approved receipts reach 25% of the contract price.

### Reversal and Reconfirmation

October +₱240,000; November −₱240,000; December +₱240,000; net ₱240,000; one underlying sale.

### Contract Price Amendment

Original ₱240,000 → amended ₱220,000; adjustment −₱20,000 in approval month; net ₱220,000.

---

## 9. Acceptance Criteria

- My Sales shows personally recorded sales.
- Team Sales includes own plus authorized downline sales without double counting.
- Confirmed and Pending Sales remain separate.
- Cancelled and Rejected sales are excluded from totals.
- Full contract price is recognized once, when approved receipts reach 25% of the contract price.
- The Closed Deal date determines the reporting period; Stage 1 and Full Payment dates are tracked separately.
- Closed months never change; late receipts and later events land in the first open month.
- Sales with no approved receipt for 90 days are listed; only the Administrator or the Super Administrator marks Defaulted; payment returns the sale to Active.
- Reversals, reconfirmations, and price amendments use dated adjustments.
- No unapproved commission formulas introduced.
- Dashboard counts follow section 3.1: Confirmed Count by period, Pending and Overall Recorded Counts as current snapshots, each labeled accordingly.

---

## 10. Deferred / Requires Business Approval

- Commission calculation rules (separate Commission Business Rules).
- VIP activation requirements, refund entitlement rules, payment installment schedules, contract cancellation authorization (respective modules).

---

## Completion Report

- **File created/updated:** `docs/business-rules/13-sales-performance-reporting.md`
- **Sections:** Purpose and scope; dashboard views; status breakdown; Confirmed Sales recognition; payment reversals and reconfirmations; contract price amendments; historical ownership and audit; examples; acceptance criteria; deferred.
- **Confirmation:** All approved sales performance reporting rules represented.
- **Unresolved ambiguity:** None for approved rules at the time of writing. Open items after the 2026-11-12 rulings are listed in section 10.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.

## Owner rulings amendment (2026-11-12, rounds R6, R7, R11)

These rulings are authoritative and take precedence over earlier text in this document where they differ. They re-decide, with the owner, the 2026-11-10 dashboard confirmation trigger; the rest of the section 3.1 count structure (Confirmed, Pending, Overall Recorded, labeling, one shared calculation) stays. Workbook source: Commission System User Manual v2.3 (OPS) §4.3, §4.4 and §5.

1. **Closed Deal / Confirmed Sale (R7 item 1).** A VIP sale counts as sold when 25% of the contract price has been collected through approved receipts (OPS §4.3). This replaces "finalized contract plus Finance verification of the required payment" in sections 3.1 item 1 and 4. Sections 3.1, 4, 4.1, 5, 8 and 9 updated.
2. **Reporting date (R7 item 1).** The reporting date is the date the 25% is reached (the Closed Deal date). Section 4.3.
3. **Milestone dates (R7 item 1).** The 40% (Stage 1) and 100% (Full Payment) dates are stamped and tracked separately. Section 4.4.
4. **Month close (R7 item 2).** The Administrator or the Super Administrator closes a month; closed figures never change. A receipt dated in a closed month counts in the first open month (R6 item 5). Section 4.5.
5. **Defaults (R7 item 3).** Sales with no approved receipt for 90 days are listed. The Administrator or the Super Administrator marks a sale Defaulted; it returns to Active if the buyer pays again. Clawback effects are in doc 08. Section 4.6.
6. **Approved receipts (R6).** "Approved receipt" means a receipt approved by Finance, the Administrator or the Super Administrator (doc 07 §5.2). Reversals are dated, never deletions (doc 07 §14). Section 5.
7. **IGP (R11 item 2).** IGP sales are in scope; their thresholds and numbering are in `docs/business-rules/14-igp-sales.md`. Section 1.
8. **Open, not decided here** *(all three settled 2026-11-12, follow-ups below)*:
   - Whether contract finalization is still required before the 25% count. Doc 05 §13 still requires a finalized contract; the workbook has no separate finalization step (OPS §4.2 only requires the sale to be approved before its receipts).
   - Whether the Closed Deal date is the crossing receipt's own date or its approval date.
   - How a Defaulted sale appears in the Confirmed, Pending and Overall Recorded counts.

## Consistency update (2026-11-12)

1. **IGP Closed Deal (owner ruling R13).** Sections 1 and 4 now state that an IGP sale reaches Closed Deal at 10% approved collection, at the threshold frozen on the sale (doc 14 §7). No VIP rule changed.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

1. **Counting at 25% (owner ruling).** A sale counts at 25% once the Administrator has approved the sale record. Formal contract finalization is tracked separately and is not required for the count (workbook OPS §4.2). Section 4.
2. **Stamp date (company rule OCT O3).** The Closed Deal, Stage 1 and Full Payment stamp date is the later of the triggering receipt's date and the latest receipt already counted (Ruling Addendum 2026-09-24 Issue 3, O3 clarifying AUG R12). Sections 4.3 and 4.4.
3. **Defaulted and other non-Active sales (company rule OCT R33).** A Defaulted (or any non-Active) sale loses its Closed Deal at once. It leaves the Confirmed count and shows under its own status; reinstatement restores it. Sections 3.1 and 4.6.
