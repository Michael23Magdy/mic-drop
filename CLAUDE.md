# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`mic-drop` is a TypeScript npm CLI (`npm install -g mic-drop`) that turns a Jira ticket into an isolated git worktree with Claude Code running automatically — in one command. The original bash prototype lives in `ticket_to_claude_worktree.sh` for reference.

## Commands

```bash
npm run build       # compile TypeScript via tsup → dist/
npm run dev         # watch mode
npm run test        # run vitest tests
npm install -g .    # install locally for testing
```

## Architecture

```
src/
├── index.ts                    # CLI entry (commander), registers commands
├── commands/
│   ├── setup.ts                # mic-drop setup — interactive wizard
│   └── run.ts                  # mic-drop PROJ-123 — main command
├── config/
│   ├── schema.ts               # Zod schema + ProjectConfig type
│   ├── credentials.ts          # keytar read/write (OS keychain)
│   └── projectConfig.ts        # .worktree.json load/save + .worktree.conf migration
├── jira/
│   ├── client.ts               # Jira REST API v3, credential verification
│   └── adfParser.ts            # Atlassian Document Format → plain text
├── git/
│   ├── worktree.ts             # createWorktree, excludeFromWorktree, copyProjectFiles
│   └── gitignore.ts            # ensureGitignoreEntry (idempotent)
├── terminal/
│   ├── types.ts                # TerminalLauncher interface + LaunchOptions
│   ├── registry.ts             # getLauncher(), getAvailableLaunchers()
│   ├── clipboard.ts            # copyToClipboard (cross-platform)
│   ├── fallback.ts             # prints manual instructions
│   └── launchers/
│       ├── warp.ts             # macOS Warp (open -a + .start-claude.sh + AppleScript)
│       ├── iterm.ts            # macOS iTerm2 (AppleScript write text)
│       ├── terminal-app.ts     # macOS Terminal.app (AppleScript do script)
│       ├── gnome-terminal.ts   # Linux GNOME Terminal (Phase 2)
│       ├── konsole.ts          # Linux Konsole (Phase 2)
│       └── windows-terminal.ts # Windows Terminal (Phase 3)
├── ticket/
│   └── formatter.ts            # builds .ticket.md content
└── utils/
    ├── logger.ts               # chalk-based info/warn/error/success
    ├── spinner.ts              # ora wrapper
    ├── slugify.ts              # ticket title → safe branch name (60 char max)
    └── platform.ts             # isMac / isLinux / isWindows
```

## Key Behaviours

- **Credentials** stored in OS keychain via `keytar` (macOS Keychain / Linux Secret Service / Windows Credential Manager). Service name: `mic-drop`.
- **Config** loaded from `.worktree.json` in project root; falls back to legacy `.worktree.conf` with a bash-style parser (no shell execution).
- **Worktrees** created inside the repo at `.worktrees/<ISSUE-KEY>/` by default. `.worktrees/` is added to `.gitignore` automatically.
- **Generated files** (`.ticket.md`, `.start-claude.sh`) are hidden from `git status` via the worktree's local `.git/worktrees/<name>/info/exclude` — never committed.
- **Terminal launch** (Warp): writes `.start-claude.sh` to the worktree, opens Warp, types `bash .start-claude.sh` via AppleScript after a 2s sleep.

## `.worktree.json` Schema

```json
{
  "baseBranch": "develop",
  "worktreesDir": ".worktrees",
  "copyFiles": [],
  "copyDirs": [],
  "terminal": "warp",
  "claudeMode": "--permission-mode plan"
}
```
