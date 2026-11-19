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
- Saved at: 2026-11-19 22:19 (supersedes the 2026-11-19 16:31 snapshot).
- Repository: afhomes-platform (remote not re-checked; no fetch run).
- Branch: develop. HEAD: 38a4d73 "docs: update accreditation and stay-point rules, AGENTS clarification protocol" (verified). The owner committed the 16-file sweep during this session; the agent made no Git writes.
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (session metadata; not independently probed).
- Session objective: resolve GATE-1 and GATE-2 with owner rulings; implement the click-only question protocol across harnesses; fix the /verify header; add a shared photo viewer.
- Development phase: frontend prototype on typed in-memory mock data. Backend, real authentication, database and deployment remain deferred.
- Context note: no compaction. The earlier doc 03 plan remains at `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-19-doc-03-valid-until.md`.

## 2. Current Project State
- Verified at save start: `develop` at 38a4d73, nothing staged, 12 tracked files modified, 3 untracked. Two uncommitted UI change sets: the /verify header fix and the shared photo viewer.
- Committed by the owner in 38a4d73: doc 03 public validity sweep; GATE-1 late-bill ruling (doc 09, doc 11, decision log, engine test); GATE-2 allowance table ratification (doc 08, doc 11, decision log); project AGENTS question protocol.
- GATE-1 and GATE-2 are closed. Open business gates: bank wordmark trademark use; protected-operation wording.
- Question rule: click-only; one question or a batch of independent settled questions; recommendation first. Global files: `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.agents/skills/grilling/SKILL.md`, `~/.agents/skills/writing-plans/SKILL.md` (one-click plan approval plus execution method).
- Public header: home and contact keep the transparent hero header; only /verify uses the solid header via `data-page="verify"` on the header.
- Experience photo dialogs (amenities, hotel gallery, location site plan) share `PhotoLightbox`; the room gallery keeps its richer modal.
- Documentation baseline unchanged: 14 business rules, 10 development docs, 19 implementation docs.
- Dev server was running at http://localhost:3000 (background shell from this session; may end when the session closes).

## 3. Important Decisions
- Doc 03: no public validity date for any accreditation type; staff screens keep it (owner, 2026-11-19; committed).
- GATE-1: a tranche not released at its due date is provisional; a late-approved bill dated inside the measurement period releases it on the approval date. It closes for good at expiry or transfer, except by waiver (owner, 2026-11-19; committed).
- GATE-2: doc 08 section 15.4 Table A figures are approved configurable baselines, verified against OPS manual v2.3 section 6.2 and the signed IST SM, SSM and SVD contracts v2.4. SM 1%, SSM 3% and SVD 2% are PB rates, not per-sale commissions (owner, 2026-11-19; committed).
- Questions: click-only; batch the independent settled frontier; one combined writing-plans handoff (Subagent-driven / Native / Request changes).
- Header fix: /verify only. Contact and home headers must not change. `SiteHeaderFrame` renders `data-page="verify"` on the header; the home rules exclude that header.
- Photo viewer: gallery with prev/next, dark cinematic style matching `RoomDetailsDialog`; used by amenities, hotel gallery and location site plan; pointer cursor on amenity and hotel gallery photo cards.
- Only the project owner stages, commits, pushes, merges or deploys.

## 4. Completed Work
- GATE-1: doc 09 glossary and section 19 item 2 narrowed; 2026-11-19 amendment block appended; doc 11 reporting example corrected; decision log entry; `src/modules/stay-points/engine.test.ts` regression test. Committed in 38a4d73.
- GATE-2: doc 11 line 369 rewritten; doc 08 section 15.4 ratification sentence; decision log entry. Committed in 38a4d73.
- Question protocol: global CLAUDE, Codex AGENTS, grilling and writing-plans skills updated; project AGENTS protocol updated. Project file committed in 38a4d73; global files are outside Git.
- /verify header: new `src/shared/components/site/site-header-frame.tsx`; `site-header.tsx` uses it; `site-chrome.css` home rules exclude the verify header; `site-chrome.test.tsx` test. Uncommitted.
- Photo viewer: new `src/panels/public/experience/photo-lightbox.tsx` and `.css`; used by `exp-amenities.tsx`, `exp-hotel-gallery.tsx`, `exp-location.tsx`; `experience-pages.tsx` imports the CSS; `dialog.tsx` gains optional `overlayClassName`; dead `site-lightbox__frame` rule removed; `site-pages.test.tsx` new amenities gallery test. Uncommitted.
- Verification: GATE-1 engine tests 6/6; header site-chrome tests 14/14; photo viewer site-pages tests 17/17; ESLint clean on changed TSX; live browser checks for the header and viewer; `git diff --check` clean apart from LF/CRLF notices.

