# WorkspaceHub

A local-first personal workspace manager. Single-developer hobby project — see [MASTER_PLAN.md](MASTER_PLAN.md) for the v1.0 roadmap.

(Full README coming with v1.0 in M5. This intermediate version documents install + the dev-setup step that matters most right now.)

## Install

Download the latest `WorkspaceHub-Setup-X.Y.Z.exe` from [Releases](https://github.com/leanderkla/workspacehub/releases) and run it.

**Windows SmartScreen will show "Windows protected your PC"** because the build is unsigned. To proceed:

1. Click **More info**
2. Click **Run anyway**

This warning will appear on every fresh download until either the installer accumulates enough Microsoft SmartScreen reputation (typically hundreds of installs) or the binary gets code-signed in a later release.

The installer is **per-user** — no admin / UAC prompt. Default install path is `%LOCALAPPDATA%\Programs\WorkspaceHub`; you can change it during install. A desktop shortcut and Start-menu entry are created. The installed app auto-updates from GitHub Releases (silent download, applies on next quit).

## Where your data lives

`%APPDATA%\workspacehub` — i.e. `C:\Users\<you>\AppData\Roaming\workspacehub`.

This directory **survives uninstall and upgrade**. Back it up to keep your workspace safe across machine moves.

## Development

### Pre-commit hook (recommended for contributors)

This repo ships a pre-commit hook that blocks personal-data leaks. Activate per-clone (one-time):

    git config --local core.hooksPath .githooks

The hook reads patterns from a gitignored `.pre-commit-personal-markers` file at repo root; create one with your patterns (one per line, `#` for comments). See [.githooks/pre-commit](.githooks/pre-commit) for details.
