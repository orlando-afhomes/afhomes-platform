# AFHomes Platform — Audit Logs & Governance Business Rules

> Single source of truth for the **Audit Logs & Governance** module.
> Cross-references all business-rule documents 01–11, 13 and 14.

---

## 1. Purpose and Scope

This document establishes a centralized, secure, traceable audit framework for the AFHomes Platform and defines governance principles for authorized business-policy changes. It is sufficiently detailed for future AI coding agents to implement correct behavior without inventing authority, losing historical records, or creating inconsistent audit systems across modules.

Audit Logs record what happened. They do not independently authorize business actions. The originating business module remains responsible for applying its own business rules and authorization requirements. Audit Logs must not become an alternative interface for changing financial or customer records.

This is documentation only. No application functionality implemented.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md`
- `02-sales-network-and-genealogy.md`
- `03-ist-ost-accreditation.md`
- `04-customer-management.md`
- `05-vip-products-and-contracts.md`
- `06-vip-card-issuance.md`
- `07-finance-and-payments.md`
- `08-commission-management.md`
- `09-vip-membership-and-stay-points.md`
- `10-redemption.md`
- `11-reports-and-analytics.md`
- `13-sales-performance-reporting.md`
- `14-igp-sales.md` (IGP sales, in scope per owner ruling R11, 2026-11-12)

---

## 3. Terminology

- **Audit Event** — a recorded occurrence of an important business or administrative action.
- **Actor** — the user or system process that performed the action.
- **Append-Only** — ordinary users/admins cannot silently modify or delete existing audit events; corrections are new events.
- **Policy Version** — identifiable revision of an approved business policy.
- **Effective Date** — date a policy or configuration becomes applicable.
- **Historical Policy** — a superseded policy version retained for traceability.
- **Retention Policy** — authorized rules governing how long records must be kept.
- **Centralized Logical Audit** — consistent audit framework across modules.

---

## 4. Current Policy and Future Revisions

AFHomes business rules are approved operational policies and may change following authorized management decisions. Examples of potentially revisable policy areas: VIP product pricing, payment schemes, commission percentages and procedures, Stay Points earning arrangements, annual earning limits for future products, redemption conversion rates, cancellation policies, reporting metric definitions, membership benefits for future contracts, operational approval workflows.

Not every business-rule revision can be made through ordinary Admin settings. Some changes may require appropriate management approval, updated contractual documents, revised role permissions, new implementation work, legal review, or a future deployment. Do not invent universal approval powers.

---

## 5. Centralized Audit Responsibilities

The audit system must support accountability, financial traceability, historical reconstruction, security investigations, authorization reviews, business-policy change tracking, membership and customer lifecycle history, Sales Network genealogy changes, commission decision history, financial reconciliation, reporting integrity, regulatory and contractual compliance.

Use a centralized logical audit framework across the platform. Different modules may produce different types of audit events, but they must follow a consistent shared business structure. Do not establish unrelated audit formats that make cross-module investigation impossible.

Required conceptual characteristics: consistent event identification; identifiable actor; identifiable affected business entity; event type; event timestamp; relevant business context; result of the action; correlation with related events; historical traceability; appropriate access controls.

This is a business-level requirement. Do not prescribe a particular database, message queue, logging provider, or programming library without verified architectural evidence.

---

## 6. Append-Only Audit Policy

The current planning baseline is a centralized, append-only audit history. Ordinary application users and administrators must not be able to silently modify or delete existing audit events.

Once an audit event has been validly recorded: the original event remains historically traceable; a correction is represented by a new event; a reversal is represented by a new event; a cancellation is represented by a new event; a subsequent approval is represented by a new event; earlier events are not silently rewritten.

Example: Finance verifies a ₱10,000 payment. Later, Finance reverses the payment. The system must preserve: (1) original payment submission; (2) original Finance verification; (3) reversal decision; (4) reversal execution; (5) resulting financial reconciliation. Do not erase the verified payment event to make it appear that it never occurred.

No ordinary application role should receive permission to arbitrarily rewrite audit history. Admin status alone must not grant silent audit modification authority.

Exceptional retention or privacy actions: records are kept, and nothing is deleted, until legal advice sets a retention period (owner ruling R11 item 4, 2026-11-12; section 21.2). This is a hold pending legal advice, not a final retention period. Any later retention expiry, archival action, legal erasure, or exceptional records-management operation must follow a separately authorized process consistent with applicable legal and contractual obligations. Do not allow unauthorized deletion under the label of privacy maintenance. Preserve appropriate accountability for any exceptional records-management operation to the extent legally permitted. The exact retention and exceptional deletion process must be identified as a policy dependency until authorized.

---

## 7. Common Audit Record Requirements

Define a conceptual common audit-event structure. Relevant information may include: unique audit event reference; event category; event type; actor identity; actor account category; relevant role or permission context; affected entity type; affected entity reference; related parent or transaction reference; action performed; previous business state; resulting business state; event result; timestamp; authorized business reason; related request or operation reference; applicable policy or rule version; related approval; related financial event; relevant originating module.

Do not require every event to expose unnecessary personal information.

Technical implementation boundary: treat these as conceptual requirements. Do not invent database column names or claim that particular fields already exist. Future implementation must reconcile these requirements with the actual architecture.

---

## 8. Actor Attribution

Audit events must distinguish who or what performed an action. Possible actor categories include Authorized Staff, Admin, Super Admin, Finance, IST, OST, Customer, Authorized Operations personnel, Authorized system process.

Automated events: some operations may be automatically triggered by the system, such as installment becoming Overdue, commission release by stage, commission entering automatic Hold, a clawback raised by a sale event, VIP Membership entering Financial Hold, a tranche released or Non-Activated on its due date, the Points Activation Date deemed on the second anniversary of the Card Claim Date, forfeiture at card expiry, applicable scheduled policy transitions. Automated events must identify the system as the executing actor where appropriate. Preserve the triggering business event and relevant rule. Do not falsely attribute an automatic action to an unrelated human user.

---

## 9. Authentication and Security Audit

Document relevant security events such as account creation, account approval, login success, login failure where security-relevant, logout or session termination where supported, account activation, account deactivation, suspension, reactivation, accreditation expiry affecting access, relevant credential or authentication-setting changes, unauthorized access attempts, sensitive permission-denial events.

Do not require unrestricted collection of sensitive session contents.

Secrets: Audit Logs must not store raw passwords, authentication tokens, API secrets, session credentials, private keys, OTP or recovery secrets. Sensitive technical data must be excluded or appropriately protected.

---

## 10. Roles and Permission Changes

Use `docs/business-rules/01-roles-and-permissions.md`. Document audit requirements for role creation, role modification, role deactivation, role assignment, role removal, module permission changes, staff approval, staff rejection, account activation, account suspension, security-sensitive configuration changes.

Multiple roles: AFHomes supports multiple assigned roles. Effective permissions follow the authorized role model. An audit record must identify the relevant permission change without inventing a conflicting permission algorithm.

Authorization integrity: a user who can view role history must not automatically gain authority to edit role assignments. Audit visibility and authorization to perform the original operation are separate.

---

## 11. Sales Network and Genealogy Audit

Use documents 02 and 03. The established hierarchy is SVD → SSM → SM → OST. An OST may have a direct SVD, SSM, or SM parent.

Document audit requirements for IST account creation, OST account creation, accreditation assignment, accreditation renewal, accreditation expiry, account deactivation/reactivation, IST designation changes, team transfers, IST-to-OST conversion, OST-to-IST conversion, genealogy parent changes, authorized branch reassignments.

Historical preservation: Sales transfers must not retroactively change historical sales attribution. Example: an OST transfers from SM A to SM B. The audit history should preserve original relationship, new relationship, authorized actor, transfer event, effective date, reason where applicable, and references needed to reconstruct historical genealogy. Do not automatically reassign old sales to the new manager.

Identity preservation: keep the canonical person/account identity traceable across authorized conversions and designation changes. Do not treat each conversion as an unrelated new person.

---

## 12. Customer Management Audit

Use `docs/business-rules/04-customer-management.md`. Document audit requirements for customer creation, customer draft creation, draft updates, application submission, application correction, customer information changes, customer status changes, authorized referral changes, supporting document updates, customer import, historical identity reconciliation, duplicate-record resolution.

Drafts: a customer draft may be saved with incomplete or blank fields. Audit logging must not incorrectly treat draft creation as a completed application or Active membership.

Privacy: customer information may include sensitive personal and government identification data. Audit records should preserve necessary change accountability without unnecessarily reproducing confidential documents or complete sensitive values. Do not use Audit Logs as unrestricted copies of customer records.

---

## 13. VIP Products and Contract Governance

Use `docs/business-rules/05-vip-products-and-contracts.md`. Document audit requirements for VIP product creation, VIP tier modification, standard price changes, validity changes, benefit configuration, discount configuration, payment scheme configuration, product activation, product retirement, contract classification changes, authorized commercial exception decisions.

Historical contracts: current product settings must not silently modify previously finalized contracts. Audit events must preserve enough information to establish when a configuration changed and which policy or contract terms governed a transaction.

Contract lifecycle events: contract draft, contract submission, return for correction, resubmission, Admin approval, contract finalization, authorized cancellation, authorized contract correction, authorized contractual amendment.

Critical distinction: a finalized contract is not proof of payment. Contract finalization and Finance payment verification are different business events. Preserve their separate audit histories.

Commercial snapshots: existing finalized contracts preserve their agreed terms. Do not silently overwrite historical contract values when the company updates the product catalog.

---

## 14. Finance Audit

Use `docs/business-rules/07-finance-and-payments.md`. Document required audit events for receipt entry (with its OR or bank reference number), blocked duplicate reference numbers, payment evidence attachment, receipt approval, receipt rejection, return for correction, Fix and resend (each version kept), late-receipt admission into the first open month, outstanding balance adjustment, installment overdue classification, Closed Deal, Stage 1 and Full Payment date stamping, receipt reversal with its reason, refund approval and execution, Finance reconciliation, Fully Paid determination, month close, 90-day no-payment listing, Defaulted marking and return to Active, Financial Hold, Financial Hold resolution.

Approved authority (owner ruling R6 and the overriding authority rule, 2026-11-12): a Clerk enters receipts; sellers view only. Finance, the Administrator or the Super Administrator approves receipts and may reverse an approved receipt with a reason. Self-approval is allowed; the audit record must show when the same person entered and approved a receipt. The Administrator or the Super Administrator closes months and marks sales Defaulted. The audit document must preserve this authority. Do not introduce new approval requirements.

Financial traceability: the original financial transaction remains traceable after reversal or correction. Do not allow audit records to conceal financial discrepancies.

Finance timestamps: distinguish submitted date, verification date, reversal date, refund date, reconciliation date. Do not substitute one event timestamp for another in reporting.

---

## 15. Commission Audit

Use `docs/business-rules/08-commission-management.md` (owner rulings R8 and R9, 2026-11-12) and, for IGP, `docs/business-rules/14-igp-sales.md` §8. The system computes DSC and DRI from per-person rates frozen on the sale; approving and paying are explicit actions by Finance, the Administrator or the Super Administrator. Document audit requirements for:

- per-person DSC and DRI rate changes by the Administrator or the Super Administrator (old value, new value, actor, date, reason; future sales only);
- freezing of the seller's DSC rate, the referrer's DRI rate and the Closed Deal threshold when the VIP Number (IGP: Series Number) is issued;
- referrer or rate corrections under doc 08 §9.3;
- release of each stage and the month it falls in;
- month-end payout list approval, with a self-approval visibly flagged;
- payout initiation, voiding or confirmation of a stuck initiated payout, and actual disbursement confirmation (Paid);
- automatic Hold on a sale event, and restoration or cancellation of a held release;
- clawback raised, direct collection, recovery offset (only after the Clawback Addendum is signed), write-off with reason, and refund reporting after a Defaulted sale is reinstated;
- BA, PA and PB computation, BA withholding with reason, and changes to allowance figures;
- parallel-run comparisons and the switch decision (doc 08 §16).

Historical calculations: preserve the frozen rate, the contract TCP and the computed amount. A later rate change never recalculates an existing sale.

Attribution: per-sale commission follows the seller and referrer frozen on the sale; allowance team credit follows the current upline chain (doc 08 §7). Record both so history can be reconstructed.

Automated actor: releases, automatic Holds and clawbacks raised by a sale event are system events linked to the triggering sale event.

No silent rewriting: paid commission history remains traceable; clawbacks, recoveries and write-offs are new events. No deduction from commission or allowances before the Clawback Addendum is signed (doc 08 §14.3).

---

## 16. VIP Membership and Card Issuance Audit

Use documents 06 and 09. Document audit events for VIP Number issuance (date, monthly sequence, segments), number status changes (ACTIVE, UPGRADED, CANCELLED), any approved number correction, membership eligibility determination, official activation, Card Claim Date recording (actual or deemed), membership status changes, Financial Hold, Financial Hold resolution, membership expiration, contract-specific membership adjustments, historical membership imports, authorized corrections.

Critical distinction: membership activation requires an official activation event after full payment through approved receipts (doc 07 §5.2 and §16). Fully Paid does not automatically equal Active Membership. Number issuance, activation and card claim are separate events; activation and card claim never create or change the number.

VIP Number (doc 06 §3 and §6; owner ruling R2, 2026-11-12): one 17-character number `YYMMDD NNNNN VT P MM S` serves as the Reservation Agreement number, the Grant number and the card number; there is no separate RA No. or Card ID. It is issued once, when the signed Reservation Agreement is recorded: YYMMDD is that recording date (Asia/Manila), NNNNN is the company-wide monthly sequence, and the tier, payment and classification segments are a snapshot at issuance. Do not create a competing allocator. A number is never regenerated or reused, including after cancellation or upgrade; any change needs management approval, recorded by the Super Administrator with a reason. Audit history must preserve original identifiers. IGP Series Numbers are separate (doc 14 §5).

---

## 17. Stay Points Audit

Use `docs/business-rules/09-vip-membership-and-stay-points.md` (owner ruling R10, 2026-11-12). Points follow the signed Grant's Annual Welcome Gift: fixed annual tranches per tier, each released only when Qualifying Spend reaches the tier minimum in its measurement period, or by a Compassionate Waiver. Spend-to-Earn is removed.

Required audit events (doc 09 §24): Card Claim Date recording; Points Activation Date setting and its cause (first redemption or deemed); resort bill entry with its system-wide unique OR number, blocked duplicate OR numbers, bill approval, correction and refund; tranche release, Non-Activation and waiver release; waiver request, grant or refusal with written reason; reservation, redemption, cancellation return and no-show forfeit (doc 10); transfer closure; expiry forfeit; Financial Hold and restoration; historical import.

Each record keeps the actor, timestamp, membership and VIP Number, tranche and bucket (weekday/non-holiday or weekend/holiday), previous and resulting values, reason, and supporting reference.

Entitlements: audit records reference the Grant template the membership was signed on (tranche count, size and split, minimum spend) rather than assuming current catalog values apply to all historical memberships.

No negative balances: a refund lowers Qualifying Spend; a released tranche is never taken back; there is no Points Hold (doc 09 §13).

---

## 18. Redemption Audit

Use `docs/business-rules/10-redemption.md` (owner ruling R12, 2026-11-12). Document future audit requirements for booking creation, eligibility check, booking confirmation and points reservation, Pending Payment status, receipt approval for any money part, stay completion and points consumption, cancellation and return of points to the same bucket, no-show recording and forfeit, Points Activation Date set by a first redemption, Terms of Use (points-per-night) table versions, holiday calendar changes, venue and cut-off changes, card transfer requests and written management approvals, and corrections (doc 10 §19).

Booking authority: front-desk or office staff holding the Bookings operation permission make bookings and record completion and no-shows. There is no separate approval step; every booking is audited, and an Administrator or the Super Administrator can cancel or correct any booking, with the correction audited (doc 10 §9.2; owner follow-up ruling, 2026-11-12).

Finance separation: monetary payment components are approved only as receipts under doc 07 §5.2 (Finance, the Administrator or the Super Administrator; owner ruling R6, 2026-11-12).

Points lifecycle: reserved points are not finally consumed until the authorized completion event or another separately approved contractual outcome.

Module status: Redemption and Services remain preserved but hidden/disabled in the planned MongoDB system. Redemption rules are being planned in doc 10 (owner ruling R11 item 3, 2026-11-12); the module stays disabled until the owner authorizes its build. Audit documentation must not re-enable these modules. Historical records must remain traceable where authorized.

---

## 19. Reports and Analytics Integration

Use `docs/business-rules/11-reports-and-analytics.md`. Audit reporting may be available to appropriately authorized personnel. Relevant business-level audit views may include activity by module, activity by authorized actor, security-sensitive changes, financial corrections, approval history, account status changes, policy revisions, membership history, commission payout history, historical reconciliation activity, exception cases.

Reporting authorization: do not assume all administrators or staff should see every audit event. Apply existing module permissions and record-level privacy restrictions.

Historical reporting: reporting should preserve relevant event chronology. Do not erase original events when a correction or reversal occurs.

Reporting is read-only: viewing an audit report must not become an alternate method for modifying the underlying business record.

---

## 20. Business-Policy Governance

### 20.1 Current Policies Are Revisable

AFHomes business rules are approved operational policies and may change following authorized management decisions. Examples of potentially revisable policy areas: VIP product pricing, payment schemes, commission percentages and procedures, Stay Points earning arrangements, annual earning limits for future products, redemption conversion rates, cancellation policies, reporting metric definitions, membership benefits for future contracts, operational approval workflows.

Important limitation: not every business-rule revision can be made through ordinary Admin settings. Some changes may require appropriate management approval, updated contractual documents, revised role permissions, new implementation work, legal review, or a future deployment. Do not invent universal approval powers.

### 20.2 Policy Change Lifecycle

Document a controlled conceptual policy lifecycle. Recommended stages: Proposed Change, Review, Authorized Approval, Scheduled or Immediate Effective Date, Active Policy, Superseded Policy, Historical Reference. These are conceptual governance stages. Do not claim they are implemented database enums.

Required policy information: preserve the ability to identify policy identity, policy subject, previous policy, proposed revision, approval authority, effective date, applicable business scope, reason for revision, supporting authorization, previous version reference, current version reference, historical affected transactions where relevant.

### 20.3 Historical Policy Versioning

A later policy revision must not silently change historical contractual facts.

Example — VIP Price Change: Bronze standard price changes for future contracts. Existing finalized contracts must retain their agreed price. The audit system should make it possible to determine original authorized configuration, date of policy change, new configuration, applicable effective date, which finalized contracts used earlier terms.

Example — Redemption Basis Change: Admin publishes a new Terms of Use version that raises the points per night for a room type (illustrative figures: 3,000 to 3,500). Cards keep the version in effect on their Card Claim Date, confirmed bookings are not repriced, and both versions remain traceable (doc 10 §8).

Example — Commission Rate Change: an Administrator or the Super Administrator changes a person's DSC or DRI rate, or the position standard changes. The change applies only to sales whose number is issued afterwards; frozen rates, released amounts and actual payouts are never silently recalculated (doc 08 §9.2).

Example — Stay Points Policy Revision: a future Grant template sets different tranche terms. Existing memberships keep the terms of the template they were signed on; historical tranche releases are never re-run or rewritten without separately authorized reconciliation (doc 09 §19.1).

### 20.4 Administrative Configuration Governance

Where Admin is explicitly authorized to configure a policy, changes must be traceable: who made the change, when it occurred, which setting was affected, previous value, new value, applicable effective date, authorized reason where required, relevant policy reference.

Authorization separation: permission to configure a VIP product does not automatically grant permission to approve commission payouts. Permission to manage redemption pricing does not automatically grant permission to verify customer payments. Permission to review audit history does not automatically grant permission to change all business policies. Preserve module ownership.

---

## 21. Data Privacy and Retention

### 21.1 Privacy-Conscious Audit Design

AFHomes processes customer and staff information. Audit history must support accountability without unnecessarily exposing personal data. Relevant principles: data minimization, purpose limitation, appropriate access restrictions, protection of financial information, protection of government identification information, traceability of sensitive administrative actions, authorized disclosure only, retention according to applicable policies and legal requirements. The applicable Philippine Data Privacy Act and other relevant legal obligations must be considered during future implementation. Do not invent a universal statutory retention period. Do not claim this document constitutes legal advice or approves a compliance policy.

Sensitive values: avoid unnecessary storage of complete government ID numbers, private customer documents, bank account information, authentication credentials, medical or other highly sensitive personal information, full payment-card information. Preserve necessary business references rather than duplicating sensitive records without purpose.

### 21.2 Audit Retention and Archival

Document the need for an authorized retention policy. Potential considerations: operational audit needs, financial record requirements, contractual recordkeeping, legal retention obligations, security investigations, archived record accessibility, privacy-related retention limits.

**Owner ruling R11 item 4 (2026-11-12): records are kept forever, and nothing is deleted until legal advice sets a retention period.** This covers audit events and the business records they describe. No automatic deletion, purge or expiry exists.

Important: do not invent retention durations such as 5, 7, 10, or 20 years. The final retention period, archival rules and any lawful deletion procedure remain an open dependency until legal advice is received and the owner approves it.

History import (owner ruling R11 item 5): every seller and every unfinished sale is imported with its full receipt history; finished sales stay in the company's Excel archives and are not imported (doc 11 §26). Imported records keep their original dates and are identifiable as imported. Imported receipts are marked "Approved (imported)"; an Administrator signs off each import batch once, and the sign-off is an audit event recording the batch, the number of records, the actor and the timestamp (owner follow-up ruling, 2026-11-12; doc 07 §20).

Append-only compatibility: normal operational audit history remains append-only. Exceptional lawful records-management procedures must be separately authorized, controlled, and auditable where legally permitted.

---

## 22. Audit Security and Reliability

### 22.1 Access Security

The future audit system must support appropriate safeguards against unauthorized event editing, unauthorized event deletion, unauthorized audit visibility, false actor attribution, duplicate business-event recording, silent financial changes, improper permission escalation, unauthorized administrative activity.

Technical details: do not prescribe a specific cryptographic signing, storage, or logging solution without verifying the existing architecture. Tamper-evidence mechanisms, restricted database permissions, and similar protections may be identified as technical recommendations rather than falsely represented as implemented features.

### 22.2 Event Accuracy and Reliability

Audit events must accurately represent actual business outcomes. Successful actions: record successful state-changing operations. Failed or rejected actions: record relevant security or business exceptions without falsely presenting them as successful changes. Repeated requests: avoid duplicate financial or business state changes when the same operation is retried. Related actions: multi-step workflows should support correlation between associated business events.

Important distinction: audit logging must not falsely confirm a business operation that actually failed. The relationship between business transaction integrity and audit persistence must be specified as an implementation requirement, without inventing an unverified database transaction architecture.

---

## 23. Cross-Module Ownership

### 23.1 Business Authority Matrix

| Module | Owns the business operation | Audit responsibility |
|---|---|---|
| Roles and Permissions | Authorized account/permission changes | Record who changed access |
| Sales Network | Team identity and genealogy | Preserve transfer and relationship history |
| IST/OST Accreditation | Accreditation lifecycle | Preserve approvals, renewal, expiry and status changes |
| Customer Management | Customer identity and applications | Preserve authorized changes |
| VIP Products | Product and commercial configuration | Preserve policy changes |
| VIP Contracts | Contract approval and finalization | Preserve contract lifecycle |
| Finance | Payment verification, refunds and reversals | Preserve financial decisions |
| Commission Management | Rates, releases, payout approvals, payouts, clawbacks and allowances | Preserve commission and disbursement history |
| VIP Card Issuance | VIP Number issuance and status | Preserve issued numbers and status changes |
| VIP Membership | Official activation, Card Claim Date and membership states | Preserve membership history |
| Stay Points | Qualifying Spend, tranche releases, waivers and balances | Preserve points ledger events |
| Redemption | Bookings and points consumption | Preserve booking and redemption history |
| Reports & Analytics | Authorized reporting | Preserve relevant report/configuration change history |
| Audit Logs | Central historical evidence | Protect event integrity and authorized access |

The audit system must not replace originating module authority.

---

## 24. Required Business Scenarios

(See Part XX of the task prompt for scenarios A–N; summarized here with expected outcomes.)

- **Scenario A (Receipt approval):** a Clerk enters a receipt with its reference number; Finance, the Administrator or the Super Administrator approves it. Expected: entry event and approval event recorded, correct actors identified, a self-approval visibly flagged, no approval before the approver acts.
- **Scenario B (Receipt reversal):** an approved receipt is reversed for a keying error or a bounced cheque. Expected: original approval remains traceable, reversal event recorded with actor and reason, nothing deleted, relevant reconciliation identifiable.
- **Scenario C (Commission release, approval and payout):** a sale reaches its release stage; Finance, the Administrator or the Super Administrator approves the month-end payout list and later confirms disbursement. Expected: separate release, approval and payout events, frozen rate and amount recorded, Paid status only after actual disbursement confirmation.
- **Scenario D (OST team transfer):** an OST transfers from one SM to another. Expected: original and new parent relationships remain traceable, historical sales attribution preserved, authorized actor recorded.
- **Scenario E (VIP Number, activation and card claim):** the VIP Number is issued when the signed Reservation Agreement is recorded; approved receipts later reach full payment; official activation follows; the card is claimed. Expected: separate issuance, activation and Card Claim Date events, the number unchanged by activation and claim, no duplicate number on repeated processing.
- **Scenario F (Tranche release):** a Bronze cardholder's approved Qualifying Spend reaches ₱1,000 in the measurement period. Expected: each bill entry references its unique OR number; on the due date a tranche release event records 10,000 points (7,000 weekday, 3,000 weekend); no release when the minimum is not met unless a waiver is granted.
- **Scenario G (Qualifying bill refund):** a qualifying bill is refunded. Expected: the original bill remains traceable, a dated refund entry is recorded, Qualifying Spend is lowered, a released tranche is not taken back, no negative-point adjustment.
- **Scenario H (Redemption completion):** staff confirm a booking and reserve points; the stay is completed later. Expected: confirmation event, reservation event, completion event, final consumption event, no duplicate deduction.
- **Scenario I (Redemption basis change):** Admin publishes a new Terms of Use version. Expected: previous and new versions traceable, effective date identifiable, cards keep the version in effect on their Card Claim Date, confirmed bookings not repriced.
- **Scenario J (Unauthorized access attempt):** a user attempts to access restricted financial records. Expected: access denied, relevant security event may be recorded, confidential data not exposed.
- **Scenario K (Historical record correction):** an authorized Finance correction changes a transaction's financial effect. Expected: original transaction preserved, new correction event recorded, historical reporting reconstruction remains possible.
- **Scenario L (Business policy revision):** management authorizes a new policy. Expected: previous policy preserved, authorized change traceable, effective date identifiable, historical contracts protected.
- **Scenario M (Duplicate processing):** the same operation is retried. Expected: no duplicate business effect, audit records correctly distinguish retry attempts from completed operations where relevant.
- **Scenario N (Exceptional retention requirement):** a records-management action becomes necessary under an applicable retention or privacy obligation. Expected: no ordinary user can silently erase audit history, the action follows an authorized compliant procedure, no unsupported retention or deletion policy is invented.

For each scenario, explain preconditions, authorized actor, business event, expected audit record, resulting state, security and historical requirements. These scenarios are documentation acceptance examples, not evidence of executed tests.

---

## 25. Non-Negotiable Invariants

The completed document must preserve:

1. Centralized logical audit standards.
2. Append-only history during normal operations.
3. No silent modification of historical audit events.
4. Corrections recorded as new events.
5. Original financial records remain traceable.
6. Canonical customer identities remain preserved.
7. Historical Sales Network attribution remains preserved.
8. Receipt approval belongs to Finance, the Administrator and the Super Administrator; self-approval is audited (R6).
9. Finance, the Administrator or the Super Administrator approve and pay commission; self-approval is audited (doc 08).
10. Bookings with points are made by staff holding the booking action permission (doc 10 §9.2).
11. Business modules retain their own operational authority.
12. Audit access does not grant permission to modify business records.
13. Account permissions remain subject to existing RBAC.
14. Sensitive information is appropriately protected.
15. Authentication secrets must not be stored in audit records.
16. Automated actions must be attributed accurately.
17. Historical policy versions remain traceable.
18. Product configuration changes do not silently rewrite finalized contracts.
19. Previously issued VIP Numbers remain traceable.
20. Historical tranche releases and redemptions remain auditable.
21. Duplicate processing must not create duplicate financial outcomes.
22. Business rules may change through authorized future decisions.
23. Not every policy is automatically Admin-configurable.
24. Legal retention and privacy requirements must be respected.
25. Records are kept and nothing is deleted until legal advice sets a retention period (R11); no retention duration is invented.
26. No unrestricted audit deletion capability is introduced.
27. Existing signed customer rights remain protected.
28. No unsupported technical architecture is represented as implemented.
29. Disabled modules remain disabled.
30. Documentation does not authorize implementation.

---

## 26. Outstanding Dependencies

Material unresolved matters may include: formal audit retention periods; authorized archival policy; exceptional lawful deletion procedures; audit export authorization; audit access levels; security event retention; policy approval hierarchy; policy publication workflow; requirements for customer notification of policy changes; specific audit tamper-evidence technology; historical policy reconstruction technical approach; audit storage architecture; operational log versus business audit separation; legal hold requirements; audit disaster-recovery procedures; cross-system event correlation mechanisms.

Only include unresolved dependencies that materially affect future implementation. Do not invent technical or commercial policies. Do not ask the project owner minor clarification questions during this task.

---

## 27. Implementation Acceptance Criteria

### Audit Foundation
- [ ] Centralized logical audit framework.
- [ ] Append-only normal operational history.
- [ ] Corrections represented by new events.
- [ ] Actor identity.
- [ ] Entity references.
- [ ] Timestamps.
- [ ] Previous and resulting states.
- [ ] Event correlation.
- [ ] Audit access restrictions.

### Security
- [ ] Authentication activity.
- [ ] Account status changes.
- [ ] Role assignments.
- [ ] Permission changes.
- [ ] Relevant unauthorized access events.
- [ ] Protection of sensitive information.
- [ ] Authentication secrets excluded.
- [ ] Automated actor attribution.

### Business Modules
- [ ] Sales Network.
- [ ] Genealogy transfers.
- [ ] IST/OST Accreditation.
- [ ] Customer Management.
- [ ] VIP Products.
- [ ] VIP Contracts.
- [ ] Finance and Payments.
- [ ] Commission Management.
- [ ] VIP Membership.
- [ ] Stay Points.
- [ ] Redemption.
- [ ] Reports and Analytics.

### Financial Integrity
- [ ] Original verified payments preserved.
- [ ] Refunds and reversals traceable.
- [ ] Commission approvals recorded.
- [ ] Commission payouts recorded separately.
- [ ] Points adjustments traceable.
- [ ] No fabricated financial events.
- [ ] Duplicate business effects prevented.

### Policy Governance
- [ ] Business rules recognized as revisable.
- [ ] Authorized changes required.
- [ ] Configurable versus structural rules distinguished.
- [ ] Previous policy versions preserved.
- [ ] Effective dates addressed.
- [ ] Historical contract protection.
- [ ] Future policy changes traceable.

### Privacy and Retention
- [ ] Data minimization.
- [ ] Sensitive financial data protection.
- [ ] Customer privacy.
- [ ] Audit access controls.
- [ ] Retention-policy dependencies.
- [ ] Exceptional lawful records management.
- [ ] No invented universal retention period.

### System Boundaries
- [ ] Existing modules retain their authority.
- [ ] Audit Logs do not authorize business changes.
- [ ] Historical records remain traceable.
- [ ] Redemption remains disabled where required.
- [ ] Services remains disabled where required.
- [ ] No application implementation authorized.

---

## Completion Report

- **File created/updated:** `docs/business-rules/12-audit-logs-and-governance.md`
- **Audit rules coverage:** Centralized audit standards; append-only history; actor attribution; financial traceability; security and access auditing; module-specific events; historical integrity; audit reporting.
- **Governance coverage:** Current policy versus future revisions; authorized configuration changes; policy versioning; effective dates; historical contract protections; audit retention limitations.
- **Cross-module review:** Consistent with 01–11 and 13. No material contradictions.
- **Outstanding dependencies:** Listed in Section 26.
- **Acceptance results:** All checklist items covered. Documentation completeness does not prove implementation readiness.
- **Change scope:** Documentation only. No application code, database, migrations, other documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/12-audit-logs-and-governance.md` created. Redemption and Services remain disabled. No unauthorized implementation assumptions. No unsupported technical architecture represented as implemented. No invented retention periods.

