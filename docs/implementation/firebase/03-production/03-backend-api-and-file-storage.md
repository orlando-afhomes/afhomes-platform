# 03 · Production Backend, API, and File Storage

[Production index](README.md) · Previous: [Staff access](02-staff-access-and-server-credentials.md) · Next: [Approved imports and readiness](04-approved-imports-and-readiness.md)

## Start when

The production schema, runtime identity, and approved accounts are ready. Use the build and host configuration verified in [staging](../02-staging/04-hosting-and-deployment.md).

## Tools and steps

1. Wire the server-side SQL Connect connector and `/api/v1` to production settings through Firebase App Hosting or the verified Cloud Run fallback. Use the same authorization, validation, and database transaction code checked in staging.
2. Configure private **Cloud Storage for Firebase**. Tie uploads and downloads to the approved parent record and staff permissions. Enforce size and MIME rules and use the approved access and retention policy. Avoid storing public links to sensitive files.
3. With separate production deployment approval, the owner deploys the checked release under restricted access for authorized operators. Gate access at the application or host so it applies to both the planned production domain and the default service URL. Verify the release keeps demo modes and deferred modules inactive. Hold general staff access until the imports and final sign-off are complete.

[SQL Connect Admin SDK](https://firebase.google.com/docs/sql-connect/admin-sdk) · [Firebase Storage security](https://firebase.google.com/docs/storage/security)

## Verify

Confirm server-only data access, readiness, safe errors, and private-file restrictions. Try both hostnames with an unauthorized account and verify that it cannot reach operational screens or APIs. Record the restricted release revision and confirm authorized operators can reach the approved import workflow. Perform write-side business smoke tests in staging unless separately authorized for a production test.
