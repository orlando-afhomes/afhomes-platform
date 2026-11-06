# Load Session — Instructions

Authoritative workflow for `/load`. It holds no saved context; the snapshot lives only in `workflow/save-session.md`.

`/load` is strictly read-only and works in Plan Mode. It must not modify files, start implementation, run migrations, run the full test suite, or perform any Git write operation. `AGENTS.md` governs.

## Steps

1. Read the snapshot between the SESSION_SNAPSHOT_START and SESSION_SNAPSHOT_END HTML comment markers in `workflow/save-session.md`. If the file or markers are missing, or the snapshot says none is saved, report that, give a limited current-state assessment from steps 2 to 4, and do not invent prior context.
2. Read root `CLAUDE.md`. Follow `AGENTS.md` (normally already imported).
3. Verify the repository with read-only Git: `git branch --show-current`, `git rev-parse --short HEAD`, `git status --short`. Use `git diff --stat` or targeted diffs only when needed. Do not assume the tree is clean. Never run `git fetch` or `git pull`.
4. Explore with focused discovery. Start with `package.json`, then only what the snapshot or task points to: relevant `src/app/` routes, `src/panels/`, `src/modules/`, `src/data/`, `src/shared/`, and files named in the snapshot. Use Grep and Glob, then read targeted ranges. Do not read every file. Skip `node_modules/`, `.next/`, build output, lockfiles, and unrelated modules.
5. Identify the applicable business rules and development documents (`docs/business-rules/`, `docs/development/`, paths listed in `CLAUDE.md`) and read only the sections the next action needs.
6. Compare code and Git state with the snapshot. Identify work completed, changed, or invalidated since it was saved, and any changes the snapshot does not account for.
7. Restore the snapshot's decisions and constraints as context.

## Conflicts

The snapshot is a handoff reference, not authority above the current code or the governing business documents. When they disagree: trust current source, consult the authoritative business rules, keep applicable owner-approved decisions, list what changed since the snapshot, and report unresolved contradictions for owner decision. Never overwrite or revert current work based on an outdated snapshot.

## Output

Present concise and actionable text:

**Session Restored**
- Repository and branch (with HEAD)
- Current development phase
- Previous session objective
- Completed work
- Current Git changes
- Pending tasks
- Important decisions
- Known failures or blockers
- Recommended next action
- Execution Recommendation (global format; state the current mode and model only if verified, otherwise "not verified")

State what was verified in this run and what was taken from the snapshot only. Then stop and wait for instructions. Loading does not authorize implementation.
