# FP3: Sales Network and Accreditation

- Atlas journeys: J04 Seller creation, transfer, expiry, renewal and vacancies; J02 Public sponsor preview and AA verification
- Objective: the SVD, SSM, SM and OST hierarchy, seller records, accreditation lifecycle and the public checks around them.
- Business rules: `docs/business-rules/02-sales-network-and-genealogy.md` sections 3 and 6 to 10; `docs/business-rules/03-ist-ost-accreditation.md` sections 4 to 9. Workbook references: NUM section 8, AUG R1, R23, R25, OCT I1 to I4, R28, R37 to R40.
- Depends on: FP1.
- Decision items (all decided on 2026-11-12; see `decisions-and-gaps.md`): G01, G02, G03, G04.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/sales-network` | alias |
| `/admin/sales-network/members` | protected |
| `/admin/sales-network/members/[id]` | protected |
| `/admin/sales-network/genealogy` | protected |
| `/register/ost` | linked |
| `/verify` | direct |

## F3.1 IST/OST creation wizard

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Members, then Add IST or Add OST where permitted: Personal, Address, Assignment, Accreditation. Identity, sponsor or parent, designation and accreditation are validated before the mock create call. Failures show feedback. |
| Target | Two-step entry (doc 03 section 9.1): a Clerk, the Administrator or the Super Administrator enters the seller; the Administrator or Super Administrator approves it, and may approve their own entry with the audit history showing it. The seller is Active and the AA number is final only after approval; an upline is approved before the people under it. Effective-dated appointment and supporting evidence. |
| Layer | Frontend (mock) |
| Blocked by | none (G02 decided in R3) |
| Acceptance | Invalid sponsor, cycles and out-of-scope parents are rejected. An expired parent is accepted with a reminder; a suspended, resigned or terminated parent is rejected (doc 02 section 4.1). A Clerk cannot approve. An entered but unapproved seller has no login and no final AA number. OST cannot get unrestricted team-wide access. |
| Status | Exists (per atlas) |

## F3.2 Member edit, transfer and status

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Separate dialogs for edit, transfer and status. Member detail was redesigned recently (session snapshot lists its browser QA as open). |
| Target | Preserve historical sale attribution when a seller moves. A reviewed roster version is published without reassigning past transactions. Once a seller is approved the record is locked: only the Administrator or the Super Administrator changes it, one field at a time, and each change is audited (doc 03 section 9.1 item 2). Transfers take effect on save and are never backdated (doc 02 section 6.1). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A transfer does not change attribution on past sales. Only the Administrator and Super Administrator see the controls. A Clerk and sellers cannot change an approved record. A backdated transfer date is rejected. |
| Status | Exists (per atlas) |

## F3.3 Genealogy and branch scope

| Field | Value |
|---|---|
| Journey | J04 |
| Current | A viewer moves between genealogy and member detail. Branch visibility follows the mock scope and eligible actions. |
| Target | Role-dependent upline and downline visibility. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each role sees only its permitted branch. |
| Status | Exists (per atlas) |

## F3.4 Accreditation expiry, renewal and AA alias history

| Field | Value |
|---|---|
| Journey | J04, J02 |
| Current | Eligibility and date helpers follow P03. Different login, verify and sales paths need separate treatment. |
| Target | Per R3: an expired seller can still log in, sell, refer and sponsor, with a reminder. A suspended, resigned or terminated seller cannot take new sales or sponsor. A renewal is recorded in the expiry month or later, gives a new AA number from the monthly sequence and moves all history to it. |
| Layer | Frontend (mock) |
| Blocked by | none (G02 decided in R3) |
| Acceptance | Action-specific checks per doc 03 section 9: an expired seller can log in, sell, refer and sponsor with a reminder recorded on the sale; a suspended, resigned or terminated seller is blocked for sales dated on or after the suspension or end date. The public check shows an expired seller as Expired. Renewal before the expiry month is held, not recorded; a renewal issues a new AA number from the monthly sequence, moves all history to it and keeps the old number in the AA Number History, which resolves to the current number. Renewal is allowed while the login is Suspended or Deactivated and does not change the account status; leavers are never renewed (owner answer A6). |
| Status | Decided, awaiting build authorization |

## F3.5 Effective-dated vacant seat and roll-up

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Tree and transfer UI exist. There is no vacant-seat compensation engine. |
| Target | A vacant position earns no seat allowance. Its downline rolls up to the next active level above, and assumed accounts go to the first active level above (AUG R1, R23). |
| Layer | Frontend (mock) |
| Blocked by | none (G04 decided in R3) |
| Acceptance | A vacancy is recorded with an effective date (the day after the holder's end date) and the team stays in place. The vacant seat earns no allowance and its downline counts toward the next active level until the seat is filled (doc 02 section 5.1.1). Past periods are not rewritten. The seat is filled only by promotion (doc 02 section 8) or team transfer (section 6) by the Administrator or Super Administrator. |
| Status | Missing |

## F3.6 Acting SM delegation

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Not verified. No named delegation authority, dates, approval or pay rule exists (U05). |
| Target | None. There is no Acting or temporary leader, ever (owner answer A5, final). A vacant seat earns nothing and its downline counts toward the next active level; the seat is filled only by promotion or team transfer. |
| Layer | None (removed from scope) |
| Blocked by | none (G04 decided in R3; U05 removed from scope by A5) |
| Acceptance | No Acting or temporary leader role, field or control exists in the application. |
| Status | Removed from scope (no Acting SM, final, A5) |

## F3.7 Public AA verification

| Field | Value |
|---|---|
| Journey | J02 |
| Current | `/verify` takes the full identifier and does an exact-match mock query. An active eligible match shows number and class, plus Valid Until for OST only. IST shows no Valid Until. Failures show generic feedback and allow retry. No name search and no customer data. |
| Target | Per R3: an expired seller shows as Expired (not hidden). Keep verification distinct from onboarding. There is no public customer or card lookup (R11). |
| Layer | Frontend (mock) |
| Blocked by | none (G02 (decided R3) may change date semantics) |
| Acceptance | No partial match. No unrestricted records. |
| Status | Exists (route verified in code) |

## F3.8 Public OST application submission

| Field | Value |
|---|---|
| Journey | J02 |
| Current | `/register/ost`: verify the referral code, confirm the sponsor, enter names and optional contact, then Review. Review has no Submit and creates no record (U01). |
| Target | Per R5 (doc 03 section 9.2): the application is kept and Submit creates an application, not a seller record (no AA number, no login). The office reviews it: a Clerk may check and complete it; the Administrator or Super Administrator approves (it becomes a seller under the two-step rule with an eligible upline), returns it to fix, or rejects it with a reason. Every decision is audited. |
| Layer | Frontend (mock); Backend for email or text delivery of the private link |
| Blocked by | none for the mock (G01, G02, U01 decided); real delivery of the private link waits for backend authorization |
| Acceptance | Submit stores an application and issues no AA number or login. A returned applicant corrects the same application through a private link and the office sees the history of each version (follow-up 22). Rejection needs a reason. An approved application follows the two-step seller rule. |
| Status | Missing |

## Out of scope

Public Customer Lookup (F11.6; removed from scope by owner ruling R11).
