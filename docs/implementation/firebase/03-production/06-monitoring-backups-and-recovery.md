# 06 · Monitoring, Backups, and Recovery

[Production index](README.md) · Previous: [Deployment and launch](05-deployment-and-launch.md)

## Start when

Before production opens, the owner assigns people to handle releases, access, billing, backups, and incidents. Keep their contact details in the approved operational location.

## Where to work

| Task | Dashboard and action |
| --- | --- |
| Release health and app logs | Use Firebase Console for App Hosting releases and service status. Follow the linked Cloud logs for detailed errors. For Cloud Run, use Google Cloud Console. |
| Staff access and stored files | Use the approved AFHomes Admin screens for staff workflows. Use Firebase Console for Auth and Storage service administration. |
| Database and private-file recovery | Use Google Cloud Console for Cloud SQL backups and controlled restores. Recover private Storage objects separately. Restore both to isolated destinations and verify their links and access before any approved cutover. |
| Usage and billing | Review Blaze usage and Google Cloud Billing alerts. Budget alerts notify the operator and do not stop charges by themselves. |
| Business audit and reconciliation | Review the AFHomes audit history and financial reports. Infrastructure logs supplement the business audit trail. |

[App Hosting logs and metrics](https://firebase.google.com/docs/app-hosting/logging) · [Cloud SQL backups](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups) · [Billing alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)

## Respond to a failed release

1. Identify the release, timeframe, affected modules, and suspect writes. Capture evidence without exposing private data. Escalate to the owner and pause affected writes when needed.
2. Verify whether the previous app revision is compatible with the current schema. Roll it back under owner control or use a reviewed forward fix. A release rollback changes the application revision and does not undo committed database transactions.
3. For suspected data loss or corruption, identify an approved recovery point and restore the affected database records or private objects into isolation using their respective procedures. Check counts, approved totals, official identifiers, links to recovered files, allowed and denied file access, and audit continuity. Reconcile changes after the recovery point before the owner approves cutover.
4. Record what happened, what was verified, and what follow-up is due. Recheck alert recipients, access, backup health, and recovery readiness on the owner's approved schedule.

## Verify

An assigned operator can find the dashboards, interpret an alert, locate the last known-good release and backup, and follow the staged recovery procedure. Use tested evidence for recovery expectations.
