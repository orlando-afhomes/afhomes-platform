# AFHomes Platform — IST/OST Accreditation Business Rules

> Single source of truth for **IST/OST accreditation lifecycle, renewal, date corrections, and AA number generation**.
> Sales Network structure: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales performance reporting: `docs/business-rules/13-sales-performance-reporting.md`.

---

## 1. Purpose and Scope

This document defines the approved accreditation business rules for IST (Internal Sales Team) and OST (Outsourcing Sales Team).

Both IST and OST accreditation is valid for one year and requires annual renewal. This includes every IST manager: SVD, SSM, and SM.

It does not define commission calculations, VIP activation, refund rules, payment schedules, or contract cancellation authorization.

---

## 2. Terms and Definitions

- **AA Number** — official accreditation identifier. IST uses `AAI` prefix; OST uses `AAO` prefix.
- **Original Accreditation Date** — the date the member was originally accredited or accepted into the company, manually entered from actual company records.
- **Expiration Date** — one calendar year after the original accreditation date (or after renewal, per renewal rules).
- **Renewal** — annual extension of accreditation validity.
- **Date Correction** — authorized correction of an incorrectly encoded original accreditation date.

---

## 3. Original Accreditation Date

The original accreditation date is manually entered by authorized personnel from actual company records. It represents when the member was originally accredited or accepted into the company.

Do not automatically use account creation date, data encoding date, import date, conversion date, or renewal date.

The original accreditation date must be stored as a complete calendar date. The initial accreditation expiration date is calculated one year from the original accreditation date.

---

## 4. Expiration Cutoff

Accreditation remains valid throughout its stated expiration date in Philippine time.

Example: Expiration date October 14, 2027 → valid through October 14, 2027, 11:59:59 PM Philippine time; expired beginning October 15, 2027, 12:00 AM Philippine time.

Use `Asia/Manila` consistently when evaluating date boundaries.

---

## 5. Renewal Eligibility

Renewal is permitted:

- Within 30 calendar days before expiration, inclusive.
- On the expiration date.
- After expiration.

Renewal earlier than the permitted 30-day window is not allowed. Prevent accidental duplicate renewals or repeated submissions from extending validity more than intended.

### 5.1 Early Renewal

For renewal on or before expiration:

**New expiration = Existing expiration + 1 calendar year**

Example: Current expiration October 14, 2027; renewal performed September 20, 2027; new expiration October 14, 2028.

### 5.2 Late Renewal

For renewal after expiration:

**New expiration = Actual renewal date + 1 calendar year**

Example: Previous expiration October 14, 2027; renewal performed January 20, 2028; new expiration January 20, 2029.

### 5.3 Renewal Authorization

Authorized personnel with Accreditation Management module access may renew directly. No additional Admin/Super Admin approval is required.

### 5.4 Suspended and Deactivated Accounts

Accreditation renewal is allowed even when the underlying account is Suspended or Deactivated. Renewal does not automatically change the account's administrative status.

After renewal:

- Active account + valid accreditation: login access is restored automatically.
- Suspended account: login remains blocked.
- Deactivated account: login remains blocked.

Account reactivation follows the approved Organization Management rules.

### 5.5 Expiration Reminders

Provide dashboard-based expiration indicators beginning 30 days before expiration. IST and OST members see their own accreditation status. Authorized Accreditation Management users can see members approaching expiration. No email or SMS reminder is required for this business-rule version.

### 5.6 Genealogy During Expiration

Expired accreditation does not remove the member from the genealogy. The member remains visible with an appropriate expired-accreditation indicator. Valid downline members continue operating independently.

---

## 6. Accreditation Date Corrections

Authorized Accreditation Management personnel may correct an incorrectly encoded original accreditation date.

Require: correction reason, previous date, new date, authorized actor, correction timestamp, audit history.

### 6.1 Effect on Expiration

If no renewal has occurred: recalculate the expiration date based on the corrected original accreditation date.

If renewal history already exists: preserve the existing current expiration date and prior renewal transactions. Do not silently recalculate historical renewal results.

A date correction is not considered a renewal.

### 6.2 Effect on AA Number

If the corrected date changes the original accreditation year or month:

- Update the `YYMM` segment of the current AA number.
- Preserve the member identity.
- Preserve previous AA numbers and audit history.
- Apply collision handling if the resulting number is already reserved for another member.

Do not silently modify another member's AA number.

---

## 7. Official AA Number Generation

IST and OST share **one continuous sequential generator**. Do not maintain separate IST and OST sequence counters. Do not reset the sequence monthly or yearly.

### 7.1 Official Format

`AAI` or `AAO` + `YYMM` + sequential number

Examples: `AAI26100001`, `AAO26100002`, `AAI26100003`

