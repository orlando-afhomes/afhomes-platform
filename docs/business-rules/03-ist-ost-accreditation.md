# AFHomes Platform — IST/OST Accreditation Business Rules

> Single source of truth for **IST/OST accreditation lifecycle, renewal, date corrections, and AA number generation**.
> Sales Network structure: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales performance reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> JA&D accreditation (IGP sales only): `docs/business-rules/14-igp-sales.md`.

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

## 5. Renewal (NUM v6.2 §8, OCT R39 and R40; owner ruling R3, 2026-11-12)

### 5.1 When a Renewal Is Recorded

A renewal is recorded in the month it actually takes place: the expiry month (the month of the valid-until date) or later, never earlier. Papers submitted early are held and recorded in the expiry month. A late renewal is accepted. Prevent duplicate renewals.

### 5.2 New Number and New Validity

- A renewal issues a **new AA number**. It takes the YY and MM of the renewal month and the next NNNN of that month, counted together with that month's new accreditations. The team letter (I or O) is unchanged.
- The renewed accreditation is valid for one year from the actual renewal date.
- Example: AAI26020001, accredited 10 Feb 2026 and valid until 10 Feb 2027, renews on 18 Feb 2027. It receives the next February 2027 number (say AAI27020015), valid until 18 Feb 2028.

### 5.2.1 The New Number Replaces the Old One

- Everything recorded under the old number carries over to the new number: sales, commission, team and upline links, referrer links, clawbacks, allowance history and reviews.
- The old number is kept in the AA Number History. It is never deleted and never issued again. If it is quoted, it resolves to the person's current number.
- VIP Numbers already issued do not change. Sales made after the renewal carry the new AA number.

### 5.2.2 Leavers

A person who resigned or was terminated is not renewed. If they return, they are accredited again under a new number.

### 5.3 Renewal Authorization

The Administrator (the company's Supervisor) or the Super Administrator (the company's Director) renews an approved seller, as for every other change to an approved seller record (section 9.1; owner authority rule, 2026-11-12). Each renewal is audited.

### 5.4 Suspended and Deactivated Accounts

Accreditation renewal is allowed even when the underlying account is Suspended or Deactivated. Renewal does not automatically change the account's administrative status.

After renewal:

- Active account: login access is restored automatically. An expired accreditation does not block login (owner ruling R3, §9).
- Suspended account: login remains blocked.
- Deactivated account: login remains blocked.

Account reactivation follows the approved Organization Management rules.

### 5.5 Expiration Reminders (OCT R40)

Reminder labels:
- **RENEWAL DUE** from one month before the valid-until date.
- **EXPIRED – GRACE** for one month after it.
- **CLOSED – NOT RENEWED** after the grace month.

CLOSED is a status and report label only. It blocks nothing; management decides any further action manually. IST and OST members see their own status on their dashboard. Authorized users see a list of people due or overdue for renewal. No email or SMS reminder is required.

### 5.6 Genealogy During Expiration

Expired accreditation does not remove the member from the genealogy. The member remains visible with an appropriate expired-accreditation indicator. Valid downline members continue operating independently.

---

## 6. Accreditation Date Corrections

The Administrator or the Super Administrator may correct an incorrectly encoded original accreditation date of an approved seller, as for every other change to an approved seller record (section 9.1).

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

## 7. Official AA Number Generation (NUM v6.2 §8; workbook default applied 2026-11-12)

IST and OST share **one monthly sequence** in one central register. There are no separate IST and OST counters, and numbers are never composed by hand.

### 7.1 Official Format

`A` + team owner + `I`/`O` + `YYMM` + `NNNN`, 11 characters, no dash.

Examples: `AAI26070001`, `AAO26070002`.

Segments:
- `A` = AFhomes, the accrediting company.
- Team owner: `A` = AFhomes' own team. Other letters are reserved for future partner-company teams.
- `I` = IST, `O` = OST.
- `YYMM` = the month of accreditation, or of the renewal for a renewed number.
- `NNNN` = the number of people accredited or renewed in that month, in order of accreditation date.

Numbers issued in the former 10-character `AIYYMMNNNN` form stay valid and are read as AA-form numbers.

### 7.2 Sequence Rules

- NNNN restarts at 0001 each month and is assigned in order of accreditation (or renewal) date within the month.
- New accreditations and renewals in the same month share the count.
- `YYMM` is the accreditation or renewal month, not the date the record was typed in.

### 7.3 Historical or Backdated Accreditation

Authorized personnel may enter an actual accreditation date from a previous year or month.

Example: accreditation dated January 2025, and 99 people were already accredited in January 2025, so the number is `AAI25010100`.

Do not change the `YYMM` merely because the member was encoded later.

### 7.4 Conversion Numbering

Normally, an IST/OST conversion changes only the prefix.

Example: `AAI26100001` → `AAO26100001`. Preserve the remaining characters whenever the resulting identifier is available.

### 7.5 Number Reservations

Every previously issued AA identifier is permanently associated with its original member. Old AA numbers cannot be reassigned to another member. If the same member previously owned the target identifier, it may be restored. If the target identifier belongs to another member, allocate a new unique identifier from the same shared sequence.

Example of conflict resolution: the proposed target identifier already belongs to another member, so allocate the next available NNNN of the same month and build the `AAI` or `AAO` identifier with that month's `YYMM`.

Preserve all number changes, corrections, and conversions in audit history.

### 7.6 Concurrency and Integrity

The future implementation must guarantee unique allocation under simultaneous requests. Document invariants such as: no duplicate active AA identifiers; no reuse of another member's historical identifier; no independent IST/OST sequences; atomic allocation and identity updates; idempotent handling of repeated requests. Do not implement these mechanisms yet.

### 7.7 JA&D Accreditation Is Separate (owner ruling R13, 2026-11-12)

A seller's JA&D accreditation number (`JAI`/`JAO` + YYMM + NNNN) is not an AA number and is not issued from the AA sequence. It is stored separately on the seller record, with its own approval date and its own one-year validity, renews under its own rules, and is used only on IGP sales. VIP sales use only the AA number. Rules: `docs/business-rules/14-igp-sales.md` §6.

---

## 8. Combined Renewal, Transfer, and Conversion

The Accreditation Management workflow may support renewal only, renewal with team transfer, or renewal with IST/OST conversion. Where conversion requires downline reassignment, include those changes in the same transaction.

**All-or-nothing:** If any requested operation fails validation or persistence, do not save the renewal, transfer, conversion, partial descendant reassignment, or partial AA number update. A successful operation records complete audit history. Transfers and conversions must also remain possible separately, without requiring renewal.

---

## 9. What Each Status Allows (OCT R28, R37; owner ruling R3, 2026-11-12)

| Action | Valid | Expired (incl. grace and CLOSED label) | Rights-suspended, resigned or terminated |
|---|---|---|---|
| Log in | Yes | Yes, with a renewal reminder | No |
| Be the salesperson or referrer on a new sale | Yes | Yes; the reminder is recorded on the sale | No, for sales dated on or after the suspension date or after the end date |
| Sponsor or be the upline of a new seller | Yes | Yes, with a reminder | No |
| Public seller check | Shown as valid | Shown as **Expired** | Not shown as valid |

- An expired accreditation never blocks a sale (OCT R37).
- A suspension blocks only sales dated on or after its effective date. A sale made before it but recorded later is accepted (OCT R28).
- A resignation or termination takes effect after its end date.
- Existing sales of a suspended or departed person are untouched. Their commission is affected only by what happens to the sale itself (OCT R27, R33), never by their status.
- On the public seller check, IST records never show a valid-until date; OST records show it.

### 9.1 New Sellers and Changes (OPS §4.1; owner authority rule, 2026-11-12)