## Owner rulings amendment (2026-11-12, rounds R6, R7, R11)

These rulings are authoritative and take precedence over earlier text in this document where they differ. Ground rule: the company workbook wins by default; dated owner rulings outrank everything.

1. **Receipt authority (R6; overriding authority rule).** A Clerk enters receipts with a required, system-wide unique OR or bank reference number. Finance, the Administrator or the Super Administrator approves; self-approval is allowed and the audit record shows that the same person entered and approved. This replaces "only Finance verifies". Sections 14 and 25.
2. **Receipt history (R6).** Fix and resend keeps every earlier version; a reversal is a dated event with actor and reason, never a deletion; a late receipt's admission into the first open month is recorded. Section 14.
3. **Month close and defaults (R7).** Month close, the 90-day no-payment listing, Defaulted marking and return to Active are audited events performed by the Administrator or the Super Administrator (marking and closing) or the system (listing). Section 14; doc 13 §4.5 and §4.6.
4. **Retention (R11 item 4).** Records are kept forever, and nothing is deleted until legal advice sets a retention period. No duration is invented. Sections 6, 21.2 and 25.
5. **History import (R11 item 5).** Every seller and every unfinished sale is imported with its full receipt history; finished sales stay in the Excel archives; a side-by-side parallel run follows and the switch happens when a month closes with no unexplained differences (Rollout Guide v1.4 §6 and §8). Section 21.2; doc 11 §26.
6. **No public lookup (R11 item 1).** There is no public VIP card or customer check; only staff check cards (doc 11 §21).
7. **IGP in scope (R11 item 2).** IGP audit events follow this document; IGP rules are in `docs/business-rules/14-igp-sales.md`. Section 2.
8. **Redemption (R11 item 3).** Planned in doc 10; stays disabled until the owner authorizes the build. Section 18.
9. **CMS deferred (R11 item 6).** No CMS audit events are required until the CMS is authorized.

