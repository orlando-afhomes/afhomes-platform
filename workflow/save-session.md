# Save Session — Instructions and Latest Snapshot

Authoritative workflow for `/save`. Part A is permanent. A `/save` run replaces only the text between the two snapshot markers in Part B. Never edit Part A, the markers, or anything outside them.

## Part A — Permanent instructions

`AGENTS.md` governs. Saving is documentation only: it does not authorize implementation. Never run Git write operations (no add, commit, push, pull, merge, checkout, switch, reset, clean, stash, tag).

### Steps

1. Review the conversation context actually available. If the context was compacted or a file was unreadable, say so in the snapshot. Never fabricate missing context.
2. Extract decisions, instructions, requirements, and approvals; completed and ongoing work; pending tasks, unresolved problems, blockers; architecture and business-rule decisions; files created, modified, or removed this session; verification results, errors, and known failures; the recommended next action.
3. Inspect the working tree with read-only commands only:
   ```bash
   git status --short
   git branch --show-current
   git rev-parse --short HEAD
   git diff --stat
   git diff --cached --stat
   git diff --name-status
   git diff --cached --name-status
   git ls-files --others --exclude-standard
   ```
   Read individual diffs only when needed to understand unfinished changes.
4. Record staged, unstaged, and untracked changes separately. Do not assume every change belongs to this session; mark each as this-session, pre-existing, or unknown.
5. Build the snapshot using the structure below.
6. Edit the file so only the text between the SESSION_SNAPSHOT_START and SESSION_SNAPSHOT_END HTML comment markers in Part B changes (the only literal marker lines are in Part B). Replace the previous snapshot; never append a second one. If either marker is missing, stop and report; do not create markers or edit elsewhere.
7. Read the file back. Confirm the markers occur exactly once each, Part A is unchanged, all nine sections are present, and the content is complete. Report "saved" only after this check passes.
8. If the write is denied or fails, keep the previous snapshot, report the failure, and ask for approval or a mode change. Do not bypass permissions.

### Content rules

- Concise but sufficient to resume without losing critical information. Preserve exact identifiers, decisions, and error text where they matter.
- Reference paths instead of copying documentation, source, large diffs, or conversations.
- Exclude secrets, environment values, credentials, tokens, and unnecessary personal data.
- Distinguish verified facts from assumptions. Write "not performed" for checks that were not run.
- Final reply to the user: files and Git state saved, verification of the readback, limitations. Keep it short.

### Snapshot structure

```markdown
# Latest Session Snapshot

## 1. Session Metadata
- Saved at:
- Repository:
- Branch:
- HEAD:
- Session objective:
- Development phase:

## 2. Current Project State
- Verified implementation status
- Relevant modules and architecture
- Current development focus

## 3. Important Decisions
- Approved decisions
- Business-rule decisions
- Architecture decisions
- Restrictions and assumptions

## 4. Completed Work
- Implemented changes
- Relevant files
- Actual verification results

## 5. Git Working Tree
- Staged changes
- Unstaged changes
- Untracked files
- Deleted or renamed files
- Relevant unfinished work

## 6. Pending Tasks
- Remaining implementation
- Open bugs
- Unresolved decisions
- Blockers

## 7. Verification State
- Tests
- Lint
- Typecheck
- Build
- Browser QA
- Known failures
- Checks not performed

## 8. Next Session Instructions
- Recommended first action
- Relevant files to inspect
- Required approvals
- Important warnings

## 9. Execution Recommendation
- Phase
- Recommended next mode
- Recommended model
- Effort
- Ultracode
- Token optimization
- Reason
```

Use the global Execution Recommendation policy for section 9; do not create a separate routing policy.

## Part B — Latest Session Snapshot

<!-- SESSION_SNAPSHOT_START -->
# Latest Session Snapshot

