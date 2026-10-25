# 00 — Graphify + Obsidian Workflow Guide

This file is part of the self-contained Graphify + Obsidian workflow pack. It distributes process guidance for working with a codebase using Graphify (structural index) and an Obsidian vault (curated knowledge). `AGENTS.md` remains the higher authority for repository rules.

## 0. Authority order (read first, applies everywhere)

1. **`AGENTS.md`** (repo root) — authoritative for repository instructions,
   approval gates, security, database invariants, deployment, git policy.
2. **This workflow pack (`workflow/graphidian/*.md`)** — process only.
   **Never overrides, relaxes or contradicts `AGENTS.md`.** If the two
   disagree, `AGENTS.md` wins and you report the conflict instead of picking
   a side.
3. **Repository source + SSOT docs** — actual behaviour. `<migrations-dir>`,
   `<contracts-dir>`, `<app-src-dirs>`, `<api-dir>`, and the specs
   decide what the system does.
4. **Obsidian vault (`<vault-root>`)** — a *navigator*, never an authority. If a vault note
   contradicts the repository, **the repository wins** and you propose a
   correction to the note.
5. **Graphify graph (`<graphify-output>`)** — a *structural index*, not a source of business truth.
   A semantic or inferred edge is never an established rule.

### Standing hard rules (never relaxed, at any stage)

- **Git state is untouchable** unless the user explicitly authorizes it in the
  current session. No `add`, `commit`, `push`, `branch`, `tag`, `stash`,
  `reset`, `checkout`, merge or GitHub action. Read-only git
  (`status`, `log`, `diff`, `rev-parse`, `show`, `ls-files`) is always fine.
- **No approval-gated action without approval:** deploying, running migrations
  against production, triggering remote crons, privileged bootstrap,
  production seed, or altering business rules / architecture / security
  controls / permissions / access rules.
- **Never** persist or echo secrets, credentials, tokens, keys, connection
  strings, or customer PII — not into the vault, not into generated graph
  artifacts, not into reports, not into audits.
- **Never** hand-edit generated graph notes under the `Graphify-Export/`
  directory (wherever the export lives).
- **Never** read the whole generated graph export in bulk.
- **Never** claim a check passed that did not run. "Skipped", "blocked" and
  "not run" are valid, valuable answers.
- **Never** edit the tool configuration directory if it denies edits (for
  example `<opencode-config-dir>` when `permission.edit` is `deny`).
- **User-owned files, leave alone:** `<session-handoff-file>`,
  `<security-docs-dir>`, `<testing-docs-dir>`. Edit them only if the user asks directly.

### How the four things fit together

```
        user instruction
              |
              v
   AGENTS.md  ---------> WHAT is allowed / required  (authority)
   workflow pack -------> HOW to work, in order       (process)
              |
      +--------+---------+
      |                  |
      v                  v
   Graphify            Obsidian vault
   (<graphify-output>) (<vault-root>)
   structure & deps    curated knowledge
   VERIFY in source    VERIFY in repo
```

Use Graphify to *find* the code. Use Obsidian to *recall* the reasoning. Read
the code and `AGENTS.md` to *decide*. The two never decide.

---

## 12. Task-type quick reference

This is the lookup form of the Stage 2 decision rule ("which tools this task
actually needs"). Use Section 2 to decide; use this table to confirm.

| Task | Graphify | Obsidian | Mandatory gates |
|---|---|---|---|
| UI / copy tweak | — | maybe (if a lesson) | `<test-command>` (focused), `<typecheck-command>`, `<lint-command>`, `<build-command>` |
| Feature (handler+contract+screen) | `affected` | business rules, system flows | plan if cross-cutting, full focused suite |
| Bug fix | `explain` on the suspect | known issues, lessons learned | reproduce first, failing-first regression test |
| Database / schema | `path` to the function | data model | **approval gate**, `<db-test-command>`, invariants check |
| Security / permissions / PII | — | security notes | **approval gate always** |
| Release / deploy | — | known issues, handoffs | **explicit deploy approval** |
| Docs / vault update | — | — | approval policy (Stage 9) |

---

## 13. Known limitations of this pack

- Graphify commands were verified against a specific installed CLI version.
  Re-run `graphify --help` if behaviour differs.
- The `Graphify-Export/` note count is intentionally not recorded — it changes
  on every re-export.
- The graph build commit and node/link counts are snapshots; re-measure per
  Stage 8.3 before relying on them.
- Vault note locations reflect the vault as inspected; if a note moves, follow
  the file, not this table.
- Project documentation may be documentation-only with mixed implementation
  status — verify implementation status before citing any documented rule.

---

## Project customization

Fill in these placeholders for the target repository before relying on this pack.
Store the filled values in the project's `AGENTS.md` (or equivalent) and point
this pack at them; do not hard-code project details into the pack.

- `<vault-root>`: location of the Obsidian vault
- `<graphify-output>`: graph output directory, relative to the repository root (commonly `graphify-out/`)
- `<session-handoff-file>`: the project's handoff file, if any (commonly `session.md` at repo root)
- `<security-docs-dir>`, `<testing-docs-dir>`: project documentation directories
- `<contracts-dir>`, `<api-lib-dir>`, `<migrations-dir>`, `<api-handlers-dir>`, `<app-src-dirs>`: project source directories
- `<security-invariants-file>`: project security invariant check, if any
- `<business-rules-docs>`, `<capacity-doc>`, `<migration-applications-doc>`, `<current-schema-doc>`, `<handoff-docs-dir>`: project documentation
- `<test-command>`, `<typecheck-command>`, `<lint-command>`, `<build-command>`, `<env-check-command>`: project verification commands
- `<db-test-command>`, `<db-harness-command>`, `<security-invariants-check>`: database checks, if applicable
- `<admin-workspace>`, `<web-workspace>`, `<api-workspace>` (or equivalent): project workspace names
- `<vault-project-folder>`: the project's folder under `<vault-root>/01-Projects/`
- `<opencode-config-dir>`: tool configuration directory (commonly `.opencode/`)
- `<package-manager>`, `<test-runner>`: the project's package manager and test runner
- `<security-test-command>`: security test command, if any