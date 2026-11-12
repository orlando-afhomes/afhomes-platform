---
name: update-workflow-atlas
description: Update the Workflow Atlas viewer (the project's workflow memory) after workflow, process or business-rule changes, then sync docs/implementation
argument-hint: "[path to afhomes-viewer folder or its dist/index.html]"
disable-model-invocation: true
---

Read `workflow/update-workflow-atlas.md` and follow it exactly. Atlas path argument: `$ARGUMENTS` (if empty, use the newest `afhomes-viewer` folder under `~/.codex/visualizations/`). Report the detected changes first and wait for the owner's go-ahead before writing anything. No Git writes.
