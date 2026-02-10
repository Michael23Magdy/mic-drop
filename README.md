# ticket_to_claude_worktree

Turn a Jira ticket into an isolated git worktree with Claude Code running automatically — in one command.

## Prerequisites

- [Git](https://git-scm.com/) (with worktree support, 2.5+)
- [jq](https://jqlang.github.io/jq/) — `brew install jq`
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — `npm install -g @anthropic-ai/claude-code`
- A Jira Cloud instance with API access
- macOS (uses `osascript` and `pbcopy` for terminal automation)

## Installation

1. Clone or copy the script:

```bash
cp ticket_to_claude_worktree.sh /usr/local/bin/ticket_to_claude_worktree
chmod +x /usr/local/bin/ticket_to_claude_worktree
```

2. Set your Jira credentials as environment variables (add to your `~/.zshrc` or `~/.bashrc`):

```bash
export JIRA_DOMAIN="yourcompany.atlassian.net"
export JIRA_EMAIL="you@company.com"
export JIRA_API_TOKEN="your-jira-api-token"
```

To generate a Jira API token, go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

## Quick Start

```bash
# From inside any git repository
cd ~/Projects/my-app
ticket_to_claude_worktree PROJ-123
```

That's it. The script will:
1. Fetch the ticket title and description from Jira
2. Create a worktree branched off your base branch
3. Copy any configured project files
4. Open a new terminal window with Claude, ticket context pasted and ready

## Usage

```
ticket_to_claude_worktree [-p /path/to/project] TICKET-123
```

| Flag | Description |
|------|-------------|
| `TICKET-123` | The Jira issue key (required) |
| `-p PATH` | Path to the git project root. Defaults to the current git repository. |
| `-h` | Show help |

### Examples

```bash
# Use the current directory's git root
ticket_to_claude_worktree PROJ-42

# Specify a project explicitly
ticket_to_claude_worktree -p ~/AndroidStudioProjects/MyApp PROJ-42

# Works from anywhere if you pass -p
ticket_to_claude_worktree -p ~/Projects/web-frontend WEB-108
```

## Project Configuration

Create a `.worktree.conf` file in your project root to customize behavior. All fields are optional — sensible defaults are used when omitted.

```bash
# .worktree.conf

# Branch to base new worktrees on (default: develop)
BASE_BRANCH=main

# Where to create worktrees (default: ../Worktrees, relative to project root)
WORKTREES_DIR=../Worktrees

# Individual files to copy into the worktree
COPY_FILES=(local.properties app/google-services.json .env)

# Directories to copy into the worktree
COPY_DIRS=(keystores .gradle)

# Terminal to use: warp | iterm | terminal (default: warp)
TERMINAL=warp

# Claude CLI flags (default: --permission-mode plan)
CLAUDE_MODE="--permission-mode plan"
```

### Example Configs

**Android (Kotlin/Java):**
```bash
BASE_BRANCH=develop
COPY_FILES=(local.properties app/google-services.json)
COPY_DIRS=(keystores .gradle)
```

**iOS (Swift):**
```bash
BASE_BRANCH=main
COPY_FILES=(.env xcconfig/Development.xcconfig)
COPY_DIRS=(Pods)
```

**React / Next.js:**
```bash
BASE_BRANCH=main
COPY_FILES=(.env .env.local)
COPY_DIRS=(node_modules)
```

**Flutter:**
```bash
BASE_BRANCH=main
COPY_FILES=(.env android/local.properties android/app/google-services.json)
COPY_DIRS=(.dart_tool)
```

**Python / Django:**
```bash
BASE_BRANCH=main
COPY_FILES=(.env)
COPY_DIRS=(.venv)
```

**Go:**
```bash
BASE_BRANCH=main
COPY_FILES=(.env)
```

## Defaults

| Setting | Default |
|---------|---------|
| `BASE_BRANCH` | `develop` |
| `WORKTREES_DIR` | `../Worktrees` (sibling to project) |
| `COPY_FILES` | *(none)* |
| `COPY_DIRS` | *(none)* |
| `TERMINAL` | `warp` |
| `CLAUDE_MODE` | `--permission-mode plan` |

## Directory Structure

After running the script, your file system looks like this:

```
~/Projects/
├── my-app/                  # Your main working copy (untouched)
│   ├── .git/
│   ├── .worktree.conf
│   └── src/
└── Worktrees/
    ├── PROJ-42/             # Claude is working here
    │   └── src/
    └── PROJ-43/             # Another Claude instance here
        └── src/
```

Each worktree is a fully independent checkout. You can build, test, and run them separately.

## Worktree Cleanup

When Claude finishes and the PR is merged:

```bash
# From the main project directory
cd ~/Projects/my-app
git worktree remove ../Worktrees/PROJ-42
git branch -d PROJ-42_Fix-login-button
```

Or remove all finished worktrees at once:

```bash
git worktree prune
```

## Workflow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Jira Board │────▶│  Run the script  │────▶│  Claude works   │
│  Pick ticket│     │  One command     │     │  independently  │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                     ┌──────────────────┐             │
                     │  You keep coding │             │
                     │  on your branch  │◀────────────┘
                     └────────┬─────────┘        (in parallel)
                              │
                     ┌────────▼─────────┐
                     │  Review Claude's │
                     │  PR when ready   │
                     └──────────────────┘
```

## Troubleshooting

**"Not inside a git repository"**
Run the command from inside a git repo, or pass `-p /path/to/project`.

**"Could not fetch ticket"**
Check that your `JIRA_DOMAIN`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` environment variables are set correctly.

**"Worktree creation failed"**
The branch name may already exist. Check with `git branch -a` and delete the stale branch if needed.

**"Directory already exists"**
A worktree for that ticket was already created. Remove it first with `git worktree remove`.

**Files not being copied**
Verify paths in `COPY_FILES` and `COPY_DIRS` are relative to the project root. The script will warn about missing files but won't fail.

## License

MIT
