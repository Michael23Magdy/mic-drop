import fs from "fs";
import path from "path";

/**
 * Ensures the given entry exists in the project's .gitignore.
 * Idempotent — safe to call on every run.
 */
export function ensureGitignoreEntry(repoRoot: string, entry: string): void {
  const gitignorePath = path.join(repoRoot, ".gitignore");

  // Normalize the entry to check for (with and without trailing slash)
  const entryNorm = entry.endsWith("/") ? entry : entry + "/";
  const entryBase = entry.replace(/\/$/, "");

  let existing = "";
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, "utf-8");
    const lines = existing.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === entryBase || trimmed === entryNorm) {
        return; // already present
      }
    }
  }

  const toAppend = existing.endsWith("\n") || existing === ""
    ? entryNorm + "\n"
    : "\n" + entryNorm + "\n";

  fs.appendFileSync(gitignorePath, toAppend, "utf-8");
}
