# 06 · Local Verification

[Localhost index](README.md) · Previous: [Business modules](05-approved-business-modules.md) · Next environment: [Staging](../02-staging/README.md)

## Start when

Each approved local module has passed its feature tests. Review the [testing guide](../../../development/testing.md) and [prototype verification record](../../01-prototype/ui-states/16-state-verification.md).

## Run and record

1. Recreate the emulator schema and seed in an isolated test environment. Confirm that its project settings cannot point to staging or production.
2. Run repository, API, and browser tests with the approved test identities. Verify invalid login, restricted record access, session cache isolation, failure recovery, file privacy, and audit history.
3. Confirm customer, contract, official number, approval, reversal, commission, points, and report outputs against the applicable rules. Exercise duplicate submissions, month-close boundaries, and transaction rollback.
4. Run targeted suites first, then `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`. Check the latest prototype evidence for open manual items. These include throttled navigation, a forced browser error and retry, Back on a form with unsaved changes, and visible keyboard focus.
5. Record the revision, environment, commands, actual results, and unresolved items. Forward the checked schema, connector version, and app build details to staging. Keep synthetic business data out of any production import.

## Exit check

All approved local workflows pass with reproducible data. Real hosted concurrency, full hosting compatibility, backup restoration, and production release approval are verified in their own later guides.
