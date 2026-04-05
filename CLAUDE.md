# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A single Bash script (`ticket_to_claude_worktree.sh`) that automates the workflow of taking a Jira ticket and spinning up an isolated git worktree with Claude Code running inside it. The repo also includes `article.md` (a write-up about the tool) and `README.md`.

## Installation & Usage

```bash
# Install globally
cp ticket_to_claude_worktree.sh /usr/local/bin/ticket_to_claude_worktree
chmod +x /usr/local/bin/ticket_to_claude_worktree

# Run from inside a git repo
ticket_to_claude_worktree PROJ-123

# Run with explicit project path
ticket_to_claude_worktree -p ~/Projects/my-app PROJ-123
```

Required environment variables: `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`

## Script Flow

1. **Validate** — checks for `git`, `jq`, `curl`, `pbcopy`, `osascript` and Jira credentials
2. **Load config** — sources `.worktree.conf` from the project root if present
3. **Fetch ticket** — calls Jira REST API v3, extracts summary and description text nodes from the Atlassian Document Format JSON
4. **Create worktree** — sanitizes the ticket title into a branch name (`TICKET-KEY_Title-With-Hyphens`, max 60 chars), fetches `origin/$BASE_BRANCH`, creates a new git worktree at `$WORKTREES_ROOT/$ISSUE_KEY/`
5. **Copy files** — copies `COPY_FILES` and `COPY_DIRS` from the main project into the worktree
6. **Launch terminal** — opens Warp/iTerm/Terminal via `osascript`, starts `claude $CLAUDE_MODE` inside the worktree, and pastes the ticket context from the clipboard

## Project Configuration (`.worktree.conf`)

Placed in the target project root (not this repo). Key options:

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_BRANCH` | `develop` | Branch to base worktrees on |
| `WORKTREES_DIR` | `Worktrees` | Relative to the project's parent directory |
| `COPY_FILES` | `()` | Array of files to copy into the worktree |
| `COPY_DIRS` | `()` | Array of directories to copy |
| `TERMINAL` | `warp` | `warp`, `iterm`, or `terminal` |
| `CLAUDE_MODE` | `--permission-mode plan` | Flags passed to the `claude` CLI |

## Worktree Cleanup

```bash
cd ~/Projects/my-app
git worktree remove ../Worktrees/PROJ-42
git branch -d PROJ-42_Fix-login-button
# Or prune all stale worktrees:
git worktree prune
```

## macOS-Only Constraints

The script uses `osascript` (AppleScript) for terminal automation and `pbcopy` for clipboard access. It only works on macOS. If `TERMINAL` is set to an unrecognized value, it falls back to opening Finder and printing manual instructions.
