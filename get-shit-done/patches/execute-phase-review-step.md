<step name="gsdpp_code_review">
## Code Review (GSD++ Extension)

**Guard:** Skip if `config.workflow.code_review` is false.

```bash
CODE_REVIEW=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.code_review 2>/dev/null || echo "true")
```

**If CODE_REVIEW is false:** Skip this step, proceed directly to verify_phase_goal.

**If CODE_REVIEW is true:**

### 1. Collect phase context

```bash
SUMMARIES=$(ls "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null)
PLANS=$(ls "$PHASE_DIR"/*-PLAN.md 2>/dev/null | sed 's/.*\///' | sed 's/-PLAN.md//')
```

### 2. Spawn code reviewer

```
Task(
  prompt="Review code quality for phase {phase_number}.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Plans to review: {plan_list}
Check all changes against review criteria and CLAUDE.md conventions.
Create {phase_num}-REVIEW.md.

<files_to_read>
- {phase_dir}/*-PLAN.md
- {phase_dir}/*-SUMMARY.md
- ./CLAUDE.md
- ~/.claude/CLAUDE.md
</files_to_read>",
  subagent_type="gsd-code-reviewer"
)
```

### 3. Read review status

```bash
REVIEW_STATUS=$(grep "^status:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
SECURITY_FLAG=$(grep "^security_review_needed:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

### 4. Security gate (always check first)

If `SECURITY_FLAG` is `true`:
```
## 🔒 Security Review Required

Security-sensitive changes detected in phase {X}: {Name}.
Human confirmation required before proceeding.

{Security details from REVIEW.md}

"approved" → continue | "reject" → stop
```
Wait for human response. Do not proceed automatically.

### 5. Route on status

| Status | Action |
|--------|--------|
| `passed` | Log "Review passed" → continue to verify_phase_goal |
| `issues_found` | Enter rework cycle |

### 6. Rework cycle (if issues_found)

```bash
REVIEW_CYCLE=1
MAX_CYCLES=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.review_max_cycles 2>/dev/null || echo "2")
```

**While `issues_found` and `REVIEW_CYCLE <= MAX_CYCLES`:**

a. Extract structured issues from REVIEW.md frontmatter
b. Generate targeted fix tasks from the issues list (group by file)
c. Execute fix tasks via gsd-executor subagent
d. Increment REVIEW_CYCLE
e. Re-spawn gsd-code-reviewer for re-review
f. Re-read status

**If still `issues_found` after MAX_CYCLES:**

Present remaining issues to user:
```
## ⚠ Review Issues Remain After {MAX_CYCLES} Rework Cycles

{Remaining issues summary}

"proceed" → continue to verify_phase_goal with known issues
"stop" → halt for manual intervention
```

### 7. Commit review artifacts

```bash
node "./.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-${PHASE_NUMBER}): code review ${REVIEW_STATUS}" --files "$PHASE_DIR"/*-REVIEW.md
```
</step>
