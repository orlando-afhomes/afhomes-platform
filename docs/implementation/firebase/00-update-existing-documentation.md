# 00 · Documentation and Stack Transition

[Roadmap](README.md) · Next environment: [Localhost](01-localhost/README.md)

## Prerequisites and tools

Use the approved roadmap, [AGENTS.md](../../../AGENTS.md), the existing repository on `develop`, and the owner decisions in the [decision register](../decisions-and-gaps.md). This step uses Markdown and read-only Git inspection. It requires no Firebase account setup or infrastructure.

## Steps

1. Verify the project root, branch, HEAD, remote, and working tree. Preserve existing edits and use the current files as the baseline for changes.
2. Link the environment roadmap from the [root README](../../../README.md), the [feature index](../README.md), and the [technical roadmap](../../development/implementation.md). Keep prototype evidence and FP1–FP16 in their existing locations.
3. Align the active technology directions in [AGENTS.md](../../../AGENTS.md), [CLAUDE.md](../../../CLAUDE.md), the [project context](../../project.md), and the [development guides](../../development/README.md). Update the related operation, security, test, and release instructions together.
4. Move unresolved platform checks to the correct phase. Verify Firebase sign-in and SQL Connect transaction behavior in the pilot. Test the current Next.js build on App Hosting in staging. Keep the paid plan, region, domain, cost, and recovery settings subject to the applicable owner decisions.
5. Label earlier technology decisions and completion reports as historical where retained. Keep the canonical business rules, approved workflows, and the existing no-Git-write policy. The Workflow Atlas is feature evidence and remains part of the roadmap.

## Verify

- Follow every new relative link and compare the order in the phase indexes with the guide filenames.
- Search active documentation for the earlier services and setup terms. Each retained result should have historical context or refer to another project.
- Compare the final changes with the initial working copy. Confirm business-rule files and source code retain their initial contents, and distinguish planned work from work verified in this documentation update.

## Documentation change record

- **Entry points and project rules:** [README](../../../README.md), [AGENTS.md](../../../AGENTS.md), [CLAUDE.md](../../../CLAUDE.md), [project context](../../project.md), and the [implementation index](../README.md).
- **Development guides:** [index](../../development/README.md), [architecture](../../development/architecture.md), [database](../../development/database.md), [backend](../../development/backend.md), [frontend](../../development/frontend.md), [security](../../development/security.md), [testing](../../development/testing.md), [technical roadmap](../../development/implementation.md), [deployment](../../development/deployment.md), and [permission matrix proposal](../../development/role-module-permission-matrix-proposal.md).
- **Feature and decision references:** [decision register](../decisions-and-gaps.md), [public sign-in plan](../prototype/02-public-entry-and-sign-in.md), and [prototype completion plan](../fixes/06-prototype-completion-plan.md).

The new environment guides are planning documents. Local emulator, database, API, hosting, and recovery checks described there remain implementation milestones.
