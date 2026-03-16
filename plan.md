# GSD++ — Extended Engineering Process

## Context

GSD (Get Shit Done) v1.22.4 is a context engineering layer for Claude Code that orchestrates multi-phase development projects. The current lifecycle is:

```
discuss → plan → execute → verify-phase (automated) → verify-work (UAT)
```

Two gaps exist: **no code review step** and **no documentation generation step**. The goal is to create a personal extended version ("GSD++") that adds these while staying syncable with upstream GSD releases.

You already have a custom `code-reviewer` agent at `~/.claude/agents/code-reviewer.md`. No documentation agent exists yet.

---

## Approach: Overlay Pattern (not a full fork)

**Why overlay, not fork**: GSD installs via `npx get-shit-done-cc@latest` into `~/.claude/`. It's actively maintained with frequent releases. A full fork would diverge quickly and lose the easy update path. Instead:

1. Keep upstream GSD installed normally (updates via `npx get-shit-done-cc@latest`)
2. Maintain a **GSD++ repo** containing only your additions + one surgical patch to `execute-phase.md`
3. GSD++ has its own installer that layers files on top of the GSD installation
4. A manifest tracks which files are yours vs upstream, detecting conflicts on update

**Update workflow:**
```bash
npx get-shit-done-cc@latest        # Update upstream GSD
npx gsd-plus-plus install           # Re-apply overlay (detects conflicts)
```

The only upstream file modified is `execute-phase.md` (to inject the review step). All other GSD++ files are purely additive — new agents, commands, workflows, and references that don't touch upstream files.

---

## Extended Lifecycle

```
discuss → plan → execute → REVIEW → verify-phase → verify-work (UAT) → GENERATE-DOCS
```

- **Review** sits after execute, before verify. The verifier checks *goal achievement*; the reviewer checks *code quality*. Complementary but distinct.
- **Docs** sits after UAT. Documentation should describe what actually shipped, not what was planned.

---

## Repository Structure

```
gsd-plus-plus/
├── package.json                         # npm package for npx installation
├── bin/
│   └── install.js                       # Overlay installer
├── agents/
│   ├── gsd-code-reviewer.md             # Adapted from existing code-reviewer.md
│   └── gsd-doc-generator.md             # New documentation agent
├── commands/gsd/
│   ├── review-phase.md                  # /gsd:review-phase [N]
│   ├── review-plan.md                   # /gsd:review-plan [phase] [plan]
│   └── generate-docs.md                 # /gsd:generate-docs [N]
├── get-shit-done/
│   ├── workflows/
│   │   ├── review-phase.md              # Review workflow definition
│   │   └── generate-docs.md             # Documentation workflow definition
│   ├── references/
│   │   ├── review-criteria.md           # Review standards reference
│   │   └── doc-templates.md             # Documentation templates reference
│   └── patches/
│       └── execute-phase.patch          # Injects review step into execute workflow
├── config-extensions.json               # New config keys to merge
├── gsd-pp-manifest.json                 # Tracks overlay files + upstream version
├── VERSION
└── README.md
```

**Installation target: Global (`~/.claude/`)**
- `agents/` → `~/.claude/agents/`
- `commands/gsd/` → `~/.claude/commands/gsd/`
- `get-shit-done/` → `~/.claude/get-shit-done/`

---

## Component Details

### 1. `gsd-code-reviewer` Agent

Adapts your existing `code-reviewer.md` to the GSD subagent contract:

- **Input**: Receives file paths (PLAN.md, SUMMARY.md, config.json, CLAUDE.md) via `<files_to_read>` block
- **Process**: `git diff` on the phase's commit range, applies your 7 review categories (correctness, security, performance, readability, maintainability, error handling, testing)
- **CLAUDE.md enforcement**: Automatically flags violations of your global conventions (use of `any`, missing return types, `it()` instead of `test()`, missing AAAA pattern, TODOs without discussion)
- **Output**: `{phase_num}-REVIEW.md` with YAML frontmatter:
  ```yaml
  status: passed | issues_found | blocking_issues
  critical_count: 0
  improvement_count: 2
  security_review_needed: false
  plans_reviewed: ["03-01", "03-02"]
  ```
- **Routing**:
  - `passed` → proceed to verify-phase
  - `issues_found` → log to STATE.md, proceed (surfaced in UAT)
  - `blocking_issues` → generate fix-plans, re-execute, re-review (max 2 cycles)
  - `security_review_needed: true` → pause for human confirmation regardless of status

### 2. `gsd-doc-generator` Agent

Generates/updates technical documentation from phase artifacts:

- **Input**: PLAN.md, SUMMARY.md, REVIEW.md, VERIFICATION.md, UAT.md, actual source files
- **Doc types** (configurable):
  - **API documentation** — Swagger/OpenAPI 3.0 spec generation from route handlers, endpoint definitions, and Zod schemas. Outputs/updates an `openapi.yaml` or `openapi.json` in the docs directory.
  - **Technical system documentation** — How the system works: architecture overview, data flows, component interactions, deployment topology. Maintained incrementally as the system evolves (each phase updates rather than regenerates).
  - **Architecture Decision Records (ADRs)** — Created when a phase involves significant design choices (new dependencies, pattern changes, infrastructure decisions). Follows the standard ADR template (context, decision, consequences).
  - **README updates** — Keeps project README current with new features, setup changes, and usage instructions.
