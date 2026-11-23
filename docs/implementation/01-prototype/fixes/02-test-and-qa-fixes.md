# 02 Test and QA Fixes

## Test fixes

| ID | Problem | Evidence | Fix |
|---|---|---|---|
| T1 | `src/panels/admin/business-pages.test.tsx`, "completes the office address province-first with the same ZIP rule", timed out at 15 s in the full run | 2026-11-22: file passes alone (103 of 103). The 2026-11-18 report also listed timeouts in `payment-reference-fields` and `staff-page` | Give the slow case an explicit larger timeout (for example `it(..., 30_000)`), or reduce `userEvent` typing with `userEvent.setup({ delay: null })`. Do not change what it asserts |
| T2 | FP16 note says `admin-mobile-nav.test.tsx` drawer "Log out" fails | `admin-mobile-nav.tsx` now renders `LogoutButton`; the 2026-11-22 full run did not fail it | Close the FP16 note |

## Responsive and accessibility fixes

| ID | Problem | Fix |
|---|---|---|
| R1 | The 320 px home page overflows because of `site-feature-card` | Reproduce at 320 px, fix with `min-width: 0` or wrapping in the card CSS, check 375, 768, 1100 and 1280 px |

## Browser checks never done (FP16)

Run in the browser pane, record results in `prototype/16-state-verification.md`:

1. 320 px and 1100 px widths on public, login, portal and admin.
2. Reduced motion (skeletons do not shimmer, spinners do not rotate).
3. No JavaScript (public pages render their content).
4. Throttled navigation (route skeletons appear inside the public layout).
5. Keyboard and focus order, visible focus, dialog focus return, screen-reader labels.
6. Double-click on every mutating button.

## Role walkthroughs pending

| Card | Walkthrough |
|---|---|
| F5.5 Sales milestones | 25/40/100 collection milestones, sale counting at 25%, month close |
| F5.7 IGP | Intake, Series Number, receipts, document checklist (now includes the 2026-11-22 grant tier rules) |
| F9.4 Card servicing | Replacement, transfer and inheritance, entitlement versions |
| F1.5a My Account | Self-service profile and browser QA |
| F3.2 Member detail | Edit, transfer, status, and the new clawback addendum date |
| F4.2 Exit protection | Browser back and forward after leaving a failing step |
| F11.3 | Compare closed-period totals with the official workbook |

Use synthetic data only and one role at a time (Super Administrator, Administrator, Finance, Clerk, SVD, SSM, SM, OST).
