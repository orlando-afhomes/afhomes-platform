# AFHomes Platform — Customer Management Business Rules

> Single source of truth for the **Customer Management** module.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Accreditation: `docs/business-rules/03-ist-ost-accreditation.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.

---

## 1. Document Metadata

- **Module:** Customer Management
- **Version:** 1.0
- **Status:** Approved business rules
- **Type:** Business rules documentation
- **Implementation:** Not included in this document

---

## 2. Purpose and Scope

Customer Management is the central customer identity and information management module.

It maintains the customer master record, supports authorized customer creation (including drafts), preserves customer identity independently of VIP membership, and enforces authorized data access and auditability.

It integrates with other modules without taking responsibility for their separate business processes. Creating a customer record is **not** a completed VIP sale, finalized VIP contract, confirmed payment, activated VIP membership, commissionable sale, or issued VIP card.

---

## 3. Official Terminology

- **Customer Master Record** — persistent identity and registered information of a person.
- **Customer ID / RA Number** — official unique customer identifier.
- **Draft** — a saved, possibly incomplete customer registration.
- **Submit** — action to validate and finalize a customer registration.
- **Referrer / VIP Recommender** — the same OST member associated with a customer registration.
- **Acquisition Channel** — how the customer was acquired.
- **VIP Membership** — separate lifecycle from customer identity.

---

## 4. Relationship to Other Modules

- **Organization Management** provides staff accounts, roles, permissions, and access control.
- **Sales Network** provides IST/OST identities, designations, genealogy, and sales associations.
- **VIP Products and Contracts** provide VIP tiers, pricing, and payment schemes.
- **Finance** handles payment verification and collections.
- **VIP Membership** manages membership status and validity.
- **Commissions** handles entitlement and payouts.

Customer Management references existing records in these modules and must not duplicate their registries or invent their rules.

---

## 5. Customer Registration Authority

Only these user classifications may register new customers:

| User Type | Customer Registration |
|---|---|
| Super Admin | Allowed |
| Admin | Allowed |
| Authorized Staff | Allowed |
| IST — SVD | Allowed |
| IST — SSM | Allowed |
| IST — SM | Allowed |
| OST | Not Allowed |

Registration by Authorized Staff and IST must still respect applicable authentication and access permissions.

**OST personnel must not have direct Customer Creation access.** OST can be selected as Referrer / VIP Recommender, access permitted records of their own customers, and view their own authorized sales information. OST cannot create customer master records, obtain Customer Creation access solely because they are listed as a recommender, view unrelated customers, or view other OST members' customer records.

---

## 6. Customer Master Record

The customer master record represents the person's persistent identity and registered information. It may exist without an active VIP membership. The customer retains identity across changes in VIP status.

Customer identity does not change when a customer buys another VIP product, when a salesperson transfers teams, or when VIP membership expires.

---

## 7. Customer Creation Form

The Customer Creation form supports the following official information groups. Not all fields are mandatory. The form supports both Save as Draft and Submit.

### 7.1 Section A — VIP Information

Fields: VIP Plan, Payment Scheme.

VIP Plan options (exact identifiers):

| Code | VIP Tier |
|---|---|
| G1 | Gold |
| S1 | Silver |
| B1 | Bronze |

Do not introduce additional tiers without business approval.

Payment Scheme uses the official payment schemes established by VIP Products, Contracts, and Finance business rules. Do not invent payment schemes, terms, down payments, installment schedules, or prices. The selected plan and payment scheme are associated with the relevant VIP application or intended purchase, not permanently embedded as immutable customer identity properties.

### 7.2 Section B — Government Identification

Fields: Valid ID; Image of Government ID; ID Number (optional).

Valid ID supports selection/recording of the customer's government identification type using the official company-approved list where defined. Do not invent an unsupported ID list.

Government ID image is sensitive personal information. It must be accessible only to appropriately authorized personnel, not visible in ordinary Sales Network reporting, not exposed through public customer lookup, and handled per privacy and security controls. Uploading an image is not automatic verification of authenticity.

ID Number is explicitly optional. Do not change to mandatory without business approval.

### 7.3 Section C — Personal Information

Fields: First Name, Last Name, Middle Name, Suffix, Birth Date, Gender, Citizenship, Civil Status.

Suffix options: Jr., Sr., II, III, IV (a customer without suffix is supported).

Gender options (approved form values): Male, Female.

Civil Status options: Single, Married, Widowed, Separated.

Preserve actual entered name components. Do not require middle name or suffix for every customer unless a separate approved rule requires it. Do not introduce automatic customer-name masking in authorized internal Customer Management records.

### 7.4 Section D — Permanent Address

Fields: Permanent Address Line 1, Permanent Address Line 2, Province, City/Municipality, Barangay, Postal Code.

Province, City/Municipality, and Barangay use fixed selectable reference values with dependent selection: Province → City/Municipality → Barangay. Show only matching cities for the selected province and matching barangays for the selected city. Prevent invalid combinations. Do not require manual typing of standard location names when official reference exists.

Postal Code is automatically populated based on selected location when an unambiguous official mapping exists. Where multiple valid postal codes may apply, do not invent one; document the need for appropriate selection or verification. Use authoritative location reference data.

### 7.5 Section E — Contact Information

Fields: Landline, Mobile, Email. Support incomplete contact information in Draft status. Do not invent additional contact fields. Do not assume all contact fields are simultaneously mandatory; validate provided information appropriately during Submit.

### 7.6 Section F — Employment / Business

Fields: Occupation / Business, Office / Business Address, Business / Industry, Employed Position. Support partial information during Draft. Do not require customers to be formally employed. Do not invent mandatory employer names, income declarations, or employment documents. The form should remain usable for customers whose employment or business circumstances do not apply to every field.

### 7.7 Section G — Customer ID (RA Number)

The official identifier is referred to as RA Number / Customer ID. Support two methods: Automatic (system generates next unique Customer ID using the official AFHomes Customer ID format and allocator) and Manual (Authorized Staff, IST SVD/SSM/SM, Super Admin/Admin according to permissions may manually enter).

Validation: every officially established Customer ID must be unique; duplicates prohibited; manual IDs must satisfy official company identifier format. A Customer ID belongs to its customer and does not change when a customer buys another VIP product, when a salesperson transfers teams, or when VIP membership expires.

Inspect any documented official Customer ID generator before specifying its literal format. Do not invent an RA Number pattern. Do not reuse the IST/OST `AAI`/`AAO` accreditation number format for customers. Do not confuse Customer ID with VIP Card ID, VIP Control Number, VIP Contract Number, IST/OST Accreditation Number, or Sales Transaction Number.

Blank drafts must be possible without requiring a finalized Customer ID. Separate technical draft identification from official customer identity. Avoid unnecessary consumption of official Customer ID sequences by blank or abandoned drafts unless required by the established official allocator policy.

### 7.8 Section H — Sales and Recommender Details

Fields: SVD, SSM, SM, Referrer, VIP Recommender, Recommender Contact, Recommender Email, Acknowledged At.

Sales Network follows SVD → SSM → SM → OST, with OST able to attach directly to eligible SVD/SSM/SM. Do not create imaginary intermediate managers. Use existing Sales Network member records; reflect applicable actual genealogy; do not allow independently selected contradictory upline relationships; use valid existing IST designations.

**Approved rule: Referrer and VIP Recommender must be the SAME OST member.** Do not model them as independent Sales Network roles. Do not permit one OST as Referrer and a different OST as VIP Recommender for the same registration.

Recommended form behavior: use one searchable dropdown "Referrer / VIP Recommender" sourced from the existing OST directory. After selecting an OST, Referrer and VIP Recommender both reference that OST, Recommender Contact and Recommender Email are populated from that OST's registered contact information, and identity remains consistent. Do not create duplicate OST accounts merely to represent different labels.

An OST recommender is optional for direct IST sales. When an IST–SM personally acquires a customer without OST involvement, the customer may be registered without an OST recommender. Do not invent an OST recommender to complete the form. When a real OST referral exists, select the actual OST and associate it.

Acknowledged At is the recorded acknowledgment information. Do not assume a particular timestamp source, actor, or automatic acknowledgment event without supporting business rules.

### 7.9 Section I — Acquisition Channel

Acquisition Channel dropdown options (exact approved labels):

1. CMP
2. DRP
3. GDP
4. Corporate
5. Walk-In
6. Public Servant
7. Referral
8. FB Ads

GDP appeared twice in the original list; include it only once. Do not create duplicates or silently rename or invent additional channels.

Acquisition Channel and OST Referrer / VIP Recommender are not the same field. The channel describes how the customer was acquired; the recommender identifies the associated OST person, where applicable. Do not create a new Sales Network role from acquisition-channel labels.

### 7.10 Section J — Customer Certification

Two separate certification controls.

Certification 1 — Personal Data Consent, statement: "I certify the information and consent to verification and processing under RA 10173." Provide a checkbox.

Certification 2 — Government ID Receipt, statement: "Valid government ID with specimen signatures received." Provide a separate checkbox.

Both checkboxes are unchecked by default. They must not be automatically checked during data entry or when saving a draft. They represent actual certification, consent, or ID receipt. A government ID receipt acknowledgment must not be recorded as true unless the supporting ID has actually been received. Preserve appropriate records of certification and acknowledgment. Do not infer consent simply from the existence of a customer record.

RA 10173 refers to the Philippine Data Privacy Act of 2012. Document privacy and consent requirements carefully; do not interpret a generic checkbox as automatically satisfying every legal obligation. Preserve the company's need for an appropriate privacy notice, authorized handling, and actual evidence of consent or another lawful basis where applicable. Do not invent detailed legal compliance guarantees.

Not all Customer Creation fields are required. Do not assume both certification fields must be checked for every possible customer workflow. Do not allow false certification. Where certification is applicable to the submission, require valid evidence. Distinguish blank or inapplicable values from a positive certification. If exact mandatory certification conditions are not established by approved policy, document that dependency without fabricating it.

---

## 8. Customer vs. VIP Membership Status

Customer Record and VIP Membership Status are independent.

The customer master record represents the person's persistent identity and registered information. It may exist without an active VIP membership. The customer retains identity across changes in VIP status.

VIP Membership has a separate lifecycle (e.g., No VIP membership yet, Pending, Active, Expired, Cancelled). Do not automatically copy VIP membership status into the customer's primary identity status.

Examples: a newly registered customer with no activated VIP membership retains the customer master record; a person with an existing customer record and pending VIP application remains a customer even if the VIP application does not proceed; an expired or cancelled VIP membership retains the customer master record and customer ID. Do not delete the customer simply because VIP status changes.

---

## 9. Save as Draft

**A customer draft may be saved even when EVERY form field is blank.** This is an explicit approved requirement.

Do not require any field (including Customer name, VIP Plan, Payment Scheme, Mobile, Email, Address, Government ID, ID image, Customer ID, Acquisition Channel, Recommender, Certification checkboxes) in order to save a blank draft.

Authorized Staff and IST may create a new draft, save an empty draft, save a partially completed draft, reopen a previously saved draft, edit draft information, save changes repeatedly, complete missing information later, and submit once applicable validation requirements are met.

Drafts have a clearly identifiable Draft state. A Draft is not automatically a completed customer registration, verified customer identity, finalized VIP application, finalized contract, confirmed sale, Finance-approved payment, or active VIP membership.

Saving a draft must not fail merely because required-for-submission fields have no values. Preserve values actually provided. Do not populate missing personal information with fabricated placeholders (fake mobile numbers, fake emails, artificial birth dates, fictitious ID numbers, dummy addresses, invented recommenders, automatic consent checkmarks). A blank draft remains blank until actual information is supplied.

The system must distinguish and reopen saved drafts, including completely empty drafts. This does not mean it must immediately assign the final official Customer ID to each draft. Separate technical draft identification from official customer identity. Avoid unnecessary consumption of official Customer ID sequences by blank or abandoned drafts unless required by the established official allocator policy.

---

## 10. Submit Registration

Submit is distinct from Save as Draft. When Submit is used:

1. Validate applicable mandatory information.
2. Validate provided field formats.
3. Validate the Customer ID when manually entered.
4. Validate relevant Sales Network and OST references.
5. Check for duplicate Customer IDs.
6. Apply the established customer duplicate-prevention process.
7. Evaluate applicable certification and ID requirements.
8. Return clear validation errors where necessary.
9. Submit the registration only after required conditions pass.

**Not every form field must be completed to submit.** Do not make the entire form mandatory. Fields should be classified as: Required for submission, Optional, Conditionally required, Auto-populated, Derived, System-managed. The business owner approved the complete field inventory but has not explicitly approved an exhaustive per-field mandatory matrix. Do not invent that matrix as finalized policy; document any unresolved required-field criteria as a focused dependency for the later detailed form specification.

If Submit fails validation: preserve the user's entered data, do not discard the draft, explain which applicable requirements remain incomplete or invalid, and do not fabricate information to make the submission pass.

After successful submission: preserve the customer data, record the submitting user and appropriate timestamp, maintain customer identity and registration status, and make the resulting record available according to Customer Management access rules. Do not automatically activate a VIP membership merely because customer registration was submitted.

---

## 11. Internal Customer Search

Use role-based and Sales Network-scoped visibility. Do not implement unrestricted global customer search for every Sales Network user.

- **Authorized Staff:** access follows assigned Customer Management module permissions and other applicable administrative restrictions.
- **IST — Personal customers:** SVD, SSM, and SM may view permitted customer information associated with their own direct sales. Allowed: full customer name, mobile/phone, email, own sales details.
- **IST — Downline customers:** IST managers may view authorized downline sales information. Allowed: full customer name, VIP tier, sale amount, sale date, sale status. Restricted in ordinary downline Sales Network views: customer phone numbers, customer email addresses, complete customer profiles, detailed payment records. An IST manager must not obtain unrestricted customer contact information merely because the customer belongs to a downline salesperson.
- **OST — Personal customers:** OST may view permitted customer records associated with their own sales. Allowed: full customer name, mobile/phone, email, own sales information. OST cannot view customers belonging exclusively to other OST members. OST still cannot create customer records.

Full, unmasked customer names are approved for authorized internal sales views. Do not mask surnames in those views. This does not remove applicable access restrictions on other customer information.

---

## 12. Historical Customer Access After Team Transfers

Sales Network team transfers must not rewrite customer identity.

- An OST member retains permitted access to personally acquired historical customers after moving to another team, including full names, phone numbers, email addresses, and personally recorded sales.
- The previous manager retains authorized historical sales visibility for transactions recorded under that manager's team. Historical sales ownership remains with the original team.
- The new manager may view sales recorded under the new team after the transfer becomes effective. The new manager does not automatically gain access to all historical sales from the member's previous team.
- When an OST becomes IST: preserve personally acquired historical customer access and historical own sales; apply current IST designation permissions for new management responsibilities; restrict downline customer contact information under standard IST downline rules. Do not erase customer relationships simply because IST/OST classification changes.

---

## 13. Customer Search vs. Public VIP Lookup

Internal Customer Search and public VIP member lookup are separate functions. Internal search may show complete records only to appropriately authorized users within permitted scope. Public VIP Lookup must follow separately approved public search requirements and privacy rules. Do not assume unrestricted internal customer search visibility applies to the public website. Do not expose customer contact information, government ID images, sensitive personal information, or complete customer profiles through public lookup without an independently approved business rule.

---

## 14. Duplicate Customer Prevention

Customer creation must avoid creating multiple master records for the same real customer when an existing record should be reused.

- Customer ID uniqueness is mandatory.
- Manual Customer IDs must be validated.
- Existing customers should be identified before creating duplicates.
- A customer may have multiple relevant VIP transactions without creating duplicate customer identities.
- Incomplete drafts are not automatically duplicate confirmed customers.
- Historical purchase records must remain associated with the correct customer.

Do not invent a rigid duplicate-matching algorithm based solely on matching names. Do not silently merge different people. Where a potential duplicate cannot be safely determined, require a documented review or resolution approach during future implementation planning. Do not invent additional business approval workflows without authorization.

---

## 15. Customer Record Access and Privacy

Customer information may include personal and sensitive supporting documents. Require appropriate access controls for identity information, birth date, contact details, permanent address, government identification, certification records, and VIP purchase associations.

Enforce access restrictions at the data/API authorization level in future implementation. Frontend visibility alone is insufficient. Distinguish: permission to access Customer Management; permission to create or modify a customer; whether a particular customer or sale falls within the user's allowed scope; permission to access sensitive attached documents. Do not assume Sales Network genealogy automatically grants access to complete customer master records.

Document the need to preserve accurate customer records, prevent unauthorized disclosure, protect ID images and supporting documents, preserve meaningful changes and audit records, and avoid exposing sensitive data in ordinary sales summaries. Do not invent blanket legal retention periods or deletion rules; defer those specifics to approved company privacy and records-management policies.

---

## 16. Audit History

Document appropriate auditability for significant customer operations: customer registration creation, draft creation, draft updates, customer submission, Customer ID assignment, manual Customer ID entry, customer data corrections, recommender selection or change, customer association changes, significant certification updates.

Preserve, where appropriate: acting user, operation, date and time, previous and new values, relevant customer or draft reference. Do not fabricate certification or consent history. Do not treat historical sales or previously issued official identifiers as disposable draft data.

---

## 17. Business Validation Rules

- Only Authorized Staff and IST (SVD/SSM/SM) may create customer records; OST may not.
- VIP Plan uses G1/S1/B1.
- Payment Scheme references official definitions (do not invent).
- ID Number is optional.
- Province/City/Barangay use dependent reference selections.
- Postal Code derived from location data.
- Acquisition Channel contains the eight unique approved options.
- Referrer and VIP Recommender are the same OST.
- OST recommender is optional for direct IST sales.
- Recommender contact/email linked to selected OST.
- Certification fields not automatically checked.
- Customer identity independent of VIP membership.
- Duplicate Customer IDs rejected.
- Customer access role-based and Sales Network-scoped.

---

## 18. Acceptance Criteria

Given / When / Then style for core workflows:

1. **Authorized Staff registers customers.** Given an authorized Staff user, when they open Customer Creation and submit valid applicable information, then a customer record is created without automatic VIP activation.
2. **IST–SVD registers customers.** Given an IST–SVD, when they submit a valid registration, then customer creation succeeds.
3. **IST–SSM registers customers.** Given an IST–SSM, when they submit a valid registration, then customer creation succeeds.
4. **IST–SM registers customers.** Given an IST–SM, when they submit a valid registration, then customer creation succeeds.
5. **OST cannot register customers.** Given an OST user, when they attempt Customer Creation, then access is denied.
6. **Completely blank draft can be saved.** Given an authorized user with an empty form, when they select Save as Draft, then the draft saves successfully with no invented data.
7. **Partially completed draft can be saved.** Given a partially completed form, when Save as Draft is used, then entered values are preserved and other fields remain incomplete.
8. **Draft can be reopened and edited.** Given a saved draft, when reopened, then it can be edited and resaved.
9. **Submission performs applicable required-field validation.** Given a submission attempt with missing applicable required information, when Submit is used, then validation errors are returned and the draft is preserved.
10. **Optional fields do not automatically block submission.** Given valid applicable required information with optional fields blank, when Submit is used, then submission can succeed.
11. **Customer ID can be generated automatically.** Given a registration without manual ID, when submitted, then the system generates a unique Customer ID per official allocator.
12. **Authorized Staff can manually enter a valid Customer ID.** Given Authorized Staff with a valid manual ID, when submitted, then the ID is accepted.
13. **IST can manually enter a valid Customer ID.** Given an IST with a valid manual ID, when submitted, then the ID is accepted.
14. **Duplicate Customer IDs are rejected.** Given a manual ID already assigned, when submitted, then submission is rejected and entered data preserved.
15. **VIP Plan uses official G1/S1/B1 values.** Given the form, when selecting VIP Plan, then only G1/S1/B1 are available.
16. **Province, City, Barangay use dependent reference selections.** Given location selection, when Province is selected, then only matching cities are shown and then matching barangays.
17. **Postal Code populated from valid location data.** Given an unambiguous location, when selected, then Postal Code auto-populates.
18. **Acquisition Channel contains eight unique approved options.** Given the dropdown, when opened, then exactly CMP, DRP, GDP, Corporate, Walk-In, Public Servant, Referral, FB Ads are present.
19. **Referrer and VIP Recommender cannot reference different OST members.** Given two different OST selections attempted, when submitted, then validation fails.
20. **OST recommender optional for direct IST sales.** Given an IST personally acquiring a customer with no OST, when submitted without recommender, then submission can succeed.
21. **Recommender contact and email populated from selected OST.** Given an OST selection, when selected, then Recommender Contact and Email reflect that OST's registered info.
22. **Certification fields not automatically checked.** Given a new form, when loaded or drafted, then both certification checkboxes are unchecked.
23. **Government ID number remains optional.** Given a registration without ID Number, when submitted, then submission is not blocked solely by missing ID Number.
24. **Customer identity separate from VIP membership.** Given a customer with no active VIP membership, when viewed, then customer record remains retained.
25. **OST can view authorized own customers.** Given an OST, when searching, then they see permitted own-customer records including contact details.
26. **OST cannot access unrelated customers.** Given an OST, when attempting to view another OST's customers, then access is denied.
27. **IST managers have limited downline customer visibility.** Given an IST manager, when viewing downline sales, then customer contact details are restricted.
28. **Authorized internal sales views display unmasked customer names.** Given an authorized view, when displayed, then full customer names are shown unmasked.
29. **Customer access survives valid team transfers.** Given an OST transfer, when completed, then the OST retains access to personally acquired historical customers and historical sales remain with original team.
30. **Customer submission does not automatically confirm a sale or activate VIP membership.** Given a successful customer submission, when completed, then no sale is confirmed and no VIP membership is activated solely from submission.

---

## 19. Cross-Module Dependencies

- **Organization Management:** staff accounts, roles, permissions, authorized access.
- **Sales Network:** IST/OST identities, designations, genealogy, sales associations, visibility.
- **VIP Products and Contracts:** VIP tiers, pricing, payment schemes.
- **Finance:** payment verification, collections, balances.
- **VIP Membership:** membership status and validity.
- **Commissions:** entitlement and payouts (no new commission policies here).

---

## 20. Deferred Business Decisions

- Exact literal Customer ID numbering format (use official allocator; do not invent).
- Full official Payment Scheme enumeration (reference existing).
- Exact mandatory field matrix for Submit.
- Detailed ID verification standards.
- Mandatory certification conditions for every registration scenario.
- Customer record deletion and retention periods.
- Detailed duplicate matching formulas.
- Commission percentages or referral payouts.
- VIP activation requirements.
- Contract cancellation and refund procedures.

---

## 21. Business Validation Rules

See Section 17.

---

## 22. Audit and Privacy

See Section 16.

---

## 23. Customer Search and Access

See Section 11.

---

## 24. Historical Customer Visibility

See Section 12.

---

## 25. Duplicate Prevention

See Section 14.

---

## Completion Report

- **File created/updated:** `docs/business-rules/04-customer-management.md`
- **Approved rules covered:** Registration authority (Staff/IST allowed, OST not); full field inventory; VIP Plan G1/S1/B1; optional ID Number; dependent location dropdowns; RA Number/Customer ID auto or manual; Referrer/VIP Recommender same OST; optional OST recommender for direct IST sales; eight Acquisition Channels; two certifications; blank draft allowed; separate Submit with applicable validation; customer identity independent of VIP membership; role-based/Sales Network-scoped search; unmasked names in authorized views; historical access after transfers; duplicate prevention; audit/privacy; acceptance criteria.
- **Draft and Submit verification:** Blank drafts allowed; Submit separate with applicable validation; incomplete submission preserves draft.
- **Sales Network reconciliation:** Compatible with IST/OST, SVD/SSM/SM, genealogy, historical customer access, and Roles & Permissions.
- **Outstanding dependencies:** Exact Customer ID format, Payment Scheme enumeration, mandatory field matrix, ID verification standards, mandatory certification conditions, deletion/retention periods, duplicate matching formulas, commission policies, VIP activation, contract cancellation/refund.
- **Validation results:** All approved sections included; no actual contradictions found; no invented business policies.
- **File change summary:** Created `docs/business-rules/04-customer-management.md` only. No application implementation, database modification, push, merge, or deployment performed.