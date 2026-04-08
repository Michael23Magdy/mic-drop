# mic-drop

Turn a Jira ticket into an isolated git worktree with your AI agent — in one command.

```bash
mic-drop PROJ-123
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/) 2.5+ (worktree support)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — `npm install -g @anthropic-ai/claude-code`
- A Jira Cloud instance with API access

## Installation

```bash
npm install -g @michael_magdy/mic-drop
```

Then run the setup wizard once:

```bash
mic-drop setup
```

This will ask for your Jira credentials and save them securely to your OS keychain (macOS Keychain, Linux Secret Service, or Windows Credential Manager). No environment variables needed.

To generate a Jira API token, go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

## Quick Start

```bash
# From inside any git repository
cd ~/Projects/my-app
mic-drop PROJ-123
```

That's it. The tool will:
1. Fetch the ticket title and description from Jira
2. Create a worktree at `.worktrees/PROJ-123/` branched off your base branch
3. Copy any configured project files (if configured in `.worktree.json`)
4. Open a new terminal window with the agent session ready — reference `@.ticket.md` to load the ticket context, or use `--auto` to have it sent automatically

## Usage

```
mic-drop [options] <TICKET-123>
mic-drop setup
```

| Option | Description |
|--------|-------------|
| `TICKET-123` | The Jira issue key (required) |
| `-p, --project <path>` | Path to the git project root. Defaults to the current git repository. |
| `-a, --auto` | Auto mode: send the ticket as the initial agent prompt automatically |
| `-h, --help` | Show help |

### Modes

**Normal mode** (default) — `mic-drop PROJ-42`

The agent session starts with no pre-loaded context. Reference `@.ticket.md` in your first message, add implementation notes, mention relevant files, then submit when ready.

**Auto mode** — `mic-drop PROJ-42 --auto`

The ticket content is sent as the initial prompt automatically, so the agent starts working immediately without waiting for you.

### Examples

```bash
# Normal mode — session starts, you add context and submit
mic-drop PROJ-42

# Specify a project explicitly
mic-drop -p ~/Projects/my-app PROJ-42

# Auto mode — ticket sent as initial prompt automatically
mic-drop PROJ-42 --auto
mic-drop PROJ-42 -a
```

## Project Configuration

Create a `.worktree.json` file in your project root to customize behaviour. All fields are optional — sensible defaults are used when omitted.

```json
{
  "baseBranch": "main",
  "worktreesDir": ".worktrees",
  "copyFiles": [".env", ".env.local"],
  "copyDirs": [],
  "terminal": "warp",
  "claudeMode": "--permission-mode plan"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `baseBranch` | `develop` | Branch to base new worktrees on |
| `worktreesDir` | `.worktrees` | Where to create worktrees, relative to project root |
| `copyFiles` | `[]` | Files to copy from the main project into the worktree |
| `copyDirs` | `[]` | Directories to copy recursively |
| `terminal` | `warp` | Terminal to use: `warp`, `iterm`, `terminal` |
| `claudeMode` | `--permission-mode plan` | Flags passed to the `claude` CLI |

### Legacy `.worktree.conf`

If your project has an existing bash-style `.worktree.conf`, `mic-drop` will read it automatically and prompt you to migrate to `.worktree.json`.

### Branch Naming

Branches are automatically named using the pattern: `TICKET-KEY_Title-With-Hyphens`

For example, ticket `PROJ-42` with title "Fix login button" becomes branch `PROJ-42_Fix-login-button`.

### Example Configs

**React / Next.js:**
```json
{
  "baseBranch": "main",
  "copyFiles": [".env", ".env.local"]
}
```

**Android (Kotlin/Java):**
```json
{
  "baseBranch": "develop",
  "copyFiles": ["local.properties", "app/google-services.json"],
  "copyDirs": ["keystores", ".gradle"]
}
```

**Python / Django:**
```json
{
  "baseBranch": "main",
  "copyFiles": [".env"],
  "copyDirs": [".venv"]
}
```

## Directory Structure

After running, your file system looks like this:

```
~/Projects/my-app/
├── .git/
├── .worktrees/          ← added to .gitignore automatically
│   └── PROJ-42/         ← Claude is working here (isolated branch)
│       └── src/
├── .worktree.json
└── src/                 ← your main branch, untouched
```

Each worktree is a fully independent checkout on its own branch. You can build, test, and run them separately while Claude works.

## Worktree Cleanup

When Claude finishes and you've merged the PR:

```bash
# From the main project directory
git worktree remove .worktrees/PROJ-42
git branch -d PROJ-42_Fix-login-button

# Or prune all finished worktrees at once:
git worktree prune
```

## Workflow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Jira Board │────▶│  mic-drop PROJ-42 │────▶│  Claude works   │
│  Pick ticket│     │  One command      │     │  independently  │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                     ┌──────────────────┐              │
                     │  You keep coding │              │
                     │  on your branch  │◀─────────────┘
                     └────────┬─────────┘         (in parallel)
                              │
                     ┌────────▼─────────┐
                     │  Review and      │
                     │  merge the PR    │
                     └──────────────────┘
```

## Troubleshooting

**"No credentials found. Run: mic-drop setup"**
Run `mic-drop setup` to configure your Jira credentials.

**"Not inside a git repository"**
Run the command from inside a git repo, or pass `-p /path/to/project`.

**Could not fetch ticket**
Check that your Jira domain, email, and API token are correct. Run `mic-drop setup` to reconfigure.

**"Worktree already exists"**
A worktree for that ticket was already created. Remove it first:
```bash
git worktree remove .worktrees/PROJ-42
```

**Files not being copied**
Verify paths in `copyFiles` and `copyDirs` are relative to the project root. The tool will warn about missing files but won't fail.

**Terminal opens but Claude doesn't start (Warp)**
macOS requires Accessibility permissions for terminal automation. Go to **System Preferences → Privacy & Security → Accessibility** and ensure your terminal app is listed.

## License

MIT
