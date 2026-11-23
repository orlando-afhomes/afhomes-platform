# 05 · Approved Business Modules

[Localhost index](README.md) · Previous: [Frontend and storage](04-frontend-and-file-storage.md) · Next: [Local verification](06-local-verification.md)

## Start when

The pilot works locally. Verify the [hosted pilot results](../02-staging/03-backend-api-and-file-storage.md) before expanding financial workflows. Obtain owner authorization for each module group.

## Implement in dependency order

For each group, make the schema and typed repository changes, implement the server rules and API, connect the existing screen, and finish its tests. Carry audit, privacy, retries, and record access through each group. Use the linked files for the feature acceptance details.

| Order | Group | Existing checklists |
| --- | --- | --- |
| 1 | Organization, staff, roles, public entry, and sign-in | [FP1](../../01-prototype/features/01-organization-and-access.md), [FP2](../../01-prototype/features/02-public-entry-and-sign-in.md) |
| 2 | Sales network and accreditation | [FP3](../../01-prototype/features/03-sales-network-and-accreditation.md) |
| 3 | Customer applications and record access | [FP4](../../01-prototype/features/04-customer-applications.md) |
| 4 | VIP products, contracts, sales, and IGP | [FP5](../../01-prototype/features/05-products-contracts-and-sales.md), [IGP rules](../../../business-rules/14-igp-sales.md) |
| 5 | Payments, adjustments, cancellations, and holds | [FP6](../../01-prototype/features/06-payments-and-verification.md), [FP7](../../01-prototype/features/07-adjustments-cancellations-and-holds.md) |
| 6 | Commissions, allowances, and payouts | [FP8](../../01-prototype/features/08-commissions-and-payouts.md) |
| 7 | Membership, cards, and Stay Points | [FP9](../../01-prototype/features/09-membership-and-cards.md), [FP10](../../01-prototype/features/10-stay-points-and-services.md) |
| 8 | Reporting, audit review, reconciliation, and period close | [FP11](../../01-prototype/features/11-reports-audit-and-close.md) |

Keep the authorized staff Redemption prototype available. Live Redemption, Services, and the Customer Portal have separate approval boundaries. An entry in a prototype checklist does not authorize live use.

## Verify

Record the tests and actual results per group. Verify the next group can rely on the prior group's approved records and contracts. For FP12–FP16 state and browser behavior, use the [feature index](../../README.md) and [verification record](../../01-prototype/ui-states/16-state-verification.md).