## Consistency update (2026-11-12)

Wording aligned with the rewritten docs 06, 08, 09, 10 and 14. No new rule is introduced here.

1. **Commission audit (doc 08, R8 and R9).** Sections 8, 15, 20.3, 23.1, 24 (Scenario C) and 25: the former Finance-only manual percentage, upline and Finance-controlled recovery wording is replaced by per-person rates frozen on the sale, stage releases, payout approval by Finance, the Administrator or the Super Administrator, and clawbacks under doc 08 §14.
2. **VIP Number (doc 06, R2).** Sections 16, 23.1, 24 (Scenario E) and 25: the former Card ID with an activation-date prefix and an RA-derived sequence is replaced by the single VIP Number issued when the signed Reservation Agreement is recorded, with a monthly sequence; Card Claim Date recording is audited.
3. **Stay Points audit (doc 09, R10).** Sections 8, 17, 20.3, 23.1, 24 (Scenarios F and G) and 25: Spend-to-Earn, the 70/30 per-transaction split, earning caps and Points Holds are replaced by Annual Welcome Gift tranche events.
4. **Redemption audit (doc 10, R12).** Sections 18, 20.3, 24 (Scenarios H and I) and 25: Reservations approval and service pricing are replaced by staff bookings under an action permission and the versioned Terms of Use table.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

1. **Imported receipts.** History receipts come in marked "Approved (imported)". An Administrator signs off each import batch once; the batch sign-off is audited (history import paragraph above the append-only compatibility note; doc 07 §20).
18. **Bookings.** Room bookings with points are made by front-desk or office staff with a Bookings operation permission, with no separate approval step. Every booking is audited, and Admins can cancel or correct any booking (section 18). The former outstanding item is resolved.
