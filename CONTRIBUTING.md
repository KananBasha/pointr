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

## Publishing to npm

Pointr uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

### Prerequisites
- `NPM_TOKEN` secret must be set in [GitHub Settings → Secrets](https://github.com/KananBasha/pointr/settings/secrets/actions)
- You must be a member of the `@pointr` npm organization

### Release workflow

1. **Create a changeset** (describes what changed and the version bump type):
   ```bash
   pnpm changeset
   # Follow the prompts: select packages, choose patch/minor/major, describe changes
   git add .changeset/
   git commit -m "chore(changeset): describe changes"
   git push
   ```

2. **The Release workflow automatically creates a "Version Packages" PR** on GitHub.

3. **Merge the PR** → the Release workflow publishes all packages to npm with provenance.

### Manual publish (emergency only)
```bash
pnpm build
pnpm changeset version
pnpm release
```

### Version strategy
- `patch` (0.1.x): Bug fixes, typos
- `minor` (0.x.0): New features, non-breaking additions
- `major` (x.0.0): Breaking changes (always document in CHANGELOG)