## 1. Session Metadata
- Saved at: 2026-11-12
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: fc060bb "feat: opt routes out of instant navigation and fix commission/payout and stay-point rules" (verified this run). Whether it is pushed was not checked.
- Session objective: (1) explore the Codex-built Workflow Atlas viewer and write a feature-by-feature implementation roadmap in `docs/implementation/`; (2) create the `/update-workflow-atlas` command, which updates the atlas (the project's workflow memory) when workflows, processes or rules change.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. The model changed through `/model` (Opus 5.5 during planning, Sonnet 5.5 for writing). The previous snapshot's login and instant-navigation work is carried forward in sections 2 and 6.

## 2. Current Project State
- Workflow Atlas (outside the repo, not in Git): `C:/Users/SSD-ORLANDO/.codex/visualizations/2026/11/12/01a1cd9b-0453-7c43-bed7-0f196ed66259/afhomes-viewer/dist/index.html`. Version `2026-11-12.1`, baseline `develop @ a0bdcef`, so it is one commit behind. Contents (read from `data/workflows.json`, `data/catalog.mjs`, `COVERAGE.md`): 10 modules, 16 roles, 53 routes, 12 journeys J01 to J12 (four views each), 12 decisions G01 to G12, 13 gaps U01 to U13. Build chain: `node data/build-workflows.mjs`, `npm run build`, `npm test`, `npm run qa`.
- Roadmap: `docs/implementation/` holds `README.md`, `decisions-and-gaps.md` and `phase-01` to `phase-11` files (feature phases FP1 to FP11, 65 feature cards, IDs `F<phase>.<n>`). Phase order follows subphases 4A to 4L of `docs/development/implementation.md`, which was not edited.
- Command: `.claude/skills/update-workflow-atlas/SKILL.md` (wrapper, `disable-model-invocation`) and `workflow/update-workflow-atlas.md` (procedure: resolve atlas, detect changes since the baseline, report and wait for approval, back up, edit, rebuild and verify, sync docs, report). The default atlas path is the newest `afhomes-viewer` under `~/.codex/visualizations/`.
- Earlier state still true: login and mock auth (`src/panels/public/login/`, `src/data/mock/mock-credentials.ts`, `src/shared/providers/mock-session.ts`, `src/panels/admin/components/admin-auth-gate.tsx`), `export const instant = false` in 49 admin files.

## 3. Important Decisions
- Owner decision: the atlas acts as the project's workflow memory, and `/update-workflow-atlas` updates the atlas itself. The atlas path is passed as an argument. Owner chose that the command takes a path argument (not a repo copy).
- Docs are planning only. No feature is authorized by the roadmap; each still needs explicit owner authorization (`AGENTS.md` section 7).
- The atlas is evidence, not authority. Business-rule documents win on conflict. Conflicts are recorded as G items and not resolved.
- Mock login and all `instant = false` lines must be removed when real authentication lands (memory `mock-login-removal.md`). Memory `workflow-atlas.md` records the atlas location and command.
- AGENTS.md Git prohibition applies; the owner performs all commits.

## 4. Completed Work
- Created `docs/implementation/` (13 files) and the command files above.
- Verified with a node script: all 53 routes, all J, G and U IDs appear in the docs; every feature ID cited in `decisions-and-gaps.md` has a card; no broken relative links.
- Verified in code at `fc060bb`: U06 is real (`src/panels/admin/components/payment-actions.tsx` only mentions resubmission in text, while `src/data/mock/payment-repository.ts` supports it); `/verify` and `/register/ost` exist; no Redemption or Services route.
- Not re-checked in code: other AS-IS statuses, which come from the atlas at `a0bdcef`.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged: `workflow/save-session.md` (modified before this session's work began, now replaced by this snapshot).
- Untracked, this session: `.claude/skills/update-workflow-atlas/SKILL.md`, and the 13 files in `docs/implementation/`.
- Ignored by Git: `workflow/update-workflow-atlas.md` was created this session but `.gitignore` line 16 (`/workflow/*`) ignores it. Only `load-session.md` and `save-session.md` are tracked. The owner decides whether to track it (for example with `git add -f`).
- Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" is still kept as a backup.
- Line endings: the working copy mixes CRLF and LF; compare with `git diff --ignore-cr-at-eol`.

## 6. Pending Tasks
- `/update-workflow-atlas` has never been run. The first run should refresh the atlas from `a0bdcef` to `fc060bb` (commission release, payout and stay-point rule changes affect G08 and G10 and journeys J09 and J11). Its atlas steps (resolve, back up, rebuild, browser QA) are untested.
- F6.4 (Returned-receipt resubmit control, U06) is the clearest unblocked frontend feature.
- Tests that failed before this session and were not investigated: `business-pages.test.tsx` ("CTR-4" contract list, and Reservation return with the Customer ID message); `pagination.test.tsx` is stale; `dashboard-page.test.tsx` "derives every Super Admin figure".
- Open owner decisions: G01 to G12 in `docs/implementation/decisions-and-gaps.md`, plus those in `AGENTS.md` section 5. Doc 04 section 7.8 and Customer ID decision D2 are stale.
- Browser QA not done: forgot-password screen, full admin sidebar, member detail page, My Account.
- No blockers.

## 7. Verification State
- Tests: not run this session (documentation only). Earlier failures in section 6.
- Lint: not run. Typecheck: not run. Build: not run. No `src/` change.
- Doc checks: the node script and link check above passed.
- Browser QA: not run this session.
- Checks not performed: the atlas rebuild, its tests and its browser check; statuses re-verified against code beyond the items in section 4.

## 8. Next Session Instructions
- Recommended first action: `/load`, then run `/update-workflow-atlas` to refresh the atlas, or pick one feature card (F6.4 first) for owner authorization.
- Relevant files: `docs/implementation/README.md`, `docs/implementation/decisions-and-gaps.md`, `workflow/update-workflow-atlas.md`, the atlas `data/catalog.mjs`.
- Required approvals: any commit or push (owner only), any feature implementation, atlas edits (the command waits for the owner), AGENTS.md or CLAUDE.md edits, new dependencies, real authentication work.
- Warnings: the atlas is not in Git, so keep its backup step; do not run build and tests together; do not delete `.next`; a full page reload resets mock data; mock credentials must never be shown on the login page.

## 9. Execution Recommendation
- Phase: Plan
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: read journey and route slices from `workflows.json` with one-line node commands, not the whole file; one feature card per task.
- Reason: the next steps are an atlas refresh and one small unblocked feature, both ordinary scoped work.
<!-- SESSION_SNAPSHOT_END -->
