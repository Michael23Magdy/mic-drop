# Stop Waiting on Claude: Turn Jira Tickets into Parallel Worktrees

## The Problem

You hand Claude a task. It works. You wait. Five minutes. Ten minutes. Maybe longer for a complex feature. Meanwhile, your momentum dies. You check Slack, scroll Twitter, or just stare at the terminal.

This is wrong.

Claude is supposed to save you time, not steal it. The moment you're blocked waiting for an AI agent to finish, you've lost the entire point.

## The Idea

What if every Jira ticket could become an isolated workspace — automatically — where Claude works independently while you keep building?

That's the workflow:

1. You pick a ticket from the board.
2. You run one command.
3. A git worktree is created, config files are copied (if configured), and the agent session opens with the ticket saved as `.ticket.md`. Reference it with `@.ticket.md`, add your notes, and submit — or use `--auto` to have it sent immediately.
4. You go back to your main branch and keep working.

No context switching. No copy-pasting ticket descriptions. No manually creating branches. One command, and Claude is off to the races in its own directory while you stay productive in yours.

## Why Worktrees?

Git worktrees let you check out multiple branches simultaneously in separate directories — all sharing the same `.git` history. This is the key that makes the whole workflow possible:

- **No stashing.** Your main branch stays untouched.
- **No cloning.** Worktrees are lightweight. They share the object store.
- **No conflicts.** Claude's changes live in a completely separate directory.
- **Easy cleanup.** `git worktree remove` and it's gone.

Think of each worktree as a parallel universe for your repo. Claude gets one universe, you keep yours.

## The Parallel Development Model

Here's what a productive day looks like with this workflow:

```
9:00 AM  You start feature A on main worktree
9:15 AM  Ticket PROJ-42 needs a fix → mic-drop PROJ-42 --auto → agent starts immediately
9:16 AM  You continue feature A
9:30 AM  Ticket PROJ-43 is a small refactor → mic-drop PROJ-43 → add notes, reference files, submit
9:31 AM  Still working on feature A, uninterrupted
10:00 AM Review agent's changes for PROJ-42, create PR, approve and merge
10:05 AM Review PROJ-43, request one change, agent fixes it
10:10 AM Back to feature A
```

You just got three things done in the time it used to take for one. Not because you worked faster, but because you stopped waiting.

## What the Tool Actually Does

Behind one command, `mic-drop` handles the full setup:

1. **Fetches the Jira ticket** — pulls the title and description via the Jira API.
2. **Creates a git worktree** — creates a new branch from `origin/<baseBranch>` (configured per project) named after the ticket key and title: `PROJ-42_Fix-login-button`. The worktree lives at `.worktrees/PROJ-42/` inside your repo, fully isolated from your main checkout.
3. **Copies project config** (if configured via `.worktree.json`) — secrets, build caches, environment files.
4. **Launches the agent in a new terminal** — opens your terminal of choice, starts the agent in plan mode with the ticket saved as `.ticket.md`. In normal mode you reference it with `@.ticket.md` and add your own context before submitting; in auto mode (`--auto`) the ticket is sent as the initial prompt immediately.

You don't touch any of it. The tool does the plumbing; you stay focused on your work.

## Getting Started

Install once:

```bash
npm install -g @michael_magdy/mic-drop
mic-drop setup
```

The setup wizard asks for your Jira credentials and saves them securely to your OS keychain — no environment variables, no `.env` files to manage.

Then from any project:

```bash
cd ~/Projects/my-app
mic-drop PROJ-123
```

## It Works for Any Project

The tool isn't tied to Android, iOS, React, or any specific stack. Each project gets a `.worktree.json` file that tells the tool what to copy and which branch to base off:

- An Android project copies `local.properties`, `google-services.json`, and the Gradle cache.
- A Node project copies `.env` and maybe `node_modules`.
- A Go project might copy just `.env`.

Same tool. Different config. Any project.

## The Mindset Shift

The real change isn't the tooling — it's how you think about delegation.

Most developers treat Claude like a pair programmer: you sit together, you talk, you wait for each other. That works for complex design decisions, but it's terrible for well-defined tickets.

A Jira ticket with a clear title, description, and acceptance criteria is a self-contained unit of work. It doesn't need you hovering. It needs an agent that can read the spec, understand the codebase, and produce code changes that you can turn into a pull request.

Your job shifts from *doing the work* to *reviewing the work*. And reviewing changes takes a fraction of the time it takes to write the code. The agent works in plan mode, so you'll approve its approach before it executes, ensuring alignment without hovering.

## The Limits

This isn't magic. It works best when:

- **Tickets are well-defined.** Garbage in, garbage out. If the ticket says "fix the thing," the agent will struggle just like a junior developer would.
- **The codebase has good structure.** The agent navigates well-organized projects much better than spaghetti code.
- **You review the output.** The agent is fast, not infallible. Review its changes like you'd review any other developer's code — read the diff, run the tests, push back when needed.
- **The scope is contained.** Small bugs, small refactors, and direct one-off changes are the sweet spot. While you focus on a complex feature that needs your full attention, the agent handles the queue of straightforward tickets in parallel.

## Getting Started

The tool is open source. See the [README](README.md) for full configuration options.

Stop waiting. Start parallelizing.