- **Incremental maintenance**: The agent reads existing docs before generating, updating only the sections affected by the current phase rather than regenerating everything. This keeps docs accurate as the system evolves.
- **Output**: `{phase_num}-DOCS.md` (summary of doc changes made) + direct updates to project doc files (`docs/`, `openapi.yaml`, `README.md`, `docs/adr/`)

### 3. Execute-Phase Patch

Single insertion into `execute-phase.md` between execution completion and verify-phase spawning:

```
## Code Review (GSD++ Extension)
IF config.workflow.code_review is true:
  1. Collect commit hashes from phase SUMMARY files
  2. Spawn gsd-code-reviewer with phase context
  3. Wait for REVIEW.md
  4. Route based on status (passed/issues_found/blocking_issues)
```

Guarded by `workflow.code_review` config toggle — no-op when disabled. Delimited with `## GSD++` markers for easy identification and re-patching.

### 4. Config Extensions

Merged into `.planning/config.json`:

```json
{
  "workflow": {
    "code_review": true,
    "generate_docs": true,
    "review_max_cycles": 2
  },
  "review": {
    "block_on_critical": true,
    "enforce_claude_md": true
  },
  "documentation": {
    "output_dir": "docs",
    "api_spec_format": "yaml",
    "adr_dir": "docs/adr",
    "auto_update_readme": true,
    "doc_types": ["api", "technical", "adr", "readme"]
  }
}
```

### 5. Overlay Installer (`bin/install.js`)

Node.js script that:
1. Detects GSD installation (checks for `VERSION` file)
2. Verifies GSD version compatibility (minimum v1.22.0)
3. Copies new files (agents, commands, workflows, references)
4. Applies execute-phase patch (with backup, checks for markers to avoid double-apply)
5. Creates `gsd-pp-manifest.json` tracking all overlay files + upstream version
6. On re-install: detects upstream version changes, warns about patch conflicts

---

## Additional Engineering Process Improvements

Beyond review and docs, these additions would strengthen the process:

1. **Convention enforcement in the reviewer** — Your CLAUDE.md rules become automated blocking checks (TypeScript `any`, missing return types, `it()` vs `test()`, AAAA test pattern, TODOs)
2. **Security gate** — Any changes touching auth/crypto/permissions/secrets get `security_review_needed: true`, pausing for human confirmation
3. **Test coverage check** — Reviewer verifies new source files have co-located test files, and tests increased proportionally to code
4. **Conventional commit audit** — Reviewer verifies all phase commits follow conventional format
5. **CLAUDE.md as a review checklist** — The reviewer reads your global and project CLAUDE.md files and uses them as additional review criteria, so your conventions are enforced at the GSD level too

Your global CLAUDE.md already captures most of the engineering philosophy (TDD, security, code preferences). GSD++ makes that _enforceable_ by having the reviewer check for violations rather than relying on the executor to remember them.

---

## Implementation Sequence

1. Create `gsd-plus-plus` repo with package.json scaffold
2. Build the overlay installer (`bin/install.js`)
3. Create `gsd-code-reviewer.md` agent (adapt from existing `code-reviewer.md`)
4. Create `review-phase.md` workflow + commands
5. Create the `execute-phase.patch` (surgical review step insertion)
6. Create `gsd-doc-generator.md` agent
7. Create `generate-docs.md` workflow + commands
8. Create config extensions + merge logic
9. Test full lifecycle: install GSD → install GSD++ overlay → run a phase → verify review triggers → verify docs generate
10. Test upstream update: run GSD update → re-run GSD++ installer → verify overlay survives

---

## Critical Files

| File | Purpose |
|------|---------|
| `~/.claude/agents/code-reviewer.md` | Existing agent to adapt for GSD subagent contract |
| `~/.claude/get-shit-done/workflows/execute-phase.md` | Upstream file needing surgical patch |
| `~/.claude/agents/gsd-verifier.md` | Pattern to follow for agent contract (input/output/routing) |
| `~/.claude/get-shit-done/workflows/verify-phase.md` | Output format patterns to mirror |
| `.planning/config.json` | Per-project config to extend with review/docs toggles |

---

## Verification

- [ ] `npx gsd-plus-plus install` succeeds on fresh GSD installation
- [ ] `/gsd:review-phase` command is available and triggers review
- [ ] `/gsd:generate-docs` command is available and generates docs
- [ ] Execute-phase automatically triggers review when `workflow.code_review: true`
- [ ] Execute-phase skips review when `workflow.code_review: false`
- [ ] Review with blocking issues generates fix-plans and re-executes
- [ ] Security-flagged changes pause for human confirmation
- [ ] `npx get-shit-done-cc@latest` followed by `npx gsd-plus-plus install` preserves overlay
- [ ] Config extensions merge without overwriting existing project config
