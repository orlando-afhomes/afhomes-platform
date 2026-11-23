# 01 · Staging Project and Database Trial

[Staging index](README.md) · Previous: [Optional prototype demo](00-vercel-prototype-demo.md) · Next: [Staff access and credentials](02-staff-access-and-server-credentials.md)

## Start when

The [localhost pilot](../01-localhost/04-frontend-and-file-storage.md) passes and the owner approves trial provisioning. Start once the app can use the pilot schema, so the testing window is available for real checks.

## Tools and steps

1. In [Firebase Console](https://console.firebase.google.com/), create or select a dedicated staging project with a test-only project ID and authorized owners. Confirm the deployment configuration points to that ID.
2. On Spark, select **SQL Connect → Create new Cloud SQL instance** to start the 90-day trial. Record project ID, location, service name, start date, and expiry date. Confirm current region availability and trial limits before creating resources.
3. Apply the same reviewed schema and connectors used locally. Seed fake staff, customers, contracts, and receipts. Validate links, indexes, constraints, money, and dates in the hosted service.
4. Schedule the decision checkpoint before expiry. Continue with a paid project only after owner approval. If the trial remains on Spark, Google archives the instance after the trial and later deletes it under its trial terms. Keep the schema and seed procedure reproducible locally.

[SQL Connect Spark trial terms](https://firebase.google.com/docs/sql-connect/pricing) · [Managing SQL Connect and PostgreSQL locations](https://firebase.google.com/docs/sql-connect/manage-services-and-databases)

## Verify

Confirm that the hosted schema and connector revision match localhost, sample row counts reconcile, and no production project or real customer data is involved. Record the trial dates and the database checks.
