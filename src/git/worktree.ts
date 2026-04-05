import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

export class WorktreeExistsError extends Error {
  constructor(targetDir: string) {
    super(`Worktree already exists at ${targetDir}. Remove it first with:\n    git worktree remove ${targetDir}`);
    this.name = "WorktreeExistsError";
  }
}

export class GitNotRepoError extends Error {
  constructor() {
    super("Not inside a git repository.");
    this.name = "GitNotRepoError";
  }
}

export interface CreateWorktreeOptions {
  repoRoot: string;
  targetDir: string;
  branchName: string;
  baseBranch: string;
  copyFiles: string[];
  copyDirs: string[];
}

export interface CreateWorktreeResult {
  branchReused: boolean;
}

/**
 * Resolves the absolute path of the git repository root for a given directory.
 */
export async function resolveRepoRoot(startDir: string): Promise<string> {
  const git = simpleGit(startDir);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new GitNotRepoError();
  return await git.revparse(["--show-toplevel"]);
}

/**
 * Creates a git worktree with all the edge cases handled:
 * - Prunes stale worktree metadata first
 * - Fetches the base branch
 * - Reuses existing branch if it already exists
 * - Unsets upstream after creation
 */
export async function createWorktree(
  opts: CreateWorktreeOptions
): Promise<CreateWorktreeResult> {
  const { repoRoot, targetDir, branchName, baseBranch } = opts;
  const git = simpleGit(repoRoot);

  if (fs.existsSync(targetDir)) {
    throw new WorktreeExistsError(targetDir);
  }

  // 1. Prune stale worktree metadata from manually deleted directories
  await git.raw(["worktree", "prune"]);

  // 2. Fetch the base branch
  await git.fetch("origin", baseBranch);

  // 3. Check if branch already exists (e.g., from a previously removed worktree)
  const branchSummary = await git.branch(["-a"]);
  const branchExists =
    branchName in branchSummary.branches ||
    `remotes/origin/${branchName}` in branchSummary.branches;

  // 4. Create worktree directory parent
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  // 5. Create worktree
  if (branchExists) {
    await git.raw(["worktree", "add", targetDir, branchName]);
  } else {
    await git.raw([
      "worktree",
      "add",
      targetDir,
      `origin/${baseBranch}`,
      "-b",
      branchName,
    ]);
  }

  // 6. Unset upstream to prevent accidental push to wrong branch
  try {
    const worktreeGit = simpleGit(targetDir);
    await worktreeGit.branch(["--unset-upstream"]);
  } catch {
    // ignore — no upstream set is fine
  }

  return { branchReused: branchExists };
}

/**
 * Copies files and directories from the project root into the worktree.
 * Warns on missing entries but does not fail.
 */
export function copyProjectFiles(
  repoRoot: string,
  targetDir: string,
  copyFiles: string[],
  copyDirs: string[]
): { copied: string[]; missing: string[] } {
  const copied: string[] = [];
  const missing: string[] = [];

  for (const file of copyFiles) {
    const src = path.join(repoRoot, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      copied.push(file);
    } else {
      missing.push(file);
    }
  }

  for (const dir of copyDirs) {
    const src = path.join(repoRoot, dir);
    const dest = path.join(targetDir, dir);
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      copyDirRecursive(src, dest);
      copied.push(dir + "/");
    } else {
      missing.push(dir + "/");
    }
  }

  return { copied, missing };
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
