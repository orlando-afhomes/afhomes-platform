# 04 · Approved Imports and Launch Readiness

[Production index](README.md) · Previous: [Backend and storage](03-backend-api-and-file-storage.md) · Next: [Deployment and launch](05-deployment-and-launch.md)

## Start when

The [restricted production release](03-backend-api-and-file-storage.md) is ready. Staging approved the import process and the owner authorizes the exact production import sources, scope, and time window. Use the [database guide](../../../development/database.md) and the [staging rehearsal](../02-staging/05-release-rehearsal-and-sign-off.md).

## Tools and steps

1. Confirm the approved input versions, field mappings, identifier ownership, duplicates policy, and expected counts and totals. Process the import with the reviewed application import workflow using an authorized identity.
2. Take the required recovery point. Run the validation or dry run and review rejected rows. Keep production access controlled while loading approved records.
3. Reconcile written counts and exact totals by the agreed dimensions. Preserve official identifiers, historical sale attribution, and audit history. Verify that retries cannot double-count accepted records.
4. Organize release evidence by approved module, import, privacy and security check, and recovery result. Obtain explicit owner sign-off on unresolved exceptions before proceeding.

## Verify

Approved source files, counts, and totals reconcile with imported records and live reports. Any excluded rows are accounted for. The release owner has confirmed the recovery point and all pre-launch checks.
