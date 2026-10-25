## 5. Stage 5 — Implementation

**MANDATORY**

- Follow existing architecture, naming, file placement and patterns. Match the
  surrounding code; do not import a style from elsewhere.
- Smallest change that fully solves the task. No opportunistic refactoring, no
  unrelated cleanup, no scope drift. If you must widen scope, say so first.
- Preserve the security invariants documented in the project's `AGENTS.md`
  (for example: read-only browser roles, identifiers authorize nothing,
  secrets/PII are write-only and never appear in audits, money is exact-decimal
  text, snapshots are never recomputed, privileged functions re-check every
  precondition). Adapt the list to the project's actual invariants.
- Finish the whole slice: handler → contract → screen → **tests** → fixtures →
  callers. A partial slice is a broken slice.
- New dependencies need justification and approval.
- Never weaken an assertion to make a test pass. Never delete a test to get
  green.
- Keep tests green as you go — run the focused suite after each meaningful
  hunk, not once at the end.
- Do not modify generated graph artifacts by hand; do not touch
  `<graphify-output>/` as part of implementation.

**Repository gates (use the target project's documented commands):**

```sh
<test-command>
<typecheck-command>
<lint-command>
<build-command>
<env-check-command>
```

These are placeholders. Verify the exact script names against the project's
`AGENTS.md` / `package.json` rather than assuming a package manager, task
runner, or these names.

Gate on `<typecheck-command>` + `<lint-command>` + tests. Do not reformat files you did not
touch, and never rewrite pre-existing formatting to make a diff look tidy.
Any formatting rules live in `AGENTS.md` → Conventions.

Focused runs (workspace-scoped):

```sh
<package-manager> --filter <workspace> exec <test-runner> run <path>
# run the project's documented focused-test command
```

Workspace names: verify any unfamiliar one with the project's equivalent of
reading `package.json` `name`.

Database (only when SQL or schema changed):

```sh
<db-test-command>
<db-harness-command>
# security invariants: run <security-invariants-check> (empty result = PASS)
# also: <security-test-command> if documented
```

Use the target project's database test and invariant commands if applicable.

Run the project's test and database suites according to its own documentation. Avoid
running expensive suites in parallel unless the project explicitly supports it.

---

## 6. Stage 6 — Testing and verification

In order:

1. Run the **most relevant existing tests** first (focused suite), then widen
   to the root gate when the blast radius justifies it.
2. Run applicable `<typecheck-command>`, `<lint-command>`, `<build-command>`, `<env-check-command>`.
   Run the **DB suites** when SQL changed — a schema that compiles is not a
   schema that works.
3. Add or update **regression tests** for the behaviour you changed. A bug fix
   without a failing-first regression test is incomplete.
4. **Review the full diff** (`git diff`, `git status`): correctness, security,
   unintended files, scope creep, leftover debug code, secrets, accidental
   changes to files you were told not to touch.
5. **Verify the requested behaviour actually works** where the environment
   permits (run the app, exercise the route, run the harness). Code that
   compiles is not behaviour that works.
6. **Report honestly.** List every check that failed, was skipped, or could not
   be executed, and why.

Use these words precisely — never collapse them into "done":

| State | Meaning |
|---|---|
| **Implemented** | code written; nothing proven yet |
| **Tested** | relevant suites run and green |
| **Verified working** | observed correct in the running app / real execution |
| **Blocked / partially verified** | something prevented full proof — say what |

Open items such as a browser visual pass or live authenticated checks should
be reported as unverified rather than assumed.