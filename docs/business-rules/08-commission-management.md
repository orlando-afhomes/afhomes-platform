# AFHomes Platform — Commission Management Business Rules

> Single source of truth for the **Commission Management** module, covering per-sale commission (DSC and DRI), the IST leader allowances (BA, PA and PB), and clawback.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Sales Network and Genealogy: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> IGP Sales: `docs/business-rules/14-igp-sales.md`.

---

## 1. Purpose and Scope

This document defines the authoritative Commission Management business rules for AFHomes Platform.

Commission Management computes, releases, approves, pays, and when a sale goes wrong takes back the commission earned on AFHomes sales. It covers:

- per-person commission rates (DSC and DRI) kept on each seller record;
- the commission attached to each sale at the rates frozen when its VIP Number is issued;
- staged release by approved collection, and the month-end payout;
- holds on unpaid commission and clawback of paid commission when a sale event requires it;
- the monthly IST leader allowances BA, PA and PB;
- the parallel run with the company workbooks before the platform takes over;
- reporting, visibility and audit history.

Sales performance, commission attachment, release, payout approval and actual payout are separate concepts.

The structure of this document follows the owner rulings of 2026-11-12 (rounds R8 and R9; see the amendment at the end). Under the 2026-11-12 ground rule, the company workbook (the live manual process) is the default authority, and a dated owner ruling outranks it. Company sources cited:

- **OPS**: AFhomes Commission System User Manual v2.3 (2026-10-25).
- **AUG**: Upgrade Memorandum, Ruling Addendum of 2026-08-20.
- **OCT**: Upgrade Memorandum, Ruling Addendum of 2026-09-24, Issue 3.
- **ROLL**: AFhomes Rollout Guide, Training and Go-Live v1.4 (2026-10-25).
- **Clawback Addendum**: IST Contract Addendum, Commission and Clawback, DRAFT of 2026-09-24 (not signed).

This document does not define tax withholding, commission dispute procedures or special promotional schemes. Those remain open (section 24) and must not be invented.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles, the overriding authority rule, record visibility.
- `02-sales-network-and-genealogy.md` — genealogy, historical sale attribution, vacancy.
- `03-ist-ost-accreditation.md` — accreditation identity, status, who may be recorded on a new sale.
- `04-customer-management.md` — customer identity, closing seller and referrer.
- `05-vip-products-and-contracts.md` — contract TCP, including the Non-Standard TCP.
- `06-vip-card-issuance.md` — VIP Number issuance.
- `07-finance-and-payments.md` — approved receipts, reversals, returned cheques.
- `13-sales-performance-reporting.md` — Closed Deal, month close, Defaulted sales.
- `14-igp-sales.md` — IGP sales: Series Number, IGP rates frozen at Series Number issuance, the 10% Closed Deal, the 40% / rest staged release and 20% assumed credit (doc 14 §8 and §9). This document states the general rules those refer to.

---

## 3. Terminology and Definitions

- **DSC (Direct Sales Commission)** — per-sale commission paid to the closing seller.
- **DRI (Direct Referral Income)** — per-sale commission paid to the referrer recorded on the sale.
- **Commission rate** — a person's DSC rate and DRI rate, per product (VIP, IGP), kept on the seller record.
- **Standard rate** — the rate for the person's position under their service contract and record. A person's rate defaults to it (AUG R17, OCT R30).
- **Contract TCP** — the total contract price of the sale's contract (doc 05), including a Non-Standard TCP.
- **Approved collection** — the net total of approved receipts on the sale after reversals (doc 07).
- **Closed Deal** — a sale whose approved collection reaches its frozen threshold: VIP 25%, IGP 10% (AUG R13, OCT R31; doc 13). It drives sales counting and the leader allowances, not the DSC and DRI release.
- **Release** — the point at which a stage of a sale's commission becomes payable, in the month the stage is first reached.
- **Month-end payout** — the payout of everything released in a month, made after that month is closed.
- **On Hold** — released commission that is not yet paid and may not be paid because of a sale event.
- **Paid** — disbursement confirmed by Finance, an Administrator or the Super Administrator.
- **Clawback** — an amount owed back by the person who was paid, raised by a sale event (OCT R32).
- **BA, PA, PB** — Basic Allowance, Performance Allowance and Performance Bonus: monthly IST leader allowances under the service contracts (OCT R29).
- **Assumed collection credit** — the share of a month's collections on an inherited or rolled-up account that counts toward a leader's figures: VIP 40%, IGP 20% (AUG R23).

---

## 4. Approved Commission Decisions

The following decisions are authoritative. Decisions 1 to 7 were restated on 2026-11-12 (owner rounds R8 and R9). The earlier text, in which Finance typed a percentage for each recipient and could pay the seller and every upline, is superseded.

### Decision 1 — Rates Are Set per Person; Amounts Are Computed; Payout Is Explicit

Each person carries set DSC and DRI rates on their seller record. When a sale's VIP Number is issued, the closing seller's DSC rate and the referrer's DRI rate for that product are frozen on the sale, and the system computes the amounts automatically. No one types a percentage per sale. Approving the payout and confirming the disbursement remain explicit, audited actions.

### Decision 2 — Per-Person Rates Default to the Position Standard

A person's rates default to the standard for their position (AUG R17, OCT R30), as set by their service contract and record. An Administrator or the Super Administrator may change a person's rate for future sales only. The change is logged. A sale's frozen rate may change only before any of its commission is released (OCT R30).

