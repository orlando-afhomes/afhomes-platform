# 01 · Production Project and Database

[Production index](README.md) · Next: [Staff access and credentials](02-staff-access-and-server-credentials.md)

## Start when

The complete staging rehearsal is signed off and the owner authorizes the production project, billing, and database work. Read the [deployment guide](../../../development/deployment.md).

## Tools and steps

1. In Firebase Console, use a company-owned **Blaze** project separate from staging. Confirm authorized owners, approved region, billing account, and budget alerts. Choose the compatible SQL Connect and Cloud SQL location before creating resources.
2. Create the production **SQL Connect / Cloud SQL for PostgreSQL** service. Apply the exact schema migration and connector version exercised in staging. Use a reviewed migration identity and verify the application runtime has only the access it needs.
3. Enable Cloud SQL backups and any separately approved point-in-time recovery before importing records. Record the backup and retention settings that were approved. Verify the rehearsed restore procedure can be followed by the assigned operator.
4. Record project and service identifiers, schema version, backup status, and billing alert recipients. Keep staging seed records and demo credentials out of the production project.

[SQL Connect service and database management](https://firebase.google.com/docs/sql-connect/manage-services-and-databases) · [Cloud SQL backups](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups) · [Google Cloud budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)

## Verify

The schema and connector revision match the staging release. Required constraints and indexes exist, backups are enabled, and project ownership and billing alerts are confirmed. Save evidence without including credentials.
