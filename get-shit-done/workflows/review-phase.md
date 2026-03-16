<purpose>
Review code quality for a completed phase. Spawns gsd-code-reviewer to assess all plan changes against engineering standards and CLAUDE.md conventions. Acts as a quality gate — any issues trigger automated rework.
</purpose>

<core_principle>
Code quality is a gate, not a suggestion. The review-rework cycle continues until code passes or the cycle limit is reached. This ensures consistent quality without manual intervention.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load phase context:

```bash
INIT=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `phase_dir`, `phase_number`, `phase_name`.

**Check config toggle:**
```bash
CODE_REVIEW=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.code_review 2>/dev/null || echo "true")
```

If `CODE_REVIEW` is `false`:
```
## Code Review Skipped

`workflow.code_review` is disabled in config. Proceeding without review.
```
→ Exit workflow.
</step>

<step name="collect_phase_context">
Gather information the reviewer needs:

```bash
# Find all SUMMARY files for this phase
SUMMARIES=$(ls "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null)

# Extract plan numbers reviewed
PLANS=$(ls "$PHASE_DIR"/*-PLAN.md 2>/dev/null | sed 's/.*\///' | sed 's/-PLAN.md//')

# Get phase goal
PHASE_GOAL=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "$PHASE_NUM" 2>/dev/null | grep -A1 "goal:" | tail -1)
```
</step>

<step name="spawn_reviewer">
Spawn the code reviewer subagent:

```
Task(
  prompt="Review code quality for phase {phase_number}.
Phase directory: {phase_dir}
Phase goal: {phase_goal}
Plans to review: {plan_list}

Check all changes against:
1. The 7 review categories (correctness, security, performance, readability, maintainability, error handling, testing)
2. CLAUDE.md conventions (project + global)
3. Security gate (auth/crypto/secrets changes)

Create {phase_num}-REVIEW.md in the phase directory.

<files_to_read>
- {phase_dir}/*-PLAN.md
- {phase_dir}/*-SUMMARY.md
- ./CLAUDE.md
- ~/.claude/CLAUDE.md
</files_to_read>",
  subagent_type="gsd-code-reviewer"
)
```
</step>

<step name="route_on_status">
Read review status:

```bash
REVIEW_STATUS=$(grep "^status:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
SECURITY_FLAG=$(grep "^security_review_needed:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
CRITICAL_COUNT=$(grep "^critical_count:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
IMPROVEMENT_COUNT=$(grep "^improvement_count:" "$PHASE_DIR"/*-REVIEW.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

**If security_review_needed is true (always check first):**
```
## 🔒 Security Review Required

Security-sensitive changes detected in phase {X}: {Name}.
Human confirmation required before proceeding.

{Security details from REVIEW.md}

"approved" → continue | "reject" → stop
```
Wait for human response. Do not proceed automatically.

**If status is passed:**
```
## ✓ Phase {X}: {Name} — Code Review Passed

All quality checks passed. Code meets project standards and conventions.
Report: {phase_dir}/{phase_num}-REVIEW.md
```
→ Proceed to verify_phase_goal.

**If status is issues_found:**
→ Enter rework cycle (next step).
</step>

<step name="rework_cycle">
## Code → Review → Rework Loop

```bash
REVIEW_CYCLE=1
MAX_CYCLES=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.review_max_cycles 2>/dev/null || echo "2")
```

**While issues_found and REVIEW_CYCLE <= MAX_CYCLES:**

1. **Present issues:**
```
## ⚠ Phase {X}: {Name} — Review Issues Found (Cycle {N}/{MAX})

**Critical:** {N} | **Improvements:** {N} | **Minor:** {N}
**Report:** {phase_dir}/{phase_num}-REVIEW.md

### Issues to Fix
{Structured issue list from REVIEW.md frontmatter}
```

2. **Generate fix tasks from structured issues:**

For each issue in the REVIEW.md `issues:` frontmatter, create a targeted fix task:
- Group issues by file where possible
- Each fix task references the specific file, line, description, and suggestion
- Fix tasks are small and focused — one logical fix per task

3. **Execute fix tasks:**

Spawn gsd-executor for each fix task (or handle inline for small fixes):
```
Task(
  prompt="Fix code review issue in {file}:{line}.
Issue: {description}
Category: {category}
Suggestion: {suggestion}
Convention: {convention}

Make the minimal change needed to resolve this issue.
Do not refactor beyond what's needed for the fix.",
  subagent_type="gsd-executor"
)
```

4. **Re-review:**

Increment REVIEW_CYCLE. Re-spawn gsd-code-reviewer with updated context:
```
Task(
  prompt="Re-review phase {phase_number} after rework cycle {REVIEW_CYCLE}.
Previous review: {phase_dir}/{phase_num}-REVIEW.md
Focus on previously identified issues — verify they are resolved.
Check for regressions introduced by fixes.
Update REVIEW.md with new status.",
  subagent_type="gsd-code-reviewer"
)
```

5. **Re-read status** and loop.

**If still issues_found after MAX_CYCLES:**
```
## ⚠ Phase {X}: {Name} — Review Issues Remain After {MAX_CYCLES} Rework Cycles

**Report:** {phase_dir}/{phase_num}-REVIEW.md

{Remaining issues summary}

The review cycle limit has been reached. Options:
1. Proceed to verification with known issues (issues logged in REVIEW.md)
2. Manually fix remaining issues and re-run `/gsd:review-phase {X}`

"proceed" → continue to verify | "stop" → halt for manual intervention
```
</step>

</process>
