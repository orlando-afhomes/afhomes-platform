# 02 · Staging Staff Access and Server Credentials

[Staging index](README.md) · Previous: [Database trial](01-firebase-project-and-database-trial.md) · Next: [Backend, API, and storage](03-backend-api-and-file-storage.md)

## Start when

The staging project and database exist, and the owner approves enabling test authentication.

## Tools and steps

1. In Firebase Console, enable the approved sign-in method for staging. Register the approved demo host and callback domains for the chosen sign-in flow. Create synthetic staff identities and map them to representative roles, disabled accounts, and record scopes.
2. Give the backend a dedicated staging service identity with only the permissions needed for the server's Firebase operations. Keep its credentials in protected server-side environment settings. On Google-hosted staging, use the runtime service identity and managed secrets. If a Vercel-hosted pilot requires external credentials, verify the approved credential arrangement before connecting it.
3. Verify staging uses its own Firebase project and storage. Ensure production IDs, secrets, and service identities are absent. Keep SQL Connect business operations unavailable to direct browser clients.

[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) · [SQL Connect access controls](https://firebase.google.com/docs/sql-connect/authorization-and-security)

## Verify

Sign in with allowed, restricted, and disabled test users. Test a wrong-project identity and a role change during an active session. Verify logs, preview bundles, and browser requests expose no server credentials. Record role checks and the identities granted access, without recording credentials.
