# 03 · Staging Backend, API, and File Storage

[Staging index](README.md) · Previous: [Staff access](02-staff-access-and-server-credentials.md) · Next: [Hosting and deployment](04-hosting-and-deployment.md)

## Start when

The [local pilot](../01-localhost/04-frontend-and-file-storage.md), staging schema, test identities, and server configuration pass their entry checks. Obtain owner approval for testing against the hosted staging database.

## Tools and steps

1. Run the verified Next.js server locally using a dedicated staging-pilot configuration and the approved staging credentials. It connects to hosted staging Firebase Auth and PostgreSQL through SQL Connect. Keep this configuration separate from the local emulator and mock configurations. If Boss D needs a shared connected preview, use a separately approved Vercel build on an eligible plan. The hosted database proof itself needs no additional app hosting.
2. Walk through customer, contract, receipt approval, and collections. Submit two authorized approvals simultaneously for the same receipt. Separately inject a controlled test failure within the multi-step approval and check the database, audit record, and report before and after.
3. If shared sample-file uploads are required before Blaze, use an approved private Supabase Storage bucket with synthetic files. Apply the AFHomes record check on upload and download. In the paid rehearsal, test the production storage adapter against staging **Cloud Storage for Firebase**. Keep provider credentials server-side and remove temporary demo access through an approved cleanup after the demo.

[SQL Connect transactions](https://firebase.google.com/docs/sql-connect/mutations-guide) · [Cloud Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024) · [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Verify

The approved receipt counts once with one set of financial and audit effects. The forced failure leaves no partial financial or audit changes. A restricted staff account cannot retrieve another record or its file. If a critical transaction cannot guarantee the approved behavior, document the failing case and obtain an architecture decision before expanding financial workflows.