1. **New seller: two steps.** A Clerk, the Administrator or the Super Administrator enters the seller. The Administrator (the company's Supervisor) or the Super Administrator approves the record. A Clerk never approves. The Administrator or the Super Administrator may approve a record they entered themselves; the audit history then shows that the same person entered and approved it. The seller is official, and the AA number is final, only after approval. An upline must be approved before the people under it.
2. **Changes after approval.** Once approved, the seller record is locked. Any change (status, suspension, end date, upline or team move, pay rates, renewal) is made only by the Administrator or the Super Administrator, one field at a time, and each change is audited.
3. **Sellers view only.** A seller views their own accreditation status and cannot change any seller record (doc 01 §3.7).

### 9.2 Public OST Application (owner ruling R5, 2026-11-12)

The public OST application form is kept. A person who wants to become an OST seller may submit an application through the public website.

1. A submitted application is not a seller record. It issues no AA number and grants no login.
2. The office reviews each application. A Clerk may check it and complete the entry. The Administrator or the Super Administrator then decides one of:
   - **Approve:** the application becomes an approved seller record under the two-step rule in section 9.1, with an eligible upline (doc 02 §4.1), and the AA number is issued.
   - **Return to fix:** the applicant receives a private link (by email or text message) to correct the same application and resubmit it. The office sees the full history of each version (owner follow-up ruling, 2026-11-12).
   - **Reject:** the application is closed with a reason.
3. Every decision is audited.

### 9.3 Public Website Links (owner ruling R5, 2026-11-12)

The public homepage links to **Seller login** and **Check a seller** (the public seller check in section 9).

---

## 10. Examples

### Renewal Example (in the expiry month)

AAI26020001, valid until 10 Feb 2027, renews on 18 Feb 2027 → new number AAI2702NNNN (next February 2027 sequence), valid until 18 Feb 2028.

### Renewal Example (Late)

Valid until 14 Oct 2027, renews on 20 Jan 2028 → new number AAI2801NNNN, valid until 20 Jan 2029.

### Renewal Papers Submitted Early

Valid until 14 Oct 2027, papers handed in on 20 Sep 2027 → held and recorded in October 2027, not in September.

### Expiration Cutoff Example

Expiration October 14, 2027 → valid through 11:59:59 PM PHT on October 14, 2027; expired from 12:00 AM PHT on October 15, 2027.

### AA Number Example

First person accredited in October 2026 → `AAI26100001`.

### Backdated Example

Accreditation dated January 2025, the hundredth person of that month → `AAI25010100`.

---

## 11. Acceptance Criteria

- IST and OST accreditation is annual.
- Original accreditation date is manually entered and not auto-derived.
- Expiration cutoff uses Philippine time.
- Renewal is recorded only in the expiry month or later; early papers are held.
- Renewal issues a new AA number for the renewal month, valid one year from the renewal date, and all history moves to it.
- Renewal does not change account administrative status.
- Expired accreditation does not block login, selling, referring or sponsoring; a reminder is shown and recorded.
- Suspended, resigned or terminated sellers cannot take new sales or sponsor; their existing sales are untouched.
- The public seller check shows an expired seller as Expired.
- A new seller needs entry plus approval by the Administrator or the Super Administrator, who may approve their own entry (audited); later changes are made by the Administrator or the Super Administrator.
- Public OST applications are reviewed by the office: approve, return to fix, or reject.
- The public homepage links to Seller login and Check a seller.
- Eligible downline continues operating independently.
- Date corrections update YYMM when necessary and preserve history.
- AAI/AAO share one monthly sequence that restarts each month.
- Old AA identifiers are never reissued and resolve to the person's current number.
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
## Owner rulings amendment (2026-11-12, round R3)

These rulings take precedence over earlier text in this document where they differ. The company sources are NUM v6.2 §8 and the Ruling Addendum Issue 3 (OCT) R27, R28, R37, R39 and R40, which count as approved company practice (doc 05 item 16).

1. **Expired does not block.** An expired seller may log in, sell, refer and sponsor, with a reminder (section 9). Only a rights suspension, resignation or termination blocks new sales and sponsoring.
2. **Renewal gives a new number.** A renewal is recorded in the expiry month or later and is valid one year from the renewal date. It issues a new AA number that replaces the old one, and all history carries over (section 5). This replaces the former "early renewal extends from the old expiry" rule and the "30 days before" window.
3. **Monthly AA sequence.** The AA number follows NUM §8: 11 characters, YYMM of the accreditation or renewal month, and NNNN restarting each month (section 7). This replaces the former continuous, never-reset sequence. It was applied under the workbook-default rule and flagged to the owner on 2026-11-12.
4. **Public seller check** shows an expired seller as Expired.
5. **Two-step entry, office changes.** A new seller is entered and then approved; the Administrator or the Super Administrator approves and may approve their own entry, with the audit history showing it. After approval, the Administrator or the Super Administrator changes the record, including renewals (sections 5.3 and 9.1). This replaces the former section 5.3, under which any module user could renew. (Corrected by the owner authority rule, 2026-11-12; the earlier wording "approved by a second" user and "only the Super Administrator" is superseded, see the amendment below.)

## Owner rulings amendment (2026-11-12, rounds R4–R5 and authority rule)

These rulings take precedence over earlier text in this document, including the R3 amendment above, where they differ.

1. **Authority rule.** The Administrator can do everything in the system and the Super Administrator has no blocks. Both may approve their own entries, and the audit history shows that the same person entered and approved. Clerks enter only; sellers view only (doc 01 §3.7).
2. **Correction to R3 item 5.** Changes to an approved seller, including renewals and transfers, are made by the Administrator or the Super Administrator, not by the Super Administrator only (sections 5.3 and 9.1). The two-step entry stays: a Clerk, the Administrator or the Super Administrator enters, and the Administrator or the Super Administrator approves. The former requirement that the approver be a different person from the one who entered is replaced by the self-approval rule in item 1.
3. **Roles (R4).** Supervisor = Administrator; Director = Super Administrator; Clerk enters but cannot approve (doc 01 §3.8).
4. **Public OST application (R5).** The public application form is kept. The office reviews each application and approves, returns it to fix, or rejects it. An approved application becomes a seller record under the two-step entry (section 9.2).
5. **Homepage links (R5).** The public homepage links to Seller login and Check a seller (section 9.3).

## Consistency update (2026-11-12)

1. **IGP cross-reference (owner ruling R13).** Added a header link to `docs/business-rules/14-igp-sales.md` and section 7.7: JA&D accreditation is stored separately from the AA number, with its own dates and renewal, and is used only on IGP sales. No AA rule changed.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

22. **Returned public OST application.** A returned applicant gets a private link (email or text) to correct the same application and resubmit it; the office sees the history (section 9.2).