### Decision 3 — Commission Basis Is the Contract TCP

**DSC = Contract TCP × frozen DSC rate. DRI = Contract TCP × frozen DRI rate.** The basis includes a Non-Standard TCP (doc 05 §10.2). Collections to date are not the basis; they decide only when the commission is released.

### Decision 4 — Recipients Are the Closing Seller and the Referrer Only

Per-sale commission goes only to the closing seller (DSC) and the referrer recorded on the sale (DRI), whether IST or OST (OPS §6.1). Leaders (SM, SSM, SVD) earn through the monthly allowances BA, PA and PB (section 15), not through per-sale cuts. There is no distribution through the hierarchy.

### Decision 5 — Staged Release, Paid at Month-End

VIP: 100% of the commission is released in the month the sale reaches 40% approved collection. IGP: 40% is released in the month the sale reaches 40% collected, and the rest in the month it is fully paid (OPS §6.1). Each release is paid in that month's month-end payout. There is no waiting period after release (the 7-day wait of 2026-11-09 was removed by the owner on 2026-11-12).

### Decision 6 — Only Sale Events Take Commission Back

Commission once attached to a sale is never stopped by the person's status (OCT R27). It is taken back only by the sale events in OCT R32: unpaid amounts are held, paid amounts become clawbacks owed by the person paid. Recovery follows section 14. History is never deleted.

### Decision 7 — Finance, Administrator or Super Administrator Approves and Pays

Finance, an Administrator or the Super Administrator approves the month-end payout, records it, and confirms the disbursement (overriding authority rule, 2026-11-12, doc 01). A commission becomes Paid only after actual disbursement is confirmed. No automatic transfer of funds.

---

## 5. Module Responsibilities

Commission Management keeps the per-person rates, freezes them on each sale, computes DSC and DRI, releases them by stage, prepares the month-end payout list, records approvals, payouts and confirmations, holds unpaid commission and raises clawbacks on sale events, tracks recovery and write-off, computes the monthly IST allowances, supports the parallel run, and keeps reporting and audit history.

It consumes but does not own: genealogy (doc 02), accreditation status (doc 03), contract TCP (doc 05), VIP Number issuance (doc 06), approved receipts (doc 07), and the Closed Deal, month close and Defaulted status (doc 13).

---

## 6. Commission Participants

The hierarchy is SVD → SSM → SM → OST (doc 02). IST means Internal Sales Team (SVD, SSM, SM). OST means Outsourcing Sales Team.

- **Per-sale commission (DSC, DRI):** IST and OST alike. Only the closing seller and the referrer on the sale are paid (Decision 4). There is no override for AFhomes leaders; "Override" is a JA&D pay item only.
- **Allowances (BA, PA, PB):** IST only (OCT R29). OST production still counts: it rolls up the genealogy into the Team Closed Deal TCP of the IST leaders above it.
- A sale may have no referrer. Then no DRI is payable on it.
- Whether a person may be recorded as seller or referrer on a NEW sale is decided by accreditation status (doc 03; OCT R28 and R37). Their existing sales are untouched.

Commission Management does not change the genealogy, parent selection rules, Sales Network permissions or account-creation processes.

---

## 7. Attribution: Sale-Level Versus Pay

Two kinds of attribution are kept separate:

1. **Per-sale commission** follows the people frozen on the sale: the closing seller and the referrer recorded when the VIP Number is issued. A later transfer, change of designation, IST/OST conversion, renewal with a new AA number, or departure does not move DSC or DRI to anyone else. A renewal carries the person's commission under their new AA number (OPS §4.6, OCT R39).
2. **Team credit for allowances and team KPIs** follows the CURRENT upline chain when the month is built (AUG R23, OCT I4). An inherited post redirects receipts by itself, and a vacant post rolls credit up (AUG R1). An assumed credit on someone else's old sale does not move that sale's DSC or DRI (AUG R24 consequence; service contract definition 12).

Sale-level reports keep the original seller and team at the time of the sale (doc 02 §6.3). Pay attribution under item 2 never rewrites that history.

---

## 8. When Commission Attaches and When It Is Released

### 8.1 Attachment

Commission attaches to a sale when its VIP Number is issued (doc 06); for an IGP sale, when its Series Number is issued, at the person's IGP rates (doc 14 §8). At that moment the closing seller's DSC rate and the referrer's DRI rate for the product are frozen on the sale, together with the Closed Deal threshold (OCT R30, R31; OPS §4.2). Nothing is payable at attachment.

A sale must not be treated as earning commission merely because a customer signed an application, a reservation exists, a payment claim was submitted, or a receipt was uploaded but not approved. Only approved receipts count (doc 07).

### 8.2 Release

| Product | Stage | Share of the sale's commission | Released in |
|---|---|---:|---|
| VIP | Approved collection reaches 40% of the contract TCP | 100% | the month the 40% is first reached |
| IGP | Collection reaches 40% | 40% | the month the 40% is first reached |
| IGP | Full payment | the rest | the month full payment is reached |

A receipt dated in a closed month that is admitted later counts in the first open month (doc 13; R7 item 2), so its release falls in that month.

### 8.3 Status of the Person

Release and payment do not depend on the person's status. Resignation, termination (even for fraud), the end of a service contract, or the suspension, expiry or withdrawal of accreditation never stop commission already attached to a sale (OCT R27, I8). If a fraud leads to the sale being cancelled or rescinded, the clawback in section 14 applies.

