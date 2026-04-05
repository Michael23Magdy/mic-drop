import { input, password, confirm, select } from "@inquirer/prompts";
import path from "path";
import { loadCredentials, saveCredentials } from "../config/credentials.js";
import { loadProjectConfig, saveProjectConfig } from "../config/projectConfig.js";
import { verifyCredentials, JiraAuthError } from "../jira/client.js";
import { getAvailableLaunchers } from "../terminal/registry.js";
import { ensureGitignoreEntry } from "../git/gitignore.js";
import { resolveRepoRoot, GitNotRepoError } from "../git/worktree.js";
import { withSpinner } from "../utils/spinner.js";
import { logger } from "../utils/logger.js";

export async function runSetup(): Promise<void> {
  logger.step("mic-drop setup");
  console.log();

  // --- 1. Jira credentials ---
  const existingCreds = await loadCredentials().catch(() => null);

  const domain = await input({
    message: "Jira domain (e.g. yourcompany.atlassian.net):",
    default: existingCreds?.domain,
    validate: (v) => (v.trim() ? true : "Required"),
  });

  const email = await input({
    message: "Jira email:",
    default: existingCreds?.email,
    validate: (v) => (v.trim() ? true : "Required"),
  });

  const apiToken = await password({
    message: "Jira API token:",
    validate: (v) => (v.trim() ? true : "Required"),
  });

  const creds = {
    domain: domain.trim(),
    email: email.trim(),
    apiToken: apiToken.trim(),
  };

  // --- 2. Verify credentials ---
  await withSpinner("Verifying credentials...", async () => {
    await verifyCredentials(creds);
  }).catch((err) => {
    if (err instanceof JiraAuthError) {
      logger.error("Invalid credentials. Check your domain, email, and API token.");
      process.exit(1);
    }
    throw err;
  });

  // --- 3. Save to keychain ---
  await saveCredentials(creds);
  logger.success("Credentials saved to system keychain.");

  // --- 4. Optional project config ---
  console.log();
  logger.step("Per-project configuration");

  let repoRoot: string | null = null;
  try {
    repoRoot = await resolveRepoRoot(process.cwd());
  } catch (err) {
    if (!(err instanceof GitNotRepoError)) throw err;
  }

  if (!repoRoot) {
    console.log(
      "  (Not in a git repo — run mic-drop setup from inside a project to configure it)\n"
    );
    console.log("Setup complete. Run: mic-drop PROJ-123\n");
    return;
  }

  const configProject = await confirm({
    message: `Configure project at ${repoRoot}?`,
    default: true,
  });

  if (!configProject) {
    console.log("\nSetup complete. Run: mic-drop PROJ-123\n");
    return;
  }

  const { config: existing, source } = await loadProjectConfig(repoRoot);

  if (source === "legacy") {
    logger.warn(
      "Found .worktree.conf (legacy format). Settings have been migrated — a new .worktree.json will be written."
    );
  }

  const baseBranch = await input({
    message: "Base branch:",
    default: existing.baseBranch,
  });

  const worktreesDir = await input({
    message: "Worktrees directory (relative to project root):",
    default: existing.worktreesDir,
  });

  const copyFilesRaw = await input({
    message: "Files to copy into worktree (comma-separated, or leave empty):",
    default: existing.copyFiles.join(", "),
  });

  const copyDirsRaw = await input({
    message: "Directories to copy into worktree (comma-separated, or leave empty):",
    default: existing.copyDirs.join(", "),
  });

  // Discover available terminals on this platform
  const available = await getAvailableLaunchers();
  const terminalChoices = [
    ...available.map((l) => ({ name: l.name, value: l.name })),
    { name: "none (print instructions only)", value: "fallback" },
  ];

  const terminal =
    terminalChoices.length > 1
      ? await select({
          message: "Preferred terminal:",
          choices: terminalChoices,
          default: available.find((l) => l.name === existing.terminal)
            ? existing.terminal
            : terminalChoices[0].value,
        })
      : terminalChoices[0].value;

  const claudeMode = await input({
    message: "Claude CLI flags:",
    default: existing.claudeMode,
  });

  const parseList = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const newConfig = {
    baseBranch: baseBranch.trim() || "develop",
    worktreesDir: worktreesDir.trim() || ".worktrees",
    copyFiles: parseList(copyFilesRaw),
    copyDirs: parseList(copyDirsRaw),
    terminal,
    claudeMode: claudeMode.trim() || "--permission-mode plan",
  };

  saveProjectConfig(repoRoot, newConfig);
  logger.success(`Config written to ${path.join(repoRoot, ".worktree.json")}`);

  ensureGitignoreEntry(repoRoot, newConfig.worktreesDir);
  logger.success(`.gitignore updated with ${newConfig.worktreesDir}/`);

  console.log("\nSetup complete. Run: mic-drop PROJ-123\n");
}
