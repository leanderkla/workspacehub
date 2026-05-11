# WorkspaceHub

Local-first personal workspace manager for Windows.

## Download

**[⬇ Get the latest release](https://github.com/leanderkla/workspacehub/releases/latest)**

First time installing? Windows will show a SmartScreen warning 
("Windows protected your PC"). This is normal for unsigned apps. 
Click "More info" → "Run anyway".

The app auto-updates from future releases. Your data stays local 
at `%APPDATA%\workspacehub\`.

---

## Development

### Pre-commit hook (recommended for contributors)

This repo ships a pre-commit hook that blocks personal-data leaks. Activate per-clone (one-time):

    git config --local core.hooksPath .githooks

The hook reads patterns from a gitignored `.pre-commit-personal-markers` file at repo root; create one with your patterns (one per line, `#` for comments). See [.githooks/pre-commit](.githooks/pre-commit) for details.
