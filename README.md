# GSD++

[![npm version](https://img.shields.io/npm/v/gsd-plus-plus)](https://www.npmjs.com/package/gsd-plus-plus)

Code review and documentation overlay for [GSD (Get Shit Done)](https://github.com/get-shit-done-cc/get-shit-done-cc).

GSD++ extends the GSD lifecycle with two new phases — **code review** and **documentation generation** — without forking or modifying the upstream package. It installs as an overlay on top of your existing GSD installation.

```
discuss → plan → execute → REVIEW → verify-phase → verify-work → GENERATE-DOCS
```

## What it does

**Code Review** — After execution, before verification. Spawns a reviewer agent that checks all phase changes against 7 quality categories and your project's CLAUDE.md conventions. Any issues trigger automatic rework — code is fixed and re-reviewed until it passes or the cycle limit is reached.

**Documentation Generation** — After UAT. Generates and incrementally updates API docs (OpenAPI 3.0), technical system documentation, Architecture Decision Records, and README updates based on what was actually built.

## Installation

Requires [GSD](https://github.com/get-shit-done-cc/get-shit-done-cc) v1.22.0+ installed in your project.

```bash
# Install GSD first (if not already)
npx get-shit-done-cc@latest

# Install GSD++ overlay
npx gsd-plus-plus install
```

GSD++ installs per-project into your `.claude/` directory, matching GSD's own installation pattern. Each project gets its own isolated overlay.

### What gets installed

```
.claude/
├── agents/
│   ├── gsd-code-reviewer.md       # Code review agent
│   └── gsd-doc-generator.md       # Documentation agent
├── commands/gsd/
│   ├── review-phase.md            # /gsd:review-phase [N]
│   ├── review-plan.md             # /gsd:review-plan [phase] [plan]
│   └── generate-docs.md           # /gsd:generate-docs [N]
└── get-shit-done/
    ├── workflows/
    │   ├── review-phase.md        # Review orchestration workflow
    │   └── generate-docs.md       # Documentation workflow
    └── references/
        ├── review-criteria.md     # Review standards
        └── doc-templates.md       # Documentation templates
```

The installer also:
- Patches `execute-phase.md` to inject the review step (with backup)
- Merges config extensions into `.planning/config.json`
- Creates `gsd-pp-manifest.json` to track installed files

## Usage

### Code review

Review runs automatically during `/gsd:execute-phase` when `workflow.code_review` is enabled (default: `true`). You can also trigger it manually:

```
/gsd:review-phase 3        # Review all plans in phase 3
/gsd:review-plan 3 01      # Review a single plan
```

The reviewer checks:
- **Correctness** — logic errors, edge cases, async/await issues
- **Security** — injection, auth gaps, secrets in code
- **Performance** — N+1 queries, memory leaks, unnecessary re-renders
- **Readability** — naming, complexity, control flow
- **Maintainability** — project patterns, coupling, testability
- **Error handling** — swallowed errors, missing boundaries
- **Testing** — coverage, quality, co-located test files

It also enforces your CLAUDE.md conventions automatically — things like TypeScript `any` usage, missing return types, test patterns, and TODO policies.

### Review → rework cycle

When issues are found, GSD++ generates targeted fix tasks from the structured issue list, executes them, and re-reviews. This loops until the code passes or `review_max_cycles` (default: 2) is reached.

```
execute → review → issues found → auto-fix → re-review → passed → verify
```

If issues remain after the cycle limit, you're prompted to proceed with known issues or stop for manual intervention.

### Security gate

Changes touching auth, crypto, permissions, or secrets files are flagged with `security_review_needed: true`. This **always** pauses for human confirmation, regardless of the review status.

### Documentation generation

Run after UAT completes:

```
/gsd:generate-docs 3       # Generate docs for phase 3
```

Generates or incrementally updates:
- **API documentation** — OpenAPI 3.0 spec from route handlers and Zod schemas
- **Technical documentation** — Architecture, data flows, component interactions
- **ADRs** — When a phase involves significant design decisions
- **README** — Feature list, setup, and usage updates

The generator reads existing docs before writing, updating only sections affected by the current phase.

## Configuration

GSD++ adds these config keys to `.planning/config.json`:

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

Set `workflow.code_review` or `workflow.generate_docs` to `false` to disable either feature.

## Updating

GSD++ is designed to survive GSD upstream updates. After updating GSD, re-run the installer to re-apply the overlay:

```bash
npx get-shit-done-cc@latest        # Update GSD
npx gsd-plus-plus install          # Re-apply overlay
```

The installer:
- Detects GSD version changes
- Re-applies the execute-phase patch (idempotent — uses markers to avoid double-patching)
- Warns about locally modified overlay files
- Merges config without overwriting your customizations

Check install status at any time:

```bash
npx gsd-plus-plus status
```

## How it works

GSD++ uses an **overlay pattern** — it adds new files alongside the GSD installation and makes one surgical patch to `execute-phase.md` to inject the review step. The patch is inserted between the execution and verification steps, delimited by `<!-- GSD++ BEGIN/END -->` markers.

All other files are purely additive. The overlay is tracked via `gsd-pp-manifest.json` which records SHA-256 hashes of every installed file, enabling conflict detection on re-install.

## Development

```bash
pnpm install
pnpm build          # Compile TypeScript
pnpm test           # Run tests
```

### Project structure

```
src/
├── bin/install.ts                  # CLI entry point
└── lib/
    ├── detect-gsd.ts               # GSD installation detection
    ├── copy-overlay.ts             # File copy logic
    ├── patch-execute-phase.ts      # Programmatic execute-phase patching
    ├── merge-config.ts             # Config deep-merge (additive only)
    ├── manifest.ts                 # Install tracking and conflict detection
    └── schemas.ts                  # Zod schemas
```

## Requirements

- Node.js >= 20
- [GSD](https://github.com/get-shit-done-cc/get-shit-done-cc) v1.22.0+
- [Claude Code](https://claude.com/claude-code)

## License

MIT
