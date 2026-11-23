# 05 · Staging Release Rehearsal and Sign-Off

[Staging index](README.md) · Previous: [Hosting and deployment](04-hosting-and-deployment.md) · Next environment: [Production](../03-production/README.md)

## Start when

The selected Google host runs the complete release candidate in staging. Review the [local verification record requirements](../01-localhost/06-local-verification.md) and [testing guide](../../../development/testing.md).

## Rehearse in order

1. Walk through **all approved modules** using representative test roles. Include public accreditation verification, denied actions, failed requests, duplicate requests, private files, and month-close behavior. Compare collections, payouts, and other authoritative reports with the approved source calculations.
2. Rehearse each approved production import on isolated staging data. Validate field mappings and references, record rejected rows, reconcile counts and exact totals, and rerun to prove that nothing is counted twice. Use sanitized source-like data only with separate authorization.
3. Restore an approved Cloud SQL test backup into isolation. Separately recover a sample private Storage object into an isolated test bucket. Verify the restored row counts, identifiers, totals, audit continuity, file reference, and both allowed and denied file access. Rehearse switching back to the prior compatible app release while preserving valid new transactions.
4. Record the release revision, connector version, migration and import evidence, selected host, recovery results, and outstanding risks. Obtain owner sign-off for the complete launch scope. Resolve any policy or legal dependency before enabling the affected live workflow.

## Exit check

Each approved module has actual staging evidence. The import list, totals, and rejection handling are signed off. Backup restoration and app rollback have been demonstrated. Production stays gated until the owner separately approves the launch.