## 5. Git Working Tree
- Staged: none.
- Unstaged: 12 tracked files.
  - Header set: `src/shared/components/site/site-chrome.css`, `site-chrome.test.tsx`, `site-header.tsx`.
  - Viewer set: `src/panels/public/experience/exp-amenities.css`, `exp-amenities.tsx`, `exp-hotel-gallery.css`, `exp-hotel-gallery.tsx`, `exp-location.tsx`, `src/panels/public/pages/experience-pages.tsx`, `src/panels/public/site-pages.test.tsx`, `src/panels/public/site.css`, `src/shared/ui/dialog.tsx`.
- Untracked: `src/panels/public/experience/photo-lightbox.css`, `photo-lightbox.tsx`, `src/shared/components/site/site-header-frame.tsx`.
- Deleted or renamed: none.
- `workflow/save-session.md` becomes modified after this save; it was committed in 38a4d73 before.
- `stash@{0}` ("local: sales-network cleanup + member detail redesign") remains present.

## 6. Pending Tasks
- Owner review and commit of the two UI change sets (header fix, photo viewer) and this snapshot.
- Remaining owner rulings: bank wordmark trademark use; protected-operation wording (`06:115`, `06:284`, `08:404`, `12:204` vs doc 01).
- Optional: full repository suite, typecheck, production build, visual regression.
- Security follow-up: rotate the local OpenCode service password that appeared in a tool output during this session; the value was not recorded.

## 7. Verification State
- Tests: engine 6/6; site-chrome 14/14; site-pages 17/17 (includes the new amenities gallery test). Full suite not run.
- Lint: ESLint clean on all changed TSX files.
- Typecheck: not run.
- Build: not run.
- Browser QA: /verify header solid and readable; /contact header unchanged (transparent, white); home marker present in SSR, absent on /contact and /verify; photo viewer opened with counter 1/10, ArrowRight to 2/10, site plan title with no arrows, Escape close; card cursor pointer.
- Known limits: the contact footer rule still uses `:has(.site-contact-page)`; full suite and build not run.
- Not performed: full suite, typecheck, build, production visual regression.

## 8. Next Session Instructions
- First action: `/load`; confirm `develop` at 38a4d73, the 12 modified files and 3 untracked files. `workflow/save-session.md` is also modified by this save.
- Inspect `src/shared/components/site/site-header-frame.tsx`, `site-chrome.css` around the home header rules, `photo-lightbox.tsx`, and the three experience components.
- Owner decisions needed: commit the two UI sets; then bank wordmark and protected-operation wording.
- Required approvals: any business-rule edit, any test edit, backend/database/auth/deployment.
- Warnings: keep live Redemption and Services disabled; there is no public customer or card lookup; `src/data/mock/accreditation-renewal.test.ts:118` still has the old "IST hides Valid Until, OST shows it" title; the snapshot is a progress reference, not authority over code or rules.

## 9. Execution Recommendation
- Phase: QA complete; owner review and commit next.
- Current mode: not verified.
- Recommended next mode: owner review/commit; then Plan for the bank wordmark or protected-operation wording.
- Current model: DeepSeek V4.1 Flash 1017 (session metadata; not verified).
- Recommended model: Sonnet 5.5 for the commit review; Opus 5.5 if a rule gate starts.
- Effort: low for review; high for rule arbitration.
- Ultracode: OFF.
- Token optimization: inspect the two change sets separately; load only the cited rule sections when a gate starts.
- Reason: two verified UI sets and two business rulings are ready; the remaining work is owner review and rule arbitration.
<!-- SESSION_SNAPSHOT_END -->
