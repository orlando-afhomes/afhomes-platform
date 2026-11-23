# 03 · API

[Localhost index](README.md) · Previous: [Backend and access](02-backend-authentication-and-permissions.md) · Next: [Frontend and storage](04-frontend-and-file-storage.md)

## Start when

Local authentication, permission checks, and typed server repositories work. Read the [backend guide](../../../development/backend.md) and [finance rules](../../../business-rules/07-finance-and-payments.md).

## Tools and steps

1. Add thin Next.js Route Handlers under `/api/v1` for the pilot customer, contract, receipt approval, and collections operations. Use Zod at the request boundary and existing repository contracts for the shapes exposed to the feature UI.
2. Keep request parsing, authentication, service invocation, and mapping to safe responses in handlers. Keep finance decisions, permission checks, and database work in shared server services and repositories. Return safe validation, permission, conflict, and retry responses without provider internals.
3. Use a transactional SQL Connect operation for receipt approval, linked financial changes, and the audit entry. Enforce a valid state transition with a database constraint or guarded write, with duplicate protection for retried requests. A second request cannot create another approval effect.
4. Define the report from authorized approved receipts and their governed business dates. Use the same approved totals in the browser and in any report export.

## Verify

Call the API directly with good and invalid input, absent or invalid sessions, a restricted record, a repeated approval, and a forced failure. Confirm the response and database state agree. Confirm the approved receipt contributes once to the collections report. Repeat the concurrency and rollback checks on real hosted PostgreSQL in staging.
