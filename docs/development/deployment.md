# AFHomes Platform — Deployment, Infrastructure, and Production Operations

> This guide defines the target deployment. The current repository is the browser-memory frontend prototype. The [Full-stack implementation roadmap](../implementation/02-full-stack/README.md) gives the approved sequence and verification steps. Provisioning, billing, imports, and deployments each require owner authorization.

## 1. Environment and hosting decisions

| Environment | Application | Identity, database, and files |
| --- | --- | --- |
| Local prototype | Next.js on localhost | Browser-memory mock records and simulated identities, reset on full refresh |
| Local full stack | Same Next.js app and `/api/v1` | Firebase Auth, SQL Connect, and Storage emulators using a dedicated demo project ID |
| Online demo | Owner-approved Vercel preview using an eligible plan | Synthetic records. Keep the mock-only build separate from the connected pilot. |
| Staging | Connected pilot and production-like rehearsal on the approved Google host | Separate Firebase test project. SQL Connect Spark trial first, approved Blaze services later if needed. Private sample files only. |
| Production | Firebase App Hosting if verified in staging, otherwise Cloud Run in the same Google project | Company-owned Blaze project. Firebase Auth, SQL Connect/Cloud SQL for PostgreSQL, private Cloud Storage for Firebase. |

The site and REST API remain one Next.js runtime. The browser may sign in through Firebase Auth. App permissions and protected record access go through the AFHomes server. The runtime uses a dedicated service identity to access SQL Connect and private files. Firebase Console and Google Cloud Console can display the same project. Firebase is the routine dashboard when using App Hosting. Google Cloud Console provides detailed database, recovery, logs, and infrastructure controls.

