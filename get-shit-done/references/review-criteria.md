# Code Review Criteria Reference

## Review Categories

### 1. Correctness
- Logic errors, off-by-one, missing edge cases
- Null/undefined handling in TypeScript (strict null checks)
- Async/await correctness — missing await, unhandled promise rejections
- Type safety — no unsafe casts, proper generics
- State management correctness (React: stale closures, missing deps)

### 2. Security
- Input validation at system boundaries (Zod schemas for API input)
- SQL injection — use Prisma parameterized queries, never raw SQL with interpolation
- XSS — sanitize user content before rendering, use React's built-in escaping
- Command injection — never pass user input to exec/spawn without validation
- Secrets — no tokens, passwords, API keys in code or logs
- CORS/CSRF — proper configuration on API routes
- Authentication — verify auth checks on all protected routes
- Authorization — verify permission checks beyond authentication

### 3. Performance
- Unnecessary re-renders (missing React.memo, useMemo, useCallback where beneficial)
- N+1 queries — use Prisma includes/joins
- Unbounded queries — always paginate or limit
- Memory leaks — clean up event listeners, intervals, subscriptions in useEffect
- Bundle size — avoid importing entire libraries for single functions

### 4. Readability
- Meaningful names — variables, functions, types describe their purpose
- Function length — functions under ~30 lines, extract when complex
- Clear control flow — early returns over nested ifs
- Self-documenting — code explains itself without comments
- Consistent style — matches project patterns

### 5. Maintainability
- Follows project patterns (check CLAUDE.md)
- Proper separation of concerns
- No unnecessary coupling between modules
- Testable design — pure functions, dependency injection
- No dead code or unused imports

### 6. Error Handling
- Errors caught and handled at appropriate boundaries
- User-facing error messages are helpful and actionable
- Server errors logged with context (request ID, user ID)
- No swallowed errors (empty catch blocks)
- Graceful degradation where possible

### 7. Testing
- New source files have co-located test files (same directory)
- Tests cover key behaviors, not implementation details
- AAAA pattern: Arrange, Act, Assert, Annihilate
- Use `test()` not `it()`
- One assertion per test when practical
- No flaky tests (no timing dependencies, random data)

---

## CLAUDE.md Convention Checks

These are automated grep-based checks. If any match, flag as a convention violation.

### TypeScript Conventions
| Check | Pattern | Violation |
|-------|---------|-----------|
| No `any` type | `:\s*any\b`, `<any>`, `as any` | Use explicit types |
| Explicit return types | function without `: ReturnType` | Add return type annotation |
| Interfaces over type aliases | `type X = {` for objects | Use `interface X {` |

### Testing Conventions
| Check | Pattern | Violation |
|-------|---------|-----------|
| Use `test()` not `it()` | `^\s*it(` in test files | Replace with `test()` |
| AAAA pattern | Test without clear sections | Structure as Arrange/Act/Assert/Annihilate |
| Co-located tests | Source file without adjacent `.test.ts` | Add test file |

### Code Quality
| Check | Pattern | Violation |
|-------|---------|-----------|
| No TODOs | `TODO\|FIXME\|XXX\|HACK` | Discuss before adding |
| No sensitive data in logs | `console.log.*password\|token\|secret` | Remove from logs |
| Validate at boundaries | API route without Zod parse | Add input validation |

---

## Security-Sensitive File Patterns

Files matching these patterns trigger `security_review_needed: true`:

```
*auth*
*login*
*session*
*token*
*crypto*
*encrypt*
*decrypt*
*permission*
*rbac*
*acl*
*secret*
*credential*
*password*
*middleware/auth*
*api/auth*
*.env*
*oauth*
*saml*
*jwt*
```

## Severity Classification

- **Critical**: Bugs, security vulnerabilities, data loss risks, breaking changes. Must fix.
- **Improvement**: Convention violations, readability issues, maintainability concerns. Should fix.
- **Minor**: Style preferences, optional optimizations. Nice to fix.
