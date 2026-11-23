# 04 Document Drift

| ID | Documents | Conflict | Proposed fix |
|---|---|---|---|
| D1 | `prototype/05-products-contracts-and-sales.md` F5.5 versus F6.6, F8.2 and `decisions-and-gaps.md` D-B | F5.5 says the code uses the approval date; the others say the counted receipt date (OCT O3) | Verify in `src/modules/finance/milestones.ts` and correct F5.5 |
| D2 | `prototype/03-sales-network-and-accreditation.md` F3.7 | Says Valid Until shows for OST; the 2026-11-19 ruling shows no validity date publicly for any seller | Correct F3.7 |
| D3 | `prototype/customer-portal-plan.md` | All checkboxes unticked although the routes exist | See `03-mock-feature-gaps.md` G5 |
| D4 | `prototype/16-state-verification.md` | Drawer logout failure listed as open; it passes now | Close the note (see `02-test-and-qa-fixes.md` T2) |
| D5 | `docs/implementation/README.md` | Status refresh is 2026-11-18 at `ff41c1f`; HEAD is `50d6143` | Refresh the status line after the fixes land |
| D6 | `admin-ui-state-audit.md` | Still says "Complete" but a customer portal, offers and experiences admin routes were added after it | Re-run the route count (62 at audit time) |
| D7 | `prototype/` phase files | Stale "documentation-only" and Ant Design wording in older records | Follow AGENTS.md section 2: trust the code and section 8 |
| D8 | Business Rules source folder | The two file registers disagree: JAD register says SUPERSEDED files are kept for reference, the master register says they are deleted | Out of platform scope; note for the owner |