[Firebase and Google Cloud projects](https://firebase.google.com/docs/projects/learn-more) · [Vercel Fair Use](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)

## 2. Hosting and runtime qualification

1. Compare the lockfile's Next.js version and the proposed Node.js runtime with the current [App Hosting support schedule](https://firebase.google.com/docs/app-hosting/frameworks-tooling). Use a reproducible build from the existing package scripts and lockfile.
2. Verify the exact build on Firebase App Hosting in staging. Exercise routing, server rendering, `/api/v1`, sessions, SQL Connect, private files, static assets, health, and safe errors. Static export cannot serve the full application.
3. If App Hosting fails the compatibility check, document the failure and rehearse the same build on Cloud Run. Verify supported runtime packaging, required assets, its assigned listening port, startup and graceful shutdown, health, and correct runtime identity.
4. Compare the approved region, provider quotas, CPU/memory, concurrency, connection behavior, image handling, request duration, and file sizes against measured staging usage. SQL Connect and its Cloud SQL instance need a compatible shared location. Choose the approved capacity and cost settings before production provisioning.

[App Hosting setup](https://firebase.google.com/docs/app-hosting/get-started) · [Next.js on Cloud Run](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service) · [SQL Connect locations](https://firebase.google.com/docs/sql-connect/manage-services-and-databases)

## 3. Domain, HTTPS, and trust boundaries

Verify domain ownership, correct DNS, HTTPS and certificate renewal for the selected host. Use separate staging and production hostnames and the approved Firebase Auth domain and origin settings. The Admin and public panels share the app with separate route and permission boundaries.

Configure platform networking and ingress so staging is limited to approved testers. Use trusted forwarding information, request-size and timeout behavior verified on the selected host, response security headers, and approved request limits. Prevent caching of authenticated or private responses by shared intermediaries. Keep APIs and database operations that require privileges behind application checks. Review direct access to protected routes and file URLs.

## 4. Deployment configuration and server credentials

- Separate emulator, staging, and production project IDs, SQL Connect service IDs, regions, Auth settings, storage buckets, domain settings, feature flags, and runtime identities. Fail safely on a missing or mismatched configuration.
- Use the approved runtime service identity and Secret Manager for required hosted secrets. Public Firebase client configuration is different from privileged service credentials. Keep private values out of source control, build artifacts, frontend configuration, and logs.
- Verify Firebase Auth sessions and authorization on the deployed host, including cookie behavior, expiry, revocation, disabled accounts, role changes, and direct API calls. Instance restarts and scaling must preserve these checks.
- Keep mock identities restricted to the demo. Production will use the approved service boundaries for Redemption, Services, and any separately authorized modules. Direct API calls must enforce the same restrictions as the UI.

[Cloud Run secret configuration](https://docs.cloud.google.com/run/docs/configuring/services/secrets) · [Firebase Auth server sessions](https://firebase.google.com/docs/auth/admin/manage-cookies) · [Security guide](security.md)

## 5. Schema releases, imports, and storage

Deploy reviewed SQL Connect schema and connector revisions. Check constraints, index changes, and application/schema compatibility with staged records before applying a production change. Keep schema and business-data changes explicit and independently authorized. App deployment must not trigger a destructive migration.

Use approved import paths only. Rehearse validation, duplicate handling, rejection reporting, reconciliation, source-write handling, and cutover. Keep historical identifiers, relationships, and approved totals. Promote the reviewed schema and release artifact across environments. Load production business records only from approved source inputs and preserve the earlier Supabase system outside the automatic rollout path.

Use private Cloud Storage for Firebase for production files with authorized upload/download, type and size checks, metadata, object retention and recovery, and restricted access. Keep file references in PostgreSQL and durable files out of application instance storage. Use the Storage Emulator locally. An approved private Supabase bucket may serve synthetic demo files before Blaze if necessary, and the paid staging rehearsal must verify Firebase Storage before release.

[Database guide](database.md) · [Staging import rehearsal](../implementation/02-full-stack/02-staging/05-release-rehearsal-and-sign-off.md) · [Firebase Storage billing](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

## 6. Release and operations

1. Record the owner-approved scope, source revision, build logs, schema and connector versions, environment, rollback target, and approval trail. Preview and staging deployments must stay isolated from production. CI may run checks in an authorized setup. Release automation may not bypass the owner's production approval.
2. Finish the full staging walkthrough and approved import reconciliation before opening production. Confirm security, business accuracy, backups, restore evidence, health and readiness, HTTPS, authorized configuration, and the correct audit and log destinations.
3. Let the owner publish the approved revision. Confirm the intended domain, public route availability, allowed and denied access, reporting reads, authorized file access, and no credential exposure. Use staging for destructive or financial smoke tests.
4. Monitor availability, startup and health, request latency, errors, sign-in failures, CPU/memory and instance load, SQL Connect and Cloud SQL performance, storage, failed tasks, and backup health. Store service logs with limited access and avoid logging secrets and private documents. AFHomes business audit history supplements platform diagnostics.
5. Assign release, access, billing, backup, and incident owners. Review actual hosted spend, including app hosting, Cloud SQL, SQL Connect activity, file storage and transfer, build artifacts, logs, backups, and domain charges. Set budget alerts. Approve scaling and recovery expectations based on real measurements, not guessed capacity.
6. Schedule jobs only if approved. Document the execution identity, timing, retry behavior, monitoring, and duplicate protection. A restart or retry must not repeat a financial effect or activate deferred services.

[App Hosting releases](https://firebase.google.com/docs/app-hosting/rollouts) · [Cloud Run release controls](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration) · [Production launch guide](../implementation/02-full-stack/03-production/05-deployment-and-launch.md)

## 7. Recovery and maintenance

Maintain a previous compatible app release and the configuration needed to restore service. An app rollback does not undo a schema change or a committed transaction. Check compatibility and recent writes before switching versions. If database recovery is required, restore to an isolated destination, verify counts, balances, official identifiers, history, file references, and app compatibility, then obtain owner approval before cutover.

Protect Cloud SQL backups, private file recovery, configuration, keys, and build artifacts separately. Define recovery objectives, approved retention, restoration authority, and test frequency with the owner. Rehearse restoring both the data and the app in staging before release. On a failed deploy, compromised credential, connectivity issue, or data incident, contain the impact, preserve safe diagnostic evidence, escalate, and reopen only after checks pass. Review dependency and runtime updates in staging.

[Cloud SQL backups](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups) · [Production recovery guide](../implementation/02-full-stack/03-production/06-monitoring-backups-and-recovery.md) · [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)

## 8. Exit criteria and outstanding decisions

Use the [staging sign-off checklist](../implementation/02-full-stack/02-staging/05-release-rehearsal-and-sign-off.md) and the [production index](../implementation/02-full-stack/03-production/README.md). Business modules go live together after sign-off. Keep the domain, final approved location, measured sizing, recurring cost, alert ownership, backup settings, and recovery objectives pending until the responsible people approve them. App Hosting, Cloud Run, cloud provisioning, backup restoration, and deployment remain unverified until tested.

---

## Historical Completion Report

> The report below records the earlier deployment documentation review. Its named stack and section references are historical. The Firebase deployment workflow above is the current plan.

### A. Repository Verification
- Actual repository: `afhomes-platform`; branch: `develop`; initial working tree held untracked docs/workflow files. At the time of writing this was a documentation-only repository; the current repository now contains a frontend prototype.

### B. Deployment Document Updated
- `docs/development/deployment.md` (comprehensively rewritten/expanded).

### C. Production Architecture
DigitalOcean Droplet, Linux, Docker Compose, single Next.js application container, reverse proxy, HTTPS, MongoDB Atlas.

### D. Local Development and Database Strategy
Local MongoDB, Atlas staging, Atlas production, environment separation, migration capability.

### E. Security and Connectivity
Firewalls, SSH, TLS, secrets, Atlas connectivity, internal Docker networking, infrastructure access restrictions.

### F. Deployment and CI/CD
Image build, release artifact, deployment, CI/CD, migration controls, health checks, rollback.

### G. Monitoring and Operations
Logs, monitoring, alerts, operational runbooks, maintenance, capacity planning.

### H. Backup and Recovery
Atlas backups, Droplet recovery, file/media backups, restore validation, disaster recovery, incident response.

### I. Cross-Document Consistency
Aligned with architecture, frontend, database, backend, security, testing, implementation. No material mismatches.

### J. Critical Remaining Decisions
Listed in Section 50.

### K. Validation
Markdown validation, diagram validation, link validation, cross-document consistency, git diff scope performed.

### L. Execution Safety
- Application code modified: No.
- Dockerfile created: No.
- Docker Compose modified: No.
- Droplet provisioned: No.
- Reverse proxy configured: No.
- Domain configured: No.
- Certificate issued: No.
- MongoDB Atlas modified: No.
- Database migrated: No.
- Production records modified: No.
- CI/CD implemented: No.
- Other documentation modified: No.
- Git commit: No.
- Git push: No.
- Git merge: No.
- Deployment: No.
- Redemption live use enabled: No; staff prototype authorized 2026-11-17.
- Services enabled: No.

Historical note: this stop point applied before the frontend prototype. Infrastructure setup, cloud configuration, database migration and deployment still require authorization.