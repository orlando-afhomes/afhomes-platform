# 02 · Staging

[Roadmap](../README.md) · Previous environment: [Localhost](../01-localhost/README.md) · Next environment: [Production](../03-production/README.md)

Staging is the online test environment. Start with the optional Vercel prototype demo if Boss D wants an early preview. The connected pilot uses the Spark database trial after the local workflow passes. The full hosting and release rehearsal requires separate approval for billing and deployment.

## Work in order

| Step | Guide | Finish before advancing |
| --- | --- | --- |
| 00 | [Vercel prototype demo](00-vercel-prototype-demo.md) | Optional owner-approved preview using browser-memory sample data. |
| 01 | [Project and database trial](01-firebase-project-and-database-trial.md) | The staging database has the tested pilot schema and fake records. |
| 02 | [Staff access and credentials](02-staff-access-and-server-credentials.md) | Test identities and service access are isolated. |
| 03 | [Backend, API, and storage](03-backend-api-and-file-storage.md) | Hosted transactions pass the same checks as the local pilot. |
| 04 | [Hosting and deployment](04-hosting-and-deployment.md) | A production-like build runs on the selected Google host. |
| 05 | [Release rehearsal and sign-off](05-release-rehearsal-and-sign-off.md) | The full approved scope, imports, and recovery are rehearsed. |

The owner approves external project setup, trial provisioning, third-party hosting, billing, and deployments. Staging uses synthetic data. Use a separately approved, sanitized set if an import rehearsal needs source-like records. The test project and accounts stay separate from production.