Where `AAI` = Internal Sales Team, `AAO` = Outsourcing Sales Team, `YYMM` = Year and month of the original accreditation date, sequential portion = shared sequence with minimum width of four digits.

### 7.2 Sequence Rules

The sequential portion:

- Starts with a minimum of four digits.
- Uses leading zeros as required.
- Can grow beyond four digits.
- Has no artificial maximum width.
- Is allocated from the common IST/OST sequence.
- Does not reset when the month or year changes.

Examples: sequence 1 → `0001`; 9,999 → `9999`; 10,000 → `10000`.

The `YYMM` is based on the original accreditation date, not the number-allocation date.

### 7.3 Historical or Backdated Accreditation

Authorized personnel may enter an actual accreditation date from a previous year or month.

Example: Original accreditation January 2025; next available shared sequence `0100`; generated number `AAI25010100`.

Do not change the `YYMM` merely because the member was encoded later.

### 7.4 Conversion Numbering

Normally, an IST/OST conversion changes only the prefix.

Example: `AAI26100001` → `AAO26100001`. Preserve the remaining characters whenever the resulting identifier is available.

### 7.5 Number Reservations

Every previously issued AA identifier is permanently associated with its original member. Old AA numbers cannot be reassigned to another member. If the same member previously owned the target identifier, it may be restored. If the target identifier belongs to another member, allocate a new unique identifier from the same shared sequence.

Example of conflict resolution: proposed target identifier already belongs to another member; allocate the next globally available shared sequence; construct the appropriate `AAI` or `AAO` identifier using the member's original accreditation `YYMM`.

Preserve all number changes, corrections, and conversions in audit history.

### 7.6 Concurrency and Integrity

The future implementation must guarantee unique allocation under simultaneous requests. Document invariants such as: no duplicate active AA identifiers; no reuse of another member's historical identifier; no independent IST/OST sequences; atomic allocation and identity updates; idempotent handling of repeated requests. Do not implement these mechanisms yet.

---

## 8. Combined Renewal, Transfer, and Conversion

The Accreditation Management workflow may support renewal only, renewal with team transfer, or renewal with IST/OST conversion. Where conversion requires downline reassignment, include those changes in the same transaction.

**All-or-nothing:** If any requested operation fails validation or persistence, do not save the renewal, transfer, conversion, partial descendant reassignment, or partial AA number update. A successful operation records complete audit history. Transfers and conversions must also remain possible separately, without requiring renewal.

---

## 9. Account Status and Login Eligibility

A Sales Network member may log in and sell only when the account is Active and accreditation is valid. If accreditation expires, login and personal sales activity are blocked. If an account is Suspended or Deactivated, login and personal sales activity remain blocked even when accreditation is valid.

---

## 10. Examples

### Renewal Example (Early)

Current expiration October 14, 2027; renewal performed September 20, 2027; new expiration October 14, 2028.

### Renewal Example (Late)

Previous expiration October 14, 2027; renewal performed January 20, 2028; new expiration January 20, 2029.

### Expiration Cutoff Example

Expiration October 14, 2027 → valid through 11:59:59 PM PHT on October 14, 2027; expired from 12:00 AM PHT on October 15, 2027.

### AA Number Example

Original accreditation date October 2026, shared sequence 1 → `AAI26100001`.

### Backdated Example

Original accreditation January 2025, next shared sequence 100 → `AAI25010100`.

---

## 11. Acceptance Criteria

- IST and OST accreditation is annual.
- Original accreditation date is manually entered and not auto-derived.
- Expiration cutoff uses Philippine time.
- Renewal allowed within 30 days before expiration, on expiration date, or after.
- Early renewal extends from existing expiration; late renewal extends from actual renewal date.
- Renewal does not change account administrative status.
- Expired accreditation blocks login but preserves genealogy.
- Eligible downline continues operating independently.
- Date corrections update YYMM when necessary and preserve history.
- AAI/AAO use one continuous shared sequence with minimum four digits and no reset.
- YYMM comes from original accreditation date.
- No monthly sequence reset.
- Old AA identifiers remain reserved to original member.
- Combined operations are all-or-nothing.

---

## 12. Deferred / Requires Business Approval

- Email/SMS reminders (not required in this version).
- Commission effects of accreditation expiry or suspension (Commission Business Rules).
- VIP activation requirements, refund rules, payment schedules, contract cancellation (respective modules).

---

## Completion Report

- **File created/updated:** `docs/business-rules/03-ist-ost-accreditation.md`
- **Sections:** Purpose and scope; terms; original accreditation date; expiration cutoff; renewal eligibility and examples; date corrections; AA number generation; combined operations; account status and login; examples; acceptance criteria; deferred.
- **Confirmation:** All approved accreditation rules represented.
- **Unresolved ambiguity:** None for approved rules.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.