import path from "path";
import fs from "fs";
import { loadCredentials } from "../config/credentials.js";
import { loadProjectConfig } from "../config/projectConfig.js";
import { ProjectConfig } from "../config/schema.js";
import { fetchIssue } from "../jira/client.js";
import { createWorktree, copyProjectFiles, resolveRepoRoot, excludeFromWorktree, GitNotRepoError, WorktreeExistsError } from "../git/worktree.js";
import { ensureGitignoreEntry } from "../git/gitignore.js";
import { buildBranchName } from "../utils/slugify.js";
import { formatTicketFile } from "../ticket/formatter.js";
import { getLauncher } from "../terminal/registry.js";
import { withSpinner } from "../utils/spinner.js";
import { logger } from "../utils/logger.js";

export interface RunOptions {
  project?: string;
  auto?: boolean;
}

function buildCliCommand(config: ProjectConfig, auto: boolean): string {
  const flags = config.cliFlags.trim();
  const base = flags ? `${config.cliCommand} ${flags}` : config.cliCommand;
  return auto ? `${base} "$(cat .ticket.md)"` : base;
}

export async function runTicket(issueKey: string, opts: RunOptions): Promise<void> {
  // --- 1. Resolve project root ---
  let repoRoot: string;
  try {
    repoRoot = await resolveRepoRoot(opts.project ?? process.cwd());
  } catch (err) {
    if (err instanceof GitNotRepoError) {
      logger.error("Not inside a git repository. Use -p to specify the project path.");
      process.exit(1);
    }
    throw err;
  }

  // --- 2. Load config ---
  const { config, source } = await loadProjectConfig(repoRoot);
  if (source === "legacy") {
    logger.warn("Using legacy .worktree.conf — run `mic-drop setup` to migrate to .worktree.json");
  }

  // --- 3. Load credentials ---
  const creds = await loadCredentials().catch(() => null);
  if (!creds) {
    logger.error("No credentials found. Run: mic-drop setup");
    process.exit(1);
  }

  // --- 4. Fetch ticket ---
  logger.step(`Fetching ${issueKey}...`);
  const issue = await withSpinner(`Fetching ${issueKey} from Jira`, () =>
    fetchIssue(creds, issueKey)
  ).catch((err: Error) => {
    logger.error(err.message);
    process.exit(1);
  });

  logger.detail("Title", issue.title);

  // --- 5. Resolve paths ---
  const branchName = buildBranchName(issueKey, issue.title);
  const worktreesRoot = path.isAbsolute(config.worktreesDir)
    ? config.worktreesDir
    : path.join(repoRoot, config.worktreesDir);
  const targetDir = path.join(worktreesRoot, issueKey);

  // --- 6. Create worktree ---
  logger.step("Preparing worktree...");
  logger.detail("Branch", branchName);
  logger.detail("Base", `origin/${config.baseBranch}`);
  logger.detail("Target", targetDir);

  const { branchReused } = await withSpinner("Creating worktree", () =>
    createWorktree({
      repoRoot,
      targetDir,
      branchName,
      baseBranch: config.baseBranch,
      copyFiles: config.copyFiles,
      copyDirs: config.copyDirs,
    })
  ).catch((err: Error) => {
    if (err instanceof WorktreeExistsError) {
      logger.error(err.message);
      process.exit(1);
    }
    logger.error(`Worktree creation failed: ${err.message}`);
    process.exit(1);
  });

  if (branchReused) {
    logger.warn(`Branch ${branchName} already existed — reusing it.`);
  }

  // --- 7. Copy files ---
  if (config.copyFiles.length > 0 || config.copyDirs.length > 0) {
    const { copied, missing } = copyProjectFiles(
      repoRoot,
      targetDir,
      config.copyFiles,
      config.copyDirs
    );
    for (const f of copied) logger.success(`Copied ${f}`);
    for (const f of missing) logger.warn(`Not found, skipped: ${f}`);
  }

  // --- 8. Write .ticket.md ---
  const ticketContent = formatTicketFile(issue, config.baseBranch);
  const ticketFile = path.join(targetDir, ".ticket.md");
  fs.writeFileSync(ticketFile, ticketContent, "utf-8");
  logger.success("Wrote .ticket.md");

  // Hide generated files from git status (worktree-local, never committed)
  await excludeFromWorktree(targetDir, [".ticket.md", ".start-agent.sh"]);

  // --- 9. Ensure .gitignore ---
  ensureGitignoreEntry(repoRoot, config.worktreesDir);
  logger.success("Updated .gitignore");

  // --- 10. Build the CLI command ---
  const agentCommand = buildCliCommand(config, opts.auto ?? false);
  if (!opts.auto) {
    logger.info("Normal mode: the agent will start without the ticket pre-loaded. Reference .ticket.md in your session when ready.");
  }

  // --- 11. Launch terminal ---
  logger.step("Launching terminal...");
  const launcher = getLauncher(config.terminal);
  logger.detail("Terminal", launcher.name);
  logger.detail("Directory", targetDir);
  logger.detail("Command", agentCommand);

  await launcher.launch({
    workingDirectory: targetDir,
    command: agentCommand,
  });

  logger.success(`Done! Agent is starting in ${launcher.name === "fallback" ? "manual mode" : launcher.name}.`);
}
