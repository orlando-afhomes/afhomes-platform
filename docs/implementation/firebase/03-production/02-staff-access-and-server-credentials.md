# 02 · Production Staff Access and Server Credentials

[Production index](README.md) · Previous: [Project and database](01-firebase-project-and-database.md) · Next: [Backend, API, and storage](03-backend-api-and-file-storage.md)

## Start when

The production Firebase project exists and the approved roles, sign-in method, and access owners are recorded. Read the [security guide](../../../development/security.md).

## Tools and steps

1. Configure **Firebase Auth** on the approved production domain. Provision approved staff accounts and link each account to its AFHomes identity. Verify the Super Administrator protections and the normal steps for access approval, role changes, suspension, and removal.
2. Configure the Google runtime service account for the production server. Grant only the required SQL Connect, Auth, and Storage operations. Store additional server secrets in **Secret Manager**. Keep secret values out of configuration files, frontend bundles, audit records, and logs.
3. Confirm production sessions use the approved HTTPS domain and security settings. Verify the server reevaluates staff status and record access even while a session remains active.

[Firebase Auth session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) · [Secret Manager integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets)

## Verify

Check the approved account-to-role mappings, service identity permissions, wrong-project token rejection, and disabled-account behavior in the controlled release environment. Confirm that demo identities and staging credentials cannot access production.
