# Contributing to Pointr

Thank you for your interest! Here's how to contribute.

## Setup

```bash
git clone https://github.com/KananBasha/pointr
cd pointr
pnpm install
pnpm build
pnpm test
```

## Branching

- `main` — production only (protected, no direct push)
- `develop` — integration branch, all PRs target here
- `feature/<name>` — new features
- `fix/<name>` — bug fixes

## Commit Format (Mandatory)

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

type:    feat | fix | docs | chore | test | perf | refactor | build | ci
scope:   plugin | overlay | mcp | packager | demo | docs | ci | release | deps
subject: lowercase, no period at end, ≤72 chars
```

**Examples:**
```
feat(overlay): add toggle mode for persistent element selection
fix(mcp): resolve port conflict auto-discovery on startup  
docs(plugin): add next.js integration guide
test(packager): add fiber-reader edge cases for react 19
```

Commits that don't follow this format will be **rejected** by the pre-commit hook.

## Pull Request Process

1. Branch from `develop`
2. Write tests for your changes
3. Ensure `pnpm test` and `pnpm lint` pass
4. Open a PR against `develop`
5. Fill out the PR template
6. One approval required to merge

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml).

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
