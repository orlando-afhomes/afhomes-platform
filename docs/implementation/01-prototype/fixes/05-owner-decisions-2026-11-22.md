# 05 Owner Decisions, 2026-11-22

Eight items were listed as "waiting on other people". The company papers in `C:\Users\SSD-ORLANDO\Documents\AFHomes Document\Business Rules` (62 files) were searched first. Where they gave an answer it was used; where they did not, the owner decided and the rule was built into the prototype. Nothing here is left pending.

**Legal caution.** The retention periods, the privacy policy wording and the use of the draft clawback addendum are working rules, not legal advice. They take effect in the prototype now. Legal and the Data Protection Officer should review them before production use.

## What the company papers answered

| Item | Result | Source |
|---|---|---|
| Band above ₱9M | Not found. The band is one digit, 1 to 9, and the JA&D module refuses higher | JA&D numbering guideline Rev 7 §3; JA&D Sales Collections module `SeriesTail` |
| `SUPERSEDED` | Listed as a record status, not defined. The JA&D module marks a replaced record and never reuses it | Rev 7 §6(c) |
| IGP Goodwill / Formal VIP Grant benefits | Not found. Only the document names and signers | Rev 7 §5 |
| IST Clawback Addendum | Found as a draft: five triggers, recovery order, per-payout cap, carry-forward, refund on cure, effective from signing | Draft addendum 2026-09-24 §2, §3, §6; Sales Collections module Rev Q |
| Points per night, holidays, cut-offs | Not found. The Grants give yearly tranches (Bronze 7,000 / 3,000, Silver 14,000 / 6,000, Gold 17,500 / 7,500) and defer the rate to a Terms of Use that is not in the folder | Grant training notes §I; Standard Pricing PDFs |
| Retention schedule | Not found | none |
| Privacy | Annex C Data Privacy Agreement lists the data-subject rights; no retention period, no Data Protection Officer, no public policy | IST and JA&D service contracts |

## Decisions and where they live

| # | Decision | Code | Rule text | Check |
|---|---|---|---|---|
| 1 | Band digit `0` for a TCP above ₱9,000,000; number stays 16 characters | `src/modules/igp/rules.ts` `igpPriceBand` | Doc 14 amendment | `rules.test.ts`; `igp-repository.test.ts` records a ₱10M sale as `A25011000010T12S` |
| 2 | `SUPERSEDED` means `Replaced`; an import row must name its successor | No IGP history import exists yet; rule recorded for when it is built | Doc 14 amendment | Not testable yet |
| 3 | Formal VIP Grant card level by price: ₱1M Bronze B1, ₱2M Silver S1, ₱4M Gold G1; editable; frozen at signing | `igpGrantTier`, `grantTierRulesProblem`, `IgpGrantTierRule`, the `grantTierRules` action, the "VIP Card Levels" dialog on the IGP page | Doc 14 amendment | Unit tests for the picker and validation; repository test for freezing and role limits; page test for the dialog |
| 4 | Clawback offset per IST once the Administrator records the signing date; payouts first, then allowances; capped; carries forward | `planClawbackOffsets`, `clawbackOffsetEligible`, `setClawbackAddendum`, `offsetPayouts`; "Signed Addendum Dates" button in Commission Paybacks | Doc 08 amendment | Planner unit tests; repository tests for cap, carry-forward, unsigned IST, OST and permissions |
| 5 | Starting points table: Standard 1,000 / 1,500, Deluxe 1,500 / 2,000, Villa 2,500 / 3,000; Hotel cut-off 48 h, Resort 72 h; no longer marked sample | `src/modules/redemption/sample-seed.ts` | Doc 10 amendment | `rules.test.ts` (holiday night draws the weekend rate; Bronze tranche covers 7 and 2 nights); redemption repository tests updated |
| 6 | Holiday calendar Nov 2026 to Dec 2027 (Philippine regular holidays and fixed special non-working days) | Same seed file | Doc 10 amendment | Same tests |
| 7 | Ten-year working retention schedule; legal hold pauses disposal | `src/modules/audit/retention.ts` | Doc 12 amendment | `retention.test.ts` |
| 8 | Public Privacy Policy under RA 10173 at `/privacy`, footer link, link from the accreditation check notice | `src/app/(verify)/privacy`, `src/panels/public/pages/privacy-page.tsx`, `src/modules/public-site/content/privacy.ts`, footer `legal.links` | Doc 12 amendment; doc 03 note | Page and footer test in `public-links.test.tsx` |

Canonical text amended with dated blocks: docs 03, 04, 08, 10, 12, 14, `decisions-and-gaps.md`, and `AGENTS.md` section 5.

## Known limits (taken on purpose)

- **Allowance offset** is taken from the first saved review of a member and month. Saving the review again keeps that offset and never deducts twice. If the first review was wrong, correct the payback by direct entry.
- **Where the signing date is edited:** in Commission Paybacks (Administrator only), not on the member page, to keep the change in one reviewable place. A read-only line on the member page can follow if wanted.
- **Records retention** is stated and computed, but nothing is deleted: mock data lives in browser memory only. There is no admin screen for the schedule; it is on the public Privacy Policy page.
- **IGP membership.** The card level is recorded on the sale. Creating a membership record for an IGP buyer is not built and was not part of the ruling.
- **No IGP history import** exists, so decision 2 has no code yet.
- **Points table** values are the owner's working values, not company-issued ones. Publish a dated version when the company issues its own.