### 8.4 Contract Finalization

Contract finalization (doc 05) is not a precondition for attachment, release or the Closed Deal. A sale counts once an Administrator has approved the sale record; formal finalization is tracked separately (owner follow-up ruling 3, 2026-11-12; OPS §4.2).

---

## 9. Per-Person Commission Rates

### 9.1 Rates on the Seller Record

Each seller record holds a DSC rate and a DRI rate for each product (VIP, IGP). Both default to the standard for the person's position (AUG R17, OCT R30). The standard comes from each person's service contract and record. This document fixes no rate figure; do not hardcode one.

**Owner follow-up (2026-11-12).** If the closing seller's approved DSC rate or a recorded referrer's approved DRI rate is missing, keep the application and pause VIP Number issuance until an Administrator or Super Administrator records the approved rate. An explicitly approved zero is valid. Where one seller fills both roles, a separate dated referral reference verified during customer approval is required for DRI. Keep historical paid amounts intact.

### 9.2 Changing a Person's Rate

- An Administrator or the Super Administrator may set a rate that differs from the standard for a named person. The change applies to sales whose VIP Number is issued after it, never to existing sales.
- Every change is logged with the old value, new value, actor, date and reason.
- The system lists every person whose rate differs from the standard, so the month-end review sees the exceptions together (AUG R17).
- Sellers, clerks and other users cannot change rates.

### 9.3 Correcting a Sale's Rate or Referrer

The referrer, and with it the DRI rate, may be corrected through the normal sale correction until the first receipt on the sale is approved. After that only an Administrator or the Super Administrator may correct them, and never once any commission on the sale has been released (OCT R30; OPS §4.2). Every correction is logged.

### 9.4 Validation

Rates must be valid numbers. A permitted range or maximum for a deviating rate has not been set by the owner (section 24); do not invent one.

---

## 10. Commission Calculation

### 10.1 Formula

- **DSC = Contract TCP × frozen DSC rate.**
- **DRI = Contract TCP × frozen DRI rate.**
- **Released amount = commission × the stage's share (section 8.2).**

DSC and DRI are calculated independently from the same contract TCP. One is never deducted from the other.

### 10.2 Commercial Amount Source

Use the contract TCP of the sale's own contract, including a Non-Standard TCP (doc 05 §10.2). Do not use current catalog prices, promotional prices, a later product update, an installment amount, or total receipts collected.

### 10.3 Monetary Precision

Use the approved exact-money and rounding rules (AGENTS.md section 6). Do not silently alter a frozen rate, a computed amount or a released amount when product settings or a person's standard rate change later.

---

## 11. Month-End Cycle, Approval and Payout

### 11.1 Monthly Order

The month-end cycle follows OPS §5:

1. Status changes and renewals for the month are recorded, and every receipt dated in the month is approved or returned.
2. Sales with no approved receipt for 90 days are listed; an Administrator or the Super Administrator decides which are marked Defaulted (doc 13; OCT I7).
3. An Administrator or the Super Administrator closes the month. Its figures never change afterwards (doc 13).
4. The DSC and DRI payout list for the month is produced from everything released in it, less holds and, once recovery is authorized (section 14.4), clawback offsets.
5. Finance, an Administrator or the Super Administrator approves the payout list, makes the disbursement through the company's payment process, and confirms it.
6. The monthly allowances are computed (section 15).

### 11.2 Approval

Approval of a payout is explicit and audited. It records the payees, sales, amounts, approver, and date. Under the overriding authority rule (doc 01) Finance, an Administrator or the Super Administrator may approve a payout list they prepared themselves (owner answer, 2026-11-12), as for receipts (doc 07 §5.2); the audit history flags that the same person prepared and approved. A seller account cannot approve or pay any commission through Sales Network permissions. Viewing a commission is not approving it.

### 11.3 Payout Process

1. The approver reviews the month's released, unpaid commissions that are not On Hold.
2. The disbursement is made through the company's authorized payment process.
3. The payout is recorded with its supporting evidence.
4. Actual disbursement is confirmed.
5. Only then does the commission become Paid.

### 11.4 Required Payout Information

Preserve the commission record, recipient identity, amount, any clawback offset, disbursement method, payment reference, payout date, supporting proof, the person who recorded it, the confirmation timestamp, payout status, and audit history. Do not invent bank account details or recipient financial information.

### 11.5 No Automatic Disbursement

No automatic GCash, Maya or bank transfers, no payroll-like scheduled transfers, no disbursement on approval, and no withdrawal by sellers. The month-end payout is prepared by the system and paid by authorized people.

### 11.6 Payout Confirmation and Stuck Payouts

A commission does not become Paid because a transfer was initiated. Initiated or unconfirmed payouts are kept separate from completed payouts.

If a payout was initiated on a commission that is later placed On Hold, Finance, an Administrator or the Super Administrator may void the initiated payout or confirm it. Both actions keep the full payout history. A confirmed payout on a held commission is treated as paid, and the sale event then raises a clawback under section 14.

### 11.7 Duplicate Payout Protection

Repeated processing of the same payout instruction must not create a duplicate settlement or record.

---

## 12. Commission Status Lifecycle

Use existing repository enums where verified; otherwise these are logical states, not claims about the implementation.

