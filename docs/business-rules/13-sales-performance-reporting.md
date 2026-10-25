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
- Payment reversals and reconfirmations
- Contract price amendments

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

---

## 4. Confirmed Sales Recognition

A VIP transaction becomes Confirmed Sales only when:

1. The VIP sale or contract is finalized.
2. Finance verifies the payment required under the finalized contract and selected payment plan.

Both conditions must be satisfied.

### 4.1 Reservation-Only Transactions

A reservation-only transaction remains Pending even if Finance verifies the reservation fee. The transaction becomes Confirmed only after the required contract and payment conditions are satisfied.

### 4.2 Contract-Based Sales Value

Confirmed Sales report the full confirmed contract price, not merely cash already collected.

Example: Contract price ₱240,000; verified initial collection ₱10,000; outstanding balance ₱230,000; Confirmed Sales value ₱240,000.

Finance separately tracks actual payments, collections, and balances. Future installment payments do not repeatedly increase the same sale's recognized contract value.

### 4.3 Reporting Date

Use the Finance confirmation date for Confirmed Sales performance reporting, once all confirmation conditions are satisfied. Preserve the original sale recording date separately.

Example: Sale recorded October 20; Finance confirmation October 28; Confirmed Sales performance period October 28.

If a member transfers teams before Finance confirmation, the sale still belongs to the original team at sale recording.

---

## 5. Payment Reversals and Reconfirmations

If Finance reverses a previously verified required payment:

- Return the sale to Pending.
- Remove it from current Confirmed Sales.
- Preserve the original sale and contract.
- Preserve historical confirmation and reversal records.
- Do not duplicate the sale.

### 5.1 Different-Month Reversal

Example: October +₱240,000 original confirmation; November −₱240,000 payment reversal. Maintain October's original reporting history and record the negative adjustment in November. Current Confirmed Sales excludes the reversed transaction.

### 5.2 Replacement Payment

When Finance verifies a replacement payment and all confirmation conditions are again satisfied:

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

Every relevant operation must preserve historical accountability. Document audit requirements for: account creation; parent assignment; team transfer; genealogy reassignment; IST/OST conversion; promotion and demotion; accreditation renewal; accreditation date correction; AA number replacement and restoration; sales confirmation; payment reversal; sales reconfirmation; contract price amendment.

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

Reservation-only transaction with verified reservation fee remains Pending; becomes Confirmed only after contract finalization and required payment verification.

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
- Full contract price is recognized when both confirmation requirements are satisfied.
- Finance confirmation date determines the reporting period.
- Reversals, reconfirmations, and price amendments use dated adjustments.
- No unapproved commission formulas introduced.

---

## 10. Deferred / Requires Business Approval

- Commission calculation rules (separate Commission Business Rules).
- VIP activation requirements, refund entitlement rules, payment installment schedules, contract cancellation authorization (respective modules).

---

## Completion Report

- **File created/updated:** `docs/business-rules/13-sales-performance-reporting.md`
- **Sections:** Purpose and scope; dashboard views; status breakdown; Confirmed Sales recognition; payment reversals and reconfirmations; contract price amendments; historical ownership and audit; examples; acceptance criteria; deferred.
- **Confirmation:** All approved sales performance reporting rules represented.
- **Unresolved ambiguity:** None for approved rules.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.