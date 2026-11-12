# Decisions and Gaps

Source: Workflow Atlas `2026-11-12.1` (`develop @ a0bdcef`). Status values are the atlas's own. None of these items is resolved here. Features that depend on an item stay blocked until the owner decides.

Related list: `AGENTS.md` section 5 "Unresolved decisions" covers the same ground from the business-rule side (Gold price, RA numbering, claim versus activation date, module-level permissions, and so on). The two lists overlap and neither replaces the other.

## Decisions (G01 to G12)

| ID | Title | Status | Journeys | Blocks features |
|---|---|---|---|---|
| G01 | Public route discoverability and OST intake | Pending | J01, J02 | F2.1, F3.8 |
| G02 | Accreditation dates, expiry and seller standing | Conflicting | J02, J04 | F3.4 |
| G03 | OST preparation, SM handoff and attribution | Pending | J04, J05, J06 | F4.4, F4.5 |
| G04 | Vacant seat and Acting SM delegation | Unverified | J04, J12 | F3.5, F3.6, F11.5 |
| G05 | Unified VIP number and card validity | Conflicting | J06, J10 | F5.6, F9.2, F9.3 |
| G06 | Receipt matching and verification authority | Pending | J05, J06, J07 | F6.3, F6.4 |
| G07 | Sales milestones and adjustments | Pending | J06, J07, J08 | F5.5, F6.6, F7.5 |
| G08 | Commission release, wait and disbursement | Conflicting | J08, J09 | F8.2, F8.4 |
| G09 | Allowances and signed recovery | Pending | J08, J09, J12 | F7.5, F8.5, F8.6, F11.4 |
| G10 | Contract-specific benefits and points | Pending | J10, J11 | F9.4, F10.3, F10.4 |
| G11 | Reports, Public Customer Lookup and CMS | Pending | J01, J02, J12 | F2.6, F11.6 |
| G12 | IGP, Redemption and Services scope | Pending | J06, J11 | F5.7, F10.5 |

### What each decision asks for

- **G01.** Approve where public links go and what an OST application needs to be submitted. Then add supported discovery paths and real application decision states.
- **G02.** The company workbook rule is that an Expired seller can still sell with a warning, while an effective suspension or departure blocks new sales, and renewal creates a new AA from the actual renewal date (OCT R28, R37 to R40, NUM section 8). The web prototype applies P03 helpers, and different login, verify and sales paths need separate treatment. Resolve the action-specific meaning and the date and alias compatibility.
- **G03.** The documented same-OST rule in P04 section 7.8 differs from the two UI selectors. Compare a separate OST referral lead with a role-scoped customer draft. If a referral lead is approved, keep authorized Staff and IST creation and authorized finalization as they are. DRI mapping is separate.
- **G04.** Model an effective-dated vacancy with no seat earnings and the applicable roll-up (AUG R1, R23, R25, OCT I1 to I4). If an Acting SM is wanted, it needs a named approver, authority, duration, pay treatment, audit trail and handback.
- **G05.** The company numbering guideline uses one VIP number across RA, Grant and Card, and its sections 2 and 6 differ on the trigger wording. The prototype has a separate RA and an activation-based Card ID with activation-based validity. Preserve historical identifiers and signed validity terms. Approve the issuance trigger and namespace before any new real numbers.
- **G06.** Decide what Supervisor and Finance each attest, the required payment per scheme, duplicate scope and which receipts count. Add the correction and resubmit control (U06). Keep human verification. Record the effective Move date and signed templates.
- **G07.** Closed Deal, the 40% stage and 100% settlement are distinct measures. Decide whether to keep all of them, derive them from one verified ledger, and show linked reversals. Confirm period and scope rules. Late admission, default and cure are Director decisions in the workbook.
- **G08.** Approve release policy by product and effective date. Compare the workbook's separate stages (DSC and DRI rates, monthly release) with the platform's release wait. Route a post-initiation adjustment to Finance review without hiding a recorded disbursement. Missing-date payout recording is already blocked in the working copy.
- **G09.** Build calculation review and shadow reconciliation for allowances (BA, PA, PB) only when authorized. Actual offsets or retroactive application need the applicable signed authority.
- **G10.** Preserve signed entitlements. Document prospective Spend-to-Earn. Approve the resort evidence source, cap restoration, refund treatment, rounded amounts and exceptional servicing.
- **G11.** A read-only, scoped Public Customer Lookup only after approved disclosure. The CMS role and publishing model are pending separately. Add period close and history import before replacing the workbook, and reconcile live source totals.
- **G12.** Decide whether the workbook IGP flow is in scope. Keep disabled features labeled and decide their future approval separately.

## Scenario gaps (U01 to U13)

| ID | Title | Status | Journey | Decision | Feature |
|---|---|---|---|---|---|
| U01 | Public OST application submission | Missing | J02 | G01 | F3.8 |
| U02 | Sales sign-in and AA discoverability from Home | Direct entry | J01 | G01 | F2.1 |
| U03 | Account recovery | Missing | J01 | G01 | F2.4 |
| U04 | OST draft and SM finalization handoff | Pending | J05 | G03 | F4.5 |
| U05 | Acting SM delegation | Unverified | J04 | G04 | F3.6 |
| U06 | Returned payment submitter correction | Missing UI | J07 | G06 | F6.4 |
| U07 | Live Finance process and paid commission recovery | Unverified | J09 | G09 | F8.5 |
| U08 | Public Customer Lookup and Customer Portal | Missing | J02 | G11 | F11.6 |
| U09 | CMS | Missing | J01 | G11 | F2.6 |
| U10 | IGP web flow | Missing | J06 | G12 | F5.7 |
| U11 | Redemption and Services | Disabled | J11 | G12 | F10.5 |
| U12 | Durable payroll, period close and historical import | Missing | J12 | G09 | F11.4 |
| U13 | Resort spend intake and card servicing | Unverified | J10 | G10 | F9.4, F10.3 |

U01 to U13 descriptions are in the atlas `COVERAGE.md` section "Incomplete and unverified journeys".

## Known stale or conflicting documents

- Doc 07 amendment item 7 (per-contract Move approval wording) is stale against doc 05 item 12. The atlas shows the conflict and keeps the effective-date and template decision separate (journey J06).
- Doc 04 section 7.8 and Customer ID decision D2 were already flagged as stale in the session snapshot (`workflow/save-session.md`).
- The atlas baseline `a0bdcef` predates `fc060bb`. Commission release, payout recording and stay-point spend rules changed in `fc060bb`, so the AS-IS statements for G08 and G10 need a refresh through `/update-workflow-atlas`.
