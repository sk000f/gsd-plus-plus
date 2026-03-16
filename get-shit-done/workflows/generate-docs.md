<purpose>
Generate or update project documentation for a completed phase. Runs after UAT to document what actually shipped, not what was planned.
</purpose>

<core_principle>
Documentation should describe what IS, generated after the code is verified and accepted. This ensures accuracy — you document reality, not intent.
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
GENERATE_DOCS=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.generate_docs 2>/dev/null || echo "true")
```

If `GENERATE_DOCS` is `false`:
```
## Documentation Generation Skipped

`workflow.generate_docs` is disabled in config.
```
→ Exit workflow.
</step>

<step name="check_uat_status">
Verify the phase has passed UAT before generating docs:

```bash
UAT_STATUS=$(grep "^status:" "$PHASE_DIR"/*-UAT.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

If no UAT file exists or status is not `passed`/`approved`:
```
## Warning: Phase has not completed UAT

Documentation should be generated after UAT to ensure accuracy.
Current UAT status: {status or "not found"}

Generate docs anyway? (y/n)
```

Proceed if user confirms, otherwise exit.
</step>

<step name="spawn_doc_generator">
Spawn the documentation generator subagent:

```
Task(
  prompt="Generate documentation for phase {phase_number}.
Phase directory: {phase_dir}
Phase goal: {phase_goal}

Read all phase artifacts and source code, then create or update documentation.
Create {phase_num}-DOCS.md summary in the phase directory.

<files_to_read>
- {phase_dir}/*-PLAN.md
- {phase_dir}/*-SUMMARY.md
- {phase_dir}/*-REVIEW.md
- {phase_dir}/*-VERIFICATION.md
- {phase_dir}/*-UAT.md
- ./CLAUDE.md
- .planning/config.json
</files_to_read>",
  subagent_type="gsd-doc-generator"
)
```
</step>

<step name="commit_docs">
Commit all generated/updated documentation:

```bash
# Collect all modified doc files
DOC_OUTPUT_DIR=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get documentation.output_dir 2>/dev/null || echo "docs")
ADR_DIR=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get documentation.adr_dir 2>/dev/null || echo "docs/adr")

# Stage doc files
git add "$DOC_OUTPUT_DIR"/ 2>/dev/null
git add README.md 2>/dev/null
git add openapi.yaml openapi.json 2>/dev/null
git add "$PHASE_DIR"/*-DOCS.md 2>/dev/null

node "./.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-${PHASE_NUMBER}): generate documentation" --files "$DOC_OUTPUT_DIR" README.md "$PHASE_DIR"/*-DOCS.md
```
</step>

<step name="report">
Present documentation summary:

```
## ✓ Documentation Generated for Phase {X}: {Name}

**Report:** {phase_dir}/{phase_num}-DOCS.md

### Files Updated
{List from DOCS.md frontmatter}

### Summary
{Brief description of what was documented}
```
</step>

</process>
