---
name: gsd:review-plan
description: Run code review on a single plan within a phase. Useful for reviewing changes incrementally during development.
argument-hint: "<phase-number> <plan-number>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# Review Single Plan

Review a single plan's code changes within a phase.

## Process

1. **Parse arguments:**
   - First argument: phase number (e.g., `03`)
   - Second argument: plan number (e.g., `01`)

2. **Load context:**
```bash
PHASE_INFO=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" find-phase "${PHASE_NUMBER}" --raw)
PHASE_DIR=$(echo "$PHASE_INFO" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).directory))")
PLAN_FILE="$PHASE_DIR/${PHASE_NUMBER}-${PLAN_NUMBER}-PLAN.md"
SUMMARY_FILE="$PHASE_DIR/${PHASE_NUMBER}-${PLAN_NUMBER}-SUMMARY.md"
```

3. **Spawn reviewer with single-plan scope:**
```
Task(
  prompt="Review code quality for plan ${PHASE_NUMBER}-${PLAN_NUMBER}.
Phase directory: ${PHASE_DIR}
Plan file: ${PLAN_FILE}
Summary file: ${SUMMARY_FILE}
Review only changes from this specific plan.
Create REVIEW.md scoped to this plan.",
  subagent_type="gsd-code-reviewer"
)
```

4. **Report results** from the reviewer's output.