- **Attached** — rates and amount frozen on the sale; nothing released.
- **Released** — a stage was reached in a month; payable in that month's payout.
- **Approved** — included in an approved payout list; not yet paid.
- **On Hold** — released but unpaid, and blocked by a sale event (section 13).
- **Payout initiated** — a disbursement was started but not confirmed.
- **Paid** — disbursement confirmed.
- **Cancelled** — an unpaid release withdrawn by a sale event; history kept.
- **Clawback owed / Recovered / Written off** — tracked on the clawback ledger for paid amounts (section 14).

Normal flow: Attached → Released → Approved → Paid. Exceptions: Released or Approved → On Hold → restored or Cancelled; Paid → clawback owed → recovered or written off.

---

## 13. Hold on Unpaid Commission

When a sale event in section 14.1 occurs, any released commission on that sale that is not yet paid is automatically placed On Hold and is not paid. A release that a returned cheque un-makes is withdrawn in the same way. This produces the same result as the workbook's same-month payment and offset (OCT I6).

Safeguards: do not delete the commission; do not erase its frozen rate or amount; do not erase approval history; record the cause of the hold; do not rewrite historical attribution.

If the sale returns to Active (a Defaulted sale reinstated, section 14.6), held amounts are restored to the payout when the sale meets the release mark again. Restoration never creates a second commission for the same sale and stage.

---

## 14. Clawback and Recovery

### 14.1 Triggers

DSC and DRI are clawed back on the five triggers of OCT R32:

| Trigger | How it is recorded | What is clawed back |
|---|---|---|
| Cancellation | Sale status Cancelled. A refund and repurchase upward is recorded as Upgraded. | Every DSC and DRI released on the sale |
| Rescission after 90 days from booking | Sale status Rescinded | Every DSC and DRI released on the sale |
| Downgrade (buyer revision to a lower amount) | Sale status Downgraded; the repurchase is a new sale that earns its own commission from zero | Every DSC and DRI released on the old sale |
| Payment default over 90 days | Sale status Defaulted, confirmed case by case by an Administrator or the Super Administrator (OCT I7; doc 13) | Every DSC and DRI released on the sale |
| Returned cheque | Receipt marked returned, in any month (doc 07) | Only the release the returned money un-makes: a stage whose mark the sale no longer reaches, if it was paid in a closed month |

Any status other than Active also removes the Closed Deal (OCT R33; doc 13).

### 14.2 What Is Owed

A clawback is recorded as owed against the person who was paid: DSC from the closing seller, DRI from the referrer, for the exact amount released, stage by stage (OCT R32). Unpaid amounts are held under section 13 and do not become clawbacks.

### 14.3 Before the Clawback Addendum Is Signed

The IST Commission and Clawback Addendum is a DRAFT (2026-09-24) awaiting legal review. Until it is signed, no amount is deducted from anyone's commission or allowances. The office collects a clawback directly from the person, and the collection is recorded against the open clawback.

### 14.4 After the Clawback Addendum Is Signed

For an IST who has signed the addendum, a clawback is recovered in this order (OCT R34):

1. from the person's future DSC and DRI, automatically, in the month-end payout;
2. for an IST, from BA, PA and PB, set off against the whole of them with no minimum left to the person (OCT I11);
3. by direct demand.

### 14.4.1 OST Clawback

A clawback owed by an OST is recorded as owed and the office collects it directly. It is never deducted automatically from the OST's future pay unless a signed OST agreement expressly allows it (owner follow-up ruling 2, 2026-11-12; OCT R34).

### 14.5 Open Balance and Write-Off

A clawback stays open until it is recovered or written off. Only an Administrator or the Super Administrator may write one off, with a reason. A write-off stops the offsetting; it does not by itself waive the company's claim (OCT R34).

### 14.6 Reinstatement of a Defaulted Sale

When an Administrator or the Super Administrator restores a Defaulted sale to Active because the buyer has paid again (OCT R33; doc 13):

- the clawback still owed on that sale is written off;
- anything already recovered is reported for refund;
- any release mark crossed in the meantime is released in the open month, so the commission pays once more.

A clawback raised by a returned cheque is never written off by a reinstatement: that money never arrived.

### 14.7 PB Already Paid

When a Closed Deal is removed after its month was closed for allowances, a PB already paid is not clawed back by the system. The office handles it by hand (OPS §4.4, company decision of 2026-09-24).

### 14.8 Safeguards

- Paid history is never deleted: original rate, amount, disbursement and confirmation stay visible beside the clawback, recovery and write-off records.
- No reversal of a bank transfer, no salary deduction, and no deduction from commission or allowances before the addendum is signed.
- A clawback never rewrites the sale's historical attribution.

### 14.9 Adjustments

Where an authorized correction changes a commission (for example a contract TCP correction made before any release), preserve the original and the revised amounts with the reason. Do not overwrite financial history.

---

## 15. Leader Allowances: BA, PA and PB

### 15.1 Scope

BA, PA and PB are monthly allowances for IST leaders (SM, SSM, SVD) under their service contracts. OST do not receive them (OCT R29). The system computes them each month following OPS §6.2 and the AUG and OCT rulings cited below. During the parallel run (section 16) the company workbook pays, and the platform's figures are compared with it.

### 15.2 What Counts

