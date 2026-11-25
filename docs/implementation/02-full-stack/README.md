# AFHomes Full-Stack Implementation Roadmap

This is the entry point for work from localhost through production. The repository is currently a Next.js prototype with sample data held in browser memory. The target stack below is planned. Each build, database, billing, import, and deployment milestone needs separate owner authorization under [AGENTS.md](../../../AGENTS.md).

## Read in order

| Step | Start here | What it produces |
| --- | --- | --- |
| 00 | [Documentation and stack transition](00-documentation-transition.md) | One consistent set of active project instructions |
| 01 | [Localhost](01-localhost/README.md) | Local database, backend, API, and tested application workflows |
| 02 | [Staging](02-staging/README.md) | An online prototype demo, a hosted PostgreSQL pilot, and a release rehearsal |
| 03 | [Production](03-production/README.md) | Approved imports, one launch for all approved modules, and maintenance instructions |

Two staging checkpoints can happen before every local module is finished. The [prototype preview](02-staging/00-vercel-prototype-demo.md) uses sample data and can run once the owner approves its release. The [hosted database pilot](02-staging/01-firebase-project-and-database-trial.md) begins after the first workflow works locally. Finish local module checks before rehearsing the complete release.

The [delivery plan](delivery-plan.md) holds the detailed steps still to build after the verified localhost pilot, with the rules every step follows, the open owner decisions, and the approvals each step needs. The [full-stack phase plan](full-stack-phase-plan.md) gives the branch model, the seed modes and the phase-by-phase order from the frozen prototype to the no-mock application.

## Tools by environment

| Area | Localhost | Staging | Production |
| --- | --- | --- | --- |
| App and API | Existing Next.js App Router app and Node.js. Zod validation and thin `/api/v1` Route Handlers when authorized. | Same application and API using a test Firebase project. | Same application and API using the company production project. |
| Database | Firebase SQL Connect Emulator with its integrated local database. | SQL Connect and Cloud SQL for PostgreSQL. Start on the Spark trial once the pilot is ready. | SQL Connect and Cloud SQL for PostgreSQL on Blaze. |
| Sign-in and access | Firebase Auth Emulator and synthetic staff identities. | Firebase Auth with test accounts and dedicated server identity. | Firebase Auth with approved staff accounts and dedicated server identity. |
| Files | Firebase Storage Emulator with sample documents. | Private Firebase Storage for the paid rehearsal. Private Supabase Storage is optional for sample uploads if the Spark demo requires them. | Private Cloud Storage for Firebase. |
| Hosting | Local Next.js server. | Vercel for the demo. Rehearse Firebase App Hosting after billing approval. Cloud Run is the fallback in the same Google project. | Firebase App Hosting if it passes staging. Use the verified Cloud Run setup otherwise. |

[Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) · [SQL Connect pricing and trial](https://firebase.google.com/docs/sql-connect/pricing) · [App Hosting support schedule](https://firebase.google.com/docs/app-hosting/frameworks-tooling)

## Authority and evidence

- Use the [business rules](../../business-rules/01-roles-and-permissions.md) and [feature index](../README.md) for what the app must do. Use the [decision register](../decisions-and-gaps.md) to verify open issues. A prototype behavior or a sample value does not approve a production rule.
- Follow the [technical roadmap](../../development/implementation.md) for phase and approval boundaries. The guides here give the execution order within each environment. Existing FP1–FP16 files remain the feature checklists.
- For each task, record its starting revision, environment, approved scope, checks run, actual results, and next approval. Use **Planned**, **Ready**, **Verified**, or **Blocked** so a written procedure cannot be mistaken for a completed setup.
- The owner controls repository writes that stage or publish changes, cloud billing, and deployments. Use separate accounts and data per environment. Keep mock records in browser memory when running the original prototype.
