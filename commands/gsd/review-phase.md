---
name: gsd:review-phase
description: Run code review on a completed phase. Reviews all plan changes against quality standards and CLAUDE.md conventions.
argument-hint: "<phase-number>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

@./.claude/get-shit-done/workflows/review-phase.md