- A sale counts toward allowances only once it is a Closed Deal: VIP at 25% collected, IGP at 10%, each at the threshold frozen on the sale (OPS §6.2; OCT R31).
- A sale counts in a leader's own figures for both its seller and its referrer, and in Team Closed Deal TCP once for every leader above either of them (OCT I1).
- A sale dated before a person's appointment to their present post is not their production (OCT I2).
- Team credit follows the current upline chain when the month is built (AUG R23, OCT I4).
- A vacant post earns no BA, PA or PB. Its downline TCP and collections roll up to the next active level. Where the vacant post is the top of the tree, the stream earns nothing for the vacancy period (AUG R1).
- **Assumed collection credit** (AUG R23): on an inherited or rolled-up account, VIP 40% and IGP 20% of the month's collections count toward the collector's figures. A leader receives a collection in full when the sale is inside their window, and otherwise the assumed credit instead, never both (OCT I3). An assumed account is not re-tested against the Closed Deal threshold.

### 15.3 The Monthly Tests

- The month is split into a Qualifying-Period stretch and an Extended-Period stretch (AUG R11). Each is judged on its own days, with **factor = days in the stretch ÷ days in the month**.
- **KPI = Team Closed Deal TCP + assumed credit. COLLECTION = collections + assumed credit** (OPS §6.2; AUG R23).
- A target is met when KPI reaches the target × factor AND COLLECTION reaches 40% of the target × factor.
- **BA:** the Qualifying-Period part is paid by days with no production test (AUG R10a); the Extended-Period part needs the BA target.
- **PA:** each stretch needs the PA target.
- **PB:** rate × Equivalent TCP, where **Equivalent TCP = MIN(KPI, COLLECTION ÷ 40%)**, for each stretch that meets the PB target. There is no minimum collection rate (AUG R21), and one PB base applies to every position (OCT R35).

### 15.4 Position Targets (OPS §6.2 Table A, as shipped)

Monthly team TCP plus credit; amounts in pesos a month.

| Position | BA target | PA target | PB target | BA / PA | PB rate |
|---|---:|---:|---:|---:|---:|
| SM | 200,000 | 1,000,000 | 2,000,000 | 15,000 | 1% |
| SSM | 600,000 | 2,000,000 | 4,000,000 | 25,000 | 3% |
| SVD | 1,800,000 | 5,000,000 | 10,000,000 | 50,000 | 2% |

These are the shipped figures only. The live figures are configurable by an Administrator or the Super Administrator, and a person's own BA or PA amount or PB rate on their record overrides them (OPS §6.2). Every change is logged and never alters a closed month.

### 15.5 Limits

- Nothing is paid after a person's engagement end date, or from the day a suspension takes effect (OCT I9).
- An Administrator or the Super Administrator may withhold a person's BA for a month, with a recorded reason. The withholding removes that month's whole BA; PA and PB are not withheld (AUG R10a, OCT I10).
- Clawback set-off against BA, PA and PB applies only after the Clawback Addendum is signed (section 14.4).
- Once a month is closed for allowances, it never changes; a mistake found later is corrected in the next month (OPS §5).

---

## 16. Parallel Run and Switch

The platform does not take over pay at once. Following ROLL §8 and the owner's R9 and R11 answers:

1. Every seller and every unfinished sale with its full receipt history is imported (doc 11; R11 item 5).
2. During the parallel run, the company workbooks (Excel) pay DSC, DRI, BA, PA and PB. Each month-end, the platform's payout and allowance figures are compared with them, and every difference is listed and explained.
3. The Super Administrator decides the switch only after a month closes with no unexplained difference. From the next month the platform's figures are paid, and the Excel process is no longer used.

Platform figures produced before the switch are calculations for comparison only and must not be recorded as paid.

---

## 17. Roles, Permissions and Visibility

Align with `docs/business-rules/01-roles-and-permissions.md`.

### 17.1 Finance, Administrator and Super Administrator

Finance, an Administrator or the Super Administrator may approve payouts, record and confirm disbursements, void or confirm a stuck initiated payout, and view commission and allowance records. An Administrator or the Super Administrator may also change a person's rates, correct a sale's referrer or rate within section 9.3, close a month, mark or restore a Defaulted sale, withhold BA, change the allowance figures, and write off a clawback. Each of these is a separate action permission (doc 01); opening a page grants viewing only.

### 17.2 Clerk

A clerk enters information (for example sales and receipts) but approves nothing and changes no rate.

### 17.3 Sellers

Sellers view only and never change commission or allowance records. SVD, SSM and SM see their own and their team's sales and pay; an OST sees only their own. A leader viewing team sales gains no commission on those sales and no right to change a downline member's record.

### 17.4 Visibility Is Not Authority

A user may be allowed to view a commission without being allowed to change it. Do not expose downline banking details or payout evidence beyond what the role permits.

### 17.5 What a Seller Sees

Separate own DSC and DRI, own allowances (IST only), team summaries where permitted, released unpaid amounts, held amounts, paid amounts, and clawbacks owed.

---

## 18. Commission Reporting

Reports cover attached, released, approved, held, initiated and paid commission; clawbacks owed, recovered and written off; allowances by month and position; and totals by person, by IST/OST, by sale, by team and by period.

### 18.1 Reporting Integrity

A commission must not appear as Paid merely because it is Approved. A sale with both DSC and DRI is still one sale. Allowance team credit does not double-count a sale in sales revenue.

### 18.2 Reporting Dates

Distinguish the VIP Number issue date (attachment), the Closed Deal date, the stage dates (40%, full payment), the release month, the approval date, the payout confirmation date, hold and clawback dates, and recovery or write-off dates.

