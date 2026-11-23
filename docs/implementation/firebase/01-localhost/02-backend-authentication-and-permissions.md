# 02 · Backend, Authentication, and Permissions

[Localhost index](README.md) · Previous: [Database](01-database-and-emulators.md) · Next: [API](03-api.md)

## Start when

The local schema and fake staff accounts are ready. Read [roles and permissions](../../../business-rules/01-roles-and-permissions.md), [FP1 organization and access](../../prototype/01-organization-and-access.md), and the [security guide](../../../development/security.md).

## Tools and steps

1. Use Firebase Auth Emulator to test sign-in on the existing Next.js app. Implement the server session boundary in accordance with the [Firebase session-cookie guide](https://firebase.google.com/docs/auth/admin/manage-cookies). Protect session creation and sign-out against cross-site requests and reject expired or revoked sessions.
2. Link the verified Firebase user ID to the AFHomes staff account. Use current account status, active roles, and record scope for authorization. A successful sign-in by itself grants no business permissions.
3. Put database access behind typed Next.js server repositories using the Firebase Admin SDK. Mark sensitive SQL Connect operations `NO_ACCESS` for direct clients. Use the app's server policy before calling privileged operations.
4. Build shared services that apply the business rules and own financial transactions. Prepare audit entries with the authorized actor, action, affected record, and event time before enabling sensitive writes.

## Verify

Test an allowed user, unauthorized role, record outside the user's scope, disabled account, changed role during a session, and expired or revoked authentication. Verify direct client calls cannot use privileged database operations and audit payloads exclude credentials and unnecessary personal fields.
