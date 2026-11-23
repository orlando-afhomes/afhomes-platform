# VIP Application and Contract PDF Automation

## Scope

Give authorized staff fixed-layout, browser-generated sample PDFs for the VIP Privilege Card Application, the tier-specific Reservation Agreements, the formal Grants and their annexes, and a separate Finance payment summary. Staff enter data in the existing workflow and preview, download, or print the resulting PDF. Paper signatures, witnesses, notarization, approvals, and membership activation remain separate actions.

Use sample records in the existing browser-memory prototype. Real customer records, permanent storage, production template release, and deployment need separate approval.

## Document workflow

| Document | Available when | Contents |
| --- | --- | --- |
| VIP Privilege Card Application | The Clerk has completed the application fields needed for submission. | Primary cardholder details, eligible Gold supplementary holder, tier, agreed payment plan, price, sales details, and printed names beside the signing lines. Replace the old summary printout. |
| Reservation Agreement | An accessible purchase has a configured tier, price, and payment schedule. | Use the Bronze, Silver, or Gold form. Include cardholder details, recorded sales team, approved receipts at preparation, and the scheduled payment summary. Show **Pending issuance** until a VIP Number exists. Preserve the printed signature areas. |
| Finance payment summary | A receipt has been approved. | Show the dated list of approved receipts and adjustments, including paid date, method, receipt or bank reference, net approved amount, and balance. Keep it separate from the filed agreement. |
| VIP Grant and applicable annexes | The contract is finalized, numbered, and has a matching Grant template. | Use the same VIP Number, cardholder details, agreed price and schedule, and the template’s signer and witness areas. The first supplied Grant variants are for Standard four-month purchases. Block mismatched variants and show the missing-template reason. |

The VIP Number follows business rule 06. Both the signed Reservation Agreement and approval of the first scheduled payment after the reservation fee are necessary. A finalized purchase enters Membership after verified full payment. Printing does not change any workflow status.

## Implementation

1. Register the supplied PDF revisions and field positions. Use matching forms only. Stamp sample templates on every page. Remove actionable bank-payment details from the application sample. Keep official signing copies unavailable until the owner clears the original wording and exact approved Grant variants. The review must resolve the legacy Reservation No. field, payment deadlines, ambiguous referral labels, and mismatched Grant wording or prices.
2. Project printable fields from the existing customer, contract, sale, and Finance records. Apply existing role and record access. Use scheduled amounts from the contract and approved amounts from the Finance ledger. Use the original currency precision and Asia/Manila dates. For a draft application, use the selected price and validated application fields. Do not invent missing contacts, dates, or signers.
3. Use PDF-LIB with an embedded Unicode font to fill page coordinates without changing the source agreements. Fit values in the allocated fields and report overflow or unsupported characters. Attach an exact payment schedule when installment amounts or due days vary. Leave signing strokes and attestations blank. Preserve page order and page size. Print existing unsigned samples using the browser PDF viewer.
4. Save the prepared application, agreement, and Grant bytes and their field snapshots in the browser session. Allow reprinting the selected prepared version and keep attached signed sample PDFs separate. Link a prepared application to its saved customer and linked agreements to their purchase. Generate each Finance summary from the updated approved ledger. Reset the copies on a full refresh.

## Verification

- Test each tier, Gold with and without a supplementary holder, Standard and Non-Standard purchases, more than one purchase per customer, and missing or mismatched Grant templates.
- Test the workflow from application to signing sample, reservation-only and pending receipts, VIP Number issuance, approved Finance receipts, adjustments, Grant eligibility, and full settlement. Verify regenerated summaries preserve archived agreement bytes.
- Render all seven source variants and the Finance summary. Verify the 8.5 × 13 inch application and agreements, supplied Grant page sizes and annex order, long field errors, accents and peso glyphs, signature space, and that every output visibly says it is a sample.
- Run focused tests, TypeScript, lint, build, and a desktop-browser walkthrough with synthetic data. Verify customer details and signed files cannot carry over to a staff identity without access.