### 18.3 Reporting Adjustments

Follow `docs/business-rules/13-sales-performance-reporting.md`. Closed months never change; corrections go into the next open month.

---

## 19. Cross-Module Integration

| Module | Commission Management relationship |
|---|---|
| Roles and Permissions | Action permissions for payout, rates, month close, write-off |
| Sales Network and Genealogy | Current upline chain for allowances; vacancy roll-up |
| IST/OST Accreditation | Who may be recorded on a new sale; AA number renewal |
| Customer Management | Closing seller and referrer on the sale |
| VIP Products and Contracts | Contract TCP, including Non-Standard |
| VIP Card Issuance | VIP Number issuance freezes rates |
| Finance and Payments | Approved receipts, reversals, returned cheques |
| Sales Performance Reporting | Closed Deal, month close, Defaulted status |
| Reports and Analytics | Commission, allowance and clawback reporting |
| Audit Logs | Traceability of every rate, release, payout and clawback event |

Commission Management must not modify customer identities, change contract terms, reassign genealogy, approve customer receipts, change a sale's status on its own, activate memberships or issue VIP Numbers.

---

## 20. Historical Record Preservation

Frozen rates, released amounts, approvals, payouts, clawbacks and allowance months remain traceable. Do not overwrite or recreate them when a seller transfers, changes designation, converts between IST and OST, renews with a new AA number, or departs; when a standard rate or allowance figure changes; or when a sale is cancelled, defaulted or reinstated.

Imported history (section 16) keeps the verified facts as recorded. Do not fabricate old rates, approvals or payout confirmations.

---

## 21. Audit and Security

Audit events include: rate set or changed, sale referrer or rate corrected, rates frozen at VIP Number issuance, release, hold and restoration, payout list approval (including self-approval by Finance, an Administrator or the Super Administrator, flagged), payout initiation, void, recording and confirmation, clawback raised, recovered, offset and written off, Defaulted marking and reinstatement, month close, BA withholding, allowance figure change, and every financial correction.

Audit details keep the actor, timestamp, sale, contract, recipient, previous and new values, reason, and supporting reference. Where Finance, an Administrator or the Super Administrator approves their own entry (receipt or payout list), the audit flags the self-approval and shows the roles held by the same person.

Ordinary record editing must never erase the decision trail. Payout evidence and recipient financial data stay protected and are never exposed through public pages or unrelated Sales Network views.

---

## 22. Required Business Scenarios

These are business acceptance scenarios, not claims of executed tests.

- **A. Rates frozen at issue.** An OST closes a VIP sale referred by an IST. When the VIP Number is issued, the OST's DSC rate and the IST's DRI rate are frozen. Nothing is payable yet.
- **B. VIP release.** Approved collection reaches 40% of the TCP in March. 100% of DSC and DRI is released in March and paid in the March month-end payout, with no waiting period.
- **C. IGP release.** An IGP sale reaches 40% collected in May and full payment in a later month. 40% is released in May; the rest in the month of full payment.
- **D. Rate change.** An Administrator raises a person's DSC rate. Sales issued before the change keep their frozen rate.
- **E. No upline cut.** A sale by an OST under an SM pays only DSC and DRI. The SM's credit appears only in the monthly allowance figures.
- **F. Person resigns.** A seller resigns after the sale is issued. The release is still paid when the stage is reached (OCT R27).
- **G. Cancellation before payout.** A sale is cancelled after release but before the month-end payout. The released amount is held and not paid.
- **H. Cancellation after payout.** A paid sale is cancelled. A clawback is owed by the seller (DSC) and the referrer (DRI). Before the addendum is signed, the office collects directly.
- **I. Returned cheque.** A cheque returns and the sale falls below 40%. Only the release that cheque un-made is clawed back, if it was paid in a closed month.
- **J. Defaulted then reinstated.** A Defaulted sale's buyer pays again and the sale is restored. The clawback still owed is written off, recovered amounts are reported for refund, and the release is paid once more. A returned-cheque clawback stays.
- **K. Stuck payout.** A payout was initiated on a commission that is then held. Finance voids it, or confirms it and the clawback follows. History is kept.
- **L. Vacancy.** An SSM post is vacant. Its downline figures roll up to the SVD for allowances; the vacant post earns nothing.
- **M. Duplicate payout attempt.** A completed payout is submitted again. No duplicate settlement is recorded.

---

## 23. Non-Negotiable Invariants

1. Per-sale commission goes only to the closing seller (DSC) and the referrer (DRI), IST or OST.
2. Rates come from each person's record, default to the position standard, and are frozen on the sale at VIP Number issuance.
3. A rate change applies only to future sales; a sale's rate never changes after release.
4. The basis is the contract TCP, including a Non-Standard TCP.
5. VIP releases 100% at 40% approved collection; IGP 40% at 40% and the rest at full payment; each is paid at the month-end, with no waiting period.
6. The person's status never stops commission already attached to a sale.
7. Only the five sale events of OCT R32 take commission back.
8. Unpaid commission on such a sale is held; paid commission becomes a clawback owed by the person paid.
9. No deduction from commission or allowances before the Clawback Addendum is signed.
10. Approved is not Paid; Paid requires confirmed disbursement.
11. No automatic transfer of funds.
12. Leaders earn through BA, PA and PB only; there is no per-sale hierarchy distribution.
13. Allowance team credit follows the current upline chain; sale-level history keeps the original attribution.
14. Closed months never change.
15. Paid history, clawbacks and write-offs are never deleted.
16. Sellers view only; visibility is never authority.
17. The platform pays only after the parallel run and the switch decision.

---

## 24. Outstanding Dependencies

Decided on 2026-11-12 and removed from this list: payout frequency (monthly), the release threshold (section 8.2), the release wait (removed), status consequences for attached commission (OCT R27), rate changes after payout (never after release), recovery offsets (section 14.4, after signing), and Non-Standard contracts (commission on the approved actual TCP, doc 05 §10.2). Settled by the owner follow-up rulings of 2026-11-12 (see the amendment at the end): recovery from OST (section 14.4.1), contract finalization as a precondition (section 8.4, not a precondition), and "Override, where applicable" (no AFhomes override).

Still open:

- **Clawback Addendum signature and retroactivity.** It is a DRAFT. Its cover note asks counsel whether the new clawback applies to events after signing on commission released before signing.
- **Permitted range for a deviating rate.** No maximum or aggregate cap has been set.
- **Engagement reviews** (QP review AUG R18, below-target review R19, R20, OCT I12), which set engagement end dates used by section 15.5, are not yet written into the platform rules.
- Tax withholding and statutory deductions.
- Commission dispute procedures.
- Special promotional commission schemes.

Record only issues that materially affect correct implementation.

---

## 25. Implementation Acceptance Criteria

### Rates
- [ ] DSC and DRI rates per product on each seller record, defaulting to the position standard.
- [ ] Rate changes by Administrator or Super Administrator only, future sales only, logged.
- [ ] List of people with non-standard rates.
- [ ] Rates and Closed Deal threshold frozen at VIP Number issuance.
- [ ] Referrer and rate corrections follow section 9.3.

### Calculation and Release
- [ ] Amount uses the contract TCP, including Non-Standard.
- [ ] DSC to the closing seller, DRI to the referrer, nothing to uplines.
- [ ] VIP 100% at 40% approved collection; IGP 40% / rest at full payment.
- [ ] Release month is the month the stage is first reached; late-admitted receipts count in the first open month.
- [ ] No waiting period after release.
- [ ] Person's status never blocks release or payment.

### Payout
- [ ] Month-end payout list after month close.
- [ ] Approval by Finance, Administrator or Super Administrator, audited.
- [ ] Paid only after confirmed disbursement.
- [ ] Stuck initiated payout can be voided or confirmed, with history.
- [ ] Duplicate payout protection.

### Holds and Clawback
- [ ] Unpaid release held on the five OCT R32 events.
- [ ] Paid release becomes a clawback against the person paid.
- [ ] No offset before the addendum is signed; direct collection recorded.
- [ ] OST clawback recorded as owed and collected directly; no automatic deduction without a signed OST agreement.
- [ ] Recovery order per OCT R34 after signing.
- [ ] Write-off by Administrator or Super Administrator only.
- [ ] Defaulted reinstatement per OCT R33; returned-cheque clawback never written off.

### Allowances
- [ ] IST only; OST production rolls up.
- [ ] Closed Deal thresholds, stretches, KPI and COLLECTION tests, Equivalent TCP.
- [ ] Current upline chain, vacancy roll-up, assumed credit.
- [ ] Table A figures configurable; personal overrides honored.
- [ ] Suspension, end date and BA withholding limits.

### Parallel Run, Reporting and Security
- [ ] Monthly comparison with the workbooks; differences listed.
- [ ] Switch only after a month with no unexplained difference.
- [ ] Correct released, held, paid and clawback reporting.
- [ ] Sellers view only; OST sees only their own.
- [ ] Complete audit history; protected payout information.

---

## Completion Report

- **File created/updated:** `docs/business-rules/08-commission-management.md`
- **Rules coverage (restructured 2026-11-12):** per-person DSC and DRI rates frozen at VIP Number issuance; contract TCP basis; seller and referrer as the only per-sale recipients; staged release paid at month-end; status-independent commission; clawback and recovery; IST leader allowances; parallel run.
- **Cross-module review:** open conflicts are tracked in `docs/implementation/decisions-and-gaps.md` (G09) and section 24.
- **Change scope:** Documentation only.

## Owner rulings amendment (2026-11-09)

These rulings were authoritative when made. Items marked superseded were replaced by the owner rulings of 2026-11-12 below.

1. **Payout threshold (stage 1):** a payout may be recorded only once net Finance-verified collections reach 40% of the finalized contract value. *Kept and restated (2026-11-12): for VIP, 100% of the commission is released in the month approved collection reaches 40% of the contract TCP and is paid at that month-end (sections 8.2 and 11).*
2. ~~**Release wait:** the payout opens 7 days after the Finance verification of the payment that brought verified money to 40%. Before that date the commission stays Approved and cannot be paid.~~ **Superseded 2026-11-12:** the owner removed the 7-day wait. The rule was not found in any company paper.
3. ~~**Commission Assignment:** Finance and Super Administrator manually enter each seller's percentage on a dedicated page for sellers of a Confirmed Sale. No default or proposed rate exists; maximums, aggregate caps and the referrer rule remain open (OD-9).~~ **Superseded 2026-11-12:** per-person set rates frozen on the sale (sections 9 and 10); the referrer earns DRI at their own rate.
4. ~~**Super Administrator** keeps commission operations and counts as authorized Finance personnel.~~ **Superseded 2026-11-12:** Finance, an Administrator or the Super Administrator approves and pays (overriding authority rule).

