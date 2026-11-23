# 04 · Frontend and File Storage

[Localhost index](README.md) · Previous: [API](03-api.md) · Next: [Business modules](05-approved-business-modules.md)

## Start when

The pilot API works locally. Use the existing feature screens, TanStack Query, typed repository contracts, and the [frontend guide](../../../development/frontend.md).

## Tools and steps

1. Connect the customer, contract, receipt approval, and collections screens to the HTTP adapters. Preserve loading, empty, error, and retry behavior. Clear or isolate sensitive cached records when the signed-in account changes.
2. Keep the original in-memory prototype available in its approved demo configuration. Its sample records still reset on a browser refresh.
3. Use [Firebase Storage Emulator](https://firebase.google.com/docs/emulator-suite/connect_storage) for sample receipt photos and PDFs. Validate size and type, link each file to its authorized parent record, and test an authenticated download. Keep the file private and keep access tied to the app's record permissions.
4. Walk through the pilot using the existing [customer](../../prototype/04-customer-applications.md), [contracts](../../prototype/05-products-contracts-and-sales.md), and [payments](../../prototype/06-payments-and-verification.md) feature checklists. Exercise approval and reporting using the same seeded receipt.

## Verify

Complete the pilot once through the UI and once through the API. Confirm a browser refresh preserves the integration-mode record and resets the mock-mode record. Confirm records and files cannot be accessed under a different staff account without permission. With owner approval, take the successful local pilot to [staging](../02-staging/01-firebase-project-and-database-trial.md).
