# WorkspaceHub

(Full README coming with v1.0. This stub documents the dev-setup step
that matters most right now.)

## Development

### Pre-commit hook (recommended for contributors)

This repo ships a pre-commit hook that blocks personal-data leaks.
Activate per-clone (one-time):

    git config --local core.hooksPath .githooks

The hook reads patterns from a gitignored `.pre-commit-personal-markers`
file at repo root; create one with your patterns (one per line, `#` for
comments). See [.githooks/pre-commit](.githooks/pre-commit) for details.
