# Documentation Templates Reference

## OpenAPI 3.0 Spec Template

```yaml
openapi: "3.0.3"
info:
  title: "{Project Name} API"
  version: "1.0.0"
  description: "{Project description}"
servers:
  - url: "http://localhost:3000"
    description: "Local development"
paths:
  /api/{resource}:
    get:
      summary: "{Description}"
      tags:
        - "{Tag}"
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: "Success"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{Schema}"
        "404":
          description: "Not found"
    post:
      summary: "{Description}"
      tags:
        - "{Tag}"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/{InputSchema}"
      responses:
        "201":
          description: "Created"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{Schema}"
        "400":
          description: "Validation error"
components:
  schemas:
    {Schema}:
      type: object
      properties:
        id:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - id
```

## Architecture Decision Record (ADR) Template

```markdown
# {NNN}. {Title}

**Date:** {YYYY-MM-DD}
**Status:** Proposed | Accepted | Deprecated | Superseded by {ADR-NNN}
**Phase:** {phase_number} — {phase_name}

## Context

{What is the issue that we're seeing that motivates this decision or change?}

## Decision

{What is the change that we're proposing and/or doing?}

## Consequences

### Positive
{What becomes easier or possible as a result of this change?}

### Negative
{What becomes more difficult as a result of this change?}

### Neutral
{What other changes or considerations does this decision introduce?}
```

## Technical Documentation Section Template

```markdown
# {System/Component Name}

## Overview
{Brief description of what this is and why it exists}

## Architecture
{High-level architecture diagram or description}

## Components
### {Component A}
{What it does, where it lives, key interfaces}

### {Component B}
{What it does, where it lives, key interfaces}

## Data Flow
{How data moves through the system}

## Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENV_VAR` | What it does | `value` | Yes/No |

## Changelog
| Date | Phase | Change |
|------|-------|--------|
| YYYY-MM-DD | XX | What changed |
```

## README Section Templates

### Features Section
```markdown
## Features

- **{Feature Name}** — {One-line description}
- **{Feature Name}** — {One-line description}
```

### Getting Started Section
```markdown
## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm
- {Other deps}

### Installation
\`\`\`bash
pnpm install
\`\`\`

### Environment Setup
Copy `.env.example` to `.env` and configure:
\`\`\`bash
cp .env.example .env
\`\`\`

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Postgres connection string | Yes |

### Running Locally
\`\`\`bash
pnpm dev
\`\`\`
```

### API Section
```markdown
## API

Full API documentation: [`docs/openapi.yaml`](docs/openapi.yaml)

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resource` | List resources |
| POST | `/api/resource` | Create resource |
```
