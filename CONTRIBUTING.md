# Contributing Guidelines

OutreachOS is proprietary software. External contributions are not accepted without prior written authorization from the copyright owner.

## Internal Development Guidelines

### Branch Strategy

- `main` — production-ready code only, protected branch
- `dev` — integration branch, PRs merge here first
- `feature/<name>` — feature branches off `dev`
- `fix/<name>` — bug fix branches
- `release/<version>` — release preparation

### Commit Message Format

```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `security`

### Pull Request Requirements

- All CI checks must pass
- `npm audit` must show 0 high/critical findings
- Test coverage must not drop below 80% for `shared` and `ai` packages
- At least one reviewer approval required
- No `any` types introduced

### Code Quality

- TypeScript strict mode — no exceptions
- All async functions must handle errors
- Use `pino` logger — no `console.log`
- All env vars accessed through `getEnv()` from `@outreachos/shared`
- All sensitive data (cookies, TOTP secrets) must go through the crypto module

### Security Checklist (pre-PR)

- [ ] No hardcoded secrets or credentials
- [ ] New API endpoints have Zod validation
- [ ] New API endpoints enforce `requireAuth`
- [ ] Resource mutations check ownership via `assertOwnership`
- [ ] No new `any` types
- [ ] `npm audit` clean