## Owner rulings amendment (2026-11-12, rounds R8–R9)

These rulings are authoritative and take precedence over earlier text in this document and over the company workbook where they differ. Ground rule: the company workbook wins by default; a dated owner ruling outranks it.

1. **Per-person rates (R8 item 1).** Each person has DSC and DRI rates per product on their seller record, defaulting to the standard for their position (AUG R17, OCT R30). The DSC rate comes from the closing seller and the DRI rate from the referrer; both are frozen on the sale when its VIP Number is issued, and the system computes the amounts. An Administrator or the Super Administrator may change a person's rate for future sales only, and the change is logged. This replaces the former Decisions 2 and 3, the former sections 9 and 10 (Finance-typed percentages), and 2026-11-09 item 3.
2. **Recipients (R8 item 2).** Per-sale commission goes only to the closing seller (DSC) and the referrer (DRI), IST or OST. Leaders earn through BA, PA and PB. This replaces former Decision 4.
3. **Basis (R8 item 3).** The contract TCP, including the Non-Standard TCP.
4. **Release (R8 item 4).** VIP: 100% released in the month the sale reaches 40% approved collection, paid at that month-end (OPS §6.1, §5). IGP: 40% at 40% collected, the rest at full payment, each paid at the month-end. The 7-day wait (2026-11-09 item 2) is removed. The 7-day rule was not found in any company paper (search of all current-set texts, 2026-11-12).
5. **Status (R8 item 5).** Commission already attached to a sale is paid even if the person resigns, is terminated (even for fraud) or is suspended (OCT R27). Only sale events take it back.
6. **Stuck payout (R8 item 6).** Finance, an Administrator or the Super Administrator may void or confirm an initiated payout on a held commission, with history kept (section 11.6).
7. **Approvals and payouts.** Finance, an Administrator or the Super Administrator (overriding authority rule, 2026-11-12). This replaces the former Decision 7's Finance-only wording, the former section 16.4 ("no additional Admin approval"), and 2026-11-09 item 4.
8. **Allowances (R9 items 1 and 2).** The system computes BA, PA and PB monthly for IST following OPS §6.2, AUG and OCT (section 15). Team credit follows the current upline chain (AUG R23); sale-level reports keep the original attribution (doc 02 §6.3). Excel pays during the parallel run until a month closes with no unexplained differences (section 16).
9. **Clawback (R9 item 3).** The five triggers of OCT R32; the amount is owed by the person paid. Until the IST Commission and Clawback Addendum is signed, the office collects directly; after signing, recovery follows OCT R34. Write-off by an Administrator or the Super Administrator. This replaces the former "no automatic clawback" rule (the former Decision 6 and former section 14.2) only for persons who have signed the addendum. History is never deleted.
10. **Reinstatement (R9 item 4).** A Defaulted sale restored to Active: the clawback still owed is written off, anything recovered is reported for refund, and a release crossed in the meantime is paid again. A returned-cheque clawback is never written off (OCT R33).

## Consistency update (2026-11-12)

1. **IGP cross-reference (owner ruling R13).** Section 2 and the header now point to `docs/business-rules/14-igp-sales.md`, replacing "doc 14 is to be written in round R13". Section 8.1 notes that IGP commission attaches at Series Number issuance at the person's IGP rates (doc 14 §8). No rate, release or clawback rule changed.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings are authoritative and take precedence over earlier text in this document where they differ.

1. **No override for AFhomes leaders.** Per-sale pay goes only to the closing seller (DSC) and the referrer (DRI); leaders earn BA, PA and PB. "Override" is a JA&D pay item only. The section 24 item "Override, where applicable" is closed (section 6).
2. **OST clawback.** The amount is recorded as owed and the office collects it directly. Nothing is deducted automatically from an OST seller's future pay unless a signed OST agreement allows it. The section 24 item "Recovery from OST" is closed (section 14.4.1).
3. **Contract finalization.** A sale counts once the Administrator has approved the sale record; formal contract finalization is tracked separately and is not required (workbook OPS §4.2). It is not a precondition for attachment, release or the Closed Deal. The section 24 item is closed (section 8.4).

## Owner rulings amendment (2026-11-12, payout day)

*Numbering note: items 4 and 5 below continue the follow-up list and are distinct from R8 items 4 and 5 and from the rate and recovery items of the R8/R9 amendment. Other documents cite them as "payout day item 4" (D-A) and "payout day item 5" (D-B). Do not renumber.*

These rulings were given directly by the owner on 2026-11-12. They take precedence over earlier text in this document where they differ.

4. **Payout day (D-A).** A VIP commission payout may be recorded from the first day of the month after the month in which net verified collections first reached 40%. This is the month-end payout of Decision 5, sections 8.2 and 11, and R8 item 4, made after that month is closed. Until a month-close feature exists, the start of the next calendar month stands in for month close. This replaces any reading of "at month-end" as the last calendar day of the release month. There is no waiting period.
5. **Which date sets the release month (D-B).** For now the release month is set by the verification (approval) date of the payment that brought net verified collections to 40%. Doc 13 (OCT O3) stamps Stage 1 by the receipt's own date (the later of the triggering receipt's date and the latest counted receipt's date). Aligning the code with doc 13 is a separate task; neither rule is changed here.
