# 05 · Production Deployment and Launch

[Production index](README.md) · Previous: [Approved imports](04-approved-imports-and-readiness.md) · Next: [Maintenance and recovery](06-monitoring-backups-and-recovery.md)

## Start when

All approved modules have passed staging, the restricted production release is verified, migration and import results are signed off, and the owner authorizes opening access. Record the verified host, revision, environment, releases to use for recovery, and who can halt the rollout.

## Tools and steps

1. In Firebase App Hosting or Cloud Run, confirm the restricted release matches the approved revision. Check HTTPS, the approved domain, application health, protected routes, and database readiness.
2. The owner opens that release to the approved users. Verify sign-in, an approved read-only collections check, a permitted private-file read, and the relevant public pages. Verify that bypassing the official domain does not bypass authentication or permissions. Check that audit and service logs arrive as expected.
3. Release all approved modules together. Keep any separately gated functionality within its approved scope. Monitor the first usage and record the launch time, release revision, smoke results, and incidents.
4. If a check fails, pause release or affected writes under the incident plan. The owner decides whether to switch back to the last compatible release or follow the approved recovery procedure.

[App Hosting rollouts](https://firebase.google.com/docs/app-hosting/rollouts) · [Cloud Run rollbacks](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)

## Verify

The approved release is serving the expected production domain, checks pass, and the owner accepts the rollout. Record the actual release and hand it over with the operations guide.
