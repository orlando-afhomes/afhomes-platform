# FP3: Sales Network and Accreditation

- Atlas journeys: J04 Seller creation, transfer, expiry, renewal and vacancies; J02 Public sponsor preview and AA verification
- Objective: the SVD, SSM, SM and OST hierarchy, seller records, accreditation lifecycle and the public checks around them.
- Business rules: `docs/business-rules/02-sales-network-and-genealogy.md` sections 3 and 6 to 10; `docs/business-rules/03-ist-ost-accreditation.md` sections 4 to 9. Workbook references: NUM section 8, AUG R1, R23, R25, OCT I1 to I4, R28, R37 to R40.
- Depends on: FP1.
- Open decisions: G01, G02 (Conflicting), G03, G04.

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
| Target | Same, with effective-dated appointment and supporting evidence. |
| Layer | Frontend (mock) |
| Blocked by | G02 for accreditation dates |
| Acceptance | Invalid sponsor, cycles and out-of-scope parents are rejected. OST cannot get unrestricted team-wide access. |
| Status | Exists (per atlas) |

## F3.2 Member edit, transfer and status

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Separate dialogs for edit, transfer and status. Member detail was redesigned recently (session snapshot lists its browser QA as open). |
| Target | Preserve historical sale attribution when a seller moves. A reviewed roster version is published without reassigning past transactions. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A transfer does not change attribution on past sales. Only eligible actors see the controls. |
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
| Target | Workbook rule: only an Expired seller can still sell, with a warning. An effective suspension or departure blocks new sales. Renewal in or after the expiry month creates a new monthly AA, keeps the old number and starts a one-year period from the actual renewal. |
| Layer | Owner decision |
| Blocked by | G02 (Conflicting) |
| Acceptance | After the decision: action-specific checks for login, verify and sale. An AA alias history is kept. |
| Status | Blocked |

## F3.5 Effective-dated vacant seat and roll-up

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Tree and transfer UI exist. There is no vacant-seat compensation engine. |
| Target | A vacant position earns no seat allowance. Its downline rolls up to the next active level above, and assumed accounts go to the first active level above (AUG R1, R23). |
| Layer | Owner decision |
| Blocked by | G04 |
| Acceptance | After the decision: vacancy dates drive roll-up, and past periods are not rewritten. |
| Status | Missing |

## F3.6 Acting SM delegation

| Field | Value |
|---|---|
| Journey | J04 |
| Current | Not verified. No named delegation authority, dates, approval or pay rule exists (U05). |
| Target | A time-limited delegation approved separately from the permanent title and from vacancy reporting. Needs approver, duration, inherited permissions, incentive treatment and handback. |
| Layer | Owner decision |
| Blocked by | G04, U05 |
| Acceptance | To be defined after the decision. |
| Status | Blocked |

## F3.7 Public AA verification

| Field | Value |
|---|---|
| Journey | J02 |
| Current | `/verify` takes the full identifier and does an exact-match mock query. An active eligible match shows number and class, plus Valid Until for OST only. IST shows no Valid Until. Failures show generic feedback and allow retry. No name search and no customer data. |
| Target | Same. Keep verification distinct from onboarding. |
| Layer | Frontend (mock) |
| Blocked by | none (G02 may change date semantics) |
| Acceptance | No partial match. No unrestricted records. |
| Status | Exists (route verified in code) |

## F3.8 Public OST application submission

| Field | Value |
|---|---|
| Journey | J02 |
| Current | `/register/ost`: verify the referral code, confirm the sponsor, enter names and optional contact, then Review. Review has no Submit and creates no record (U01). |
| Target | After approval: sponsor eligibility, review authority, correction and rejection, record creation and status notification. |
| Layer | Owner decision, then Frontend (mock) and Backend |
| Blocked by | G01, G02, U01 |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## Out of scope

Public Customer Lookup (F11.6).
