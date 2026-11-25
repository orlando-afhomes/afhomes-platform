# AFHomes Implementation Plan

Index of the implementation records, organized by phase. It does not authorize any work. Per `AGENTS.md` section 7, every phase, milestone and feature still needs explicit project-owner authorization before implementation starts.

## Phases

| Phase | Folder | Status | What it holds |
|---|---|---|---|
| 1 | [`01-prototype/`](01-prototype/README.md) | Built, owner checks remain | Frontend mock prototype: feature phases FP1 to FP16, review fixes and the customer-portal plan. Typed in-memory data only. |
| 2 | [`02-full-stack/`](02-full-stack/README.md) | Planned, not authorized | The real application: Localhost, then Staging, then Production, with numbered steps in each environment. The [delivery plan](02-full-stack/delivery-plan.md) holds the detailed steps still to build; the [full-stack phase plan](02-full-stack/full-stack-phase-plan.md) holds the branch model, seed modes and phase order. |

Shared record: [`decisions-and-gaps.md`](decisions-and-gaps.md), the decision register for all phases.

## Folder rules

1. Top level folders are phases, numbered `NN-name/`. A future phase, such as a customer portal or a mobile app, becomes the next numbered folder only when the owner authorizes it. Do not create empty phase folders in advance.
2. Inside a phase that ships, the folders are environments in release order: `01-localhost/`, `02-staging/`, `03-production/`.
3. Inside an environment, the files are numbered steps by layer (database, backend and access, API, frontend and files, modules, verification). Layers are not top-level folders because every layer repeats in every environment. The design of each layer lives in [`docs/development/`](../development/README.md).
4. Folder names describe the purpose and never a vendor. Vendor names appear only in file content.
5. Every folder has a `README.md` that gives its reading order.

## Source and authority

- Business behavior comes from [`docs/business-rules/`](../business-rules/01-roles-and-permissions.md). A prototype behavior or a sample value does not approve a production rule.
- Technical design comes from [`docs/development/`](../development/README.md). The [technical roadmap](../development/implementation.md) maps technical Phases 0–8 to the [full-stack environment guides](02-full-stack/README.md). It is separate from the feature phases FP1 to FP16, which are recorded under [`01-prototype/`](01-prototype/README.md).
- The Workflow Atlas is evidence, not authority. See [Source and authority](01-prototype/README.md#source-and-authority) for how its cards, journeys and decision items are used.
- Only the owner stages, commits and pushes.
