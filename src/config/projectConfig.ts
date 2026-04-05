import fs from "fs";
import path from "path";
import { ProjectConfig, ProjectConfigSchema, PROJECT_CONFIG_DEFAULTS } from "./schema.js";

const JSON_CONFIG = ".worktree.json";
const LEGACY_CONFIG = ".worktree.conf";

/**
 * Loads project config, checking .worktree.json first, then falling back
 * to the legacy bash-style .worktree.conf. Returns merged defaults.
 */
export async function loadProjectConfig(repoRoot: string): Promise<{
  config: ProjectConfig;
  source: "json" | "legacy" | "defaults";
}> {
  const jsonPath = path.join(repoRoot, JSON_CONFIG);
  const legacyPath = path.join(repoRoot, LEGACY_CONFIG);

  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const config = ProjectConfigSchema.parse(raw);
    return { config, source: "json" };
  }

  if (fs.existsSync(legacyPath)) {
    const config = parseLegacyConf(fs.readFileSync(legacyPath, "utf-8"));
    return { config, source: "legacy" };
  }

  return { config: { ...PROJECT_CONFIG_DEFAULTS }, source: "defaults" };
}

/**
 * Writes a .worktree.json to the given directory.
 */
export function saveProjectConfig(repoRoot: string, config: ProjectConfig): void {
  const jsonPath = path.join(repoRoot, JSON_CONFIG);
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * Parses a bash-style .worktree.conf file without executing it.
 * Handles: KEY=value, KEY="value", KEY=(a b c), KEY=("a" "b")
 */
function parseLegacyConf(content: string): ProjectConfig {
  const partial: Partial<Record<string, string | string[]>> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array assignment: KEY=(a b c) or KEY=("a b" c)
    const arrayMatch = trimmed.match(/^(\w+)=\(([^)]*)\)$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const raw = arrayMatch[2].trim();
      // Split on whitespace but respect quoted tokens
      const items: string[] = [];
      for (const m of raw.matchAll(/\"([^\"]*)\"|'([^']*)'|(\S+)/g)) {
        items.push(m[1] ?? m[2] ?? m[3]);
      }
      partial[key] = items;
      continue;
    }

    // Scalar assignment: KEY=value or KEY="value" or KEY='value'
    const scalarMatch = trimmed.match(/^(\w+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (scalarMatch) {
      const key = scalarMatch[1];
      const value = scalarMatch[2] ?? scalarMatch[3] ?? scalarMatch[4] ?? "";
      partial[key] = value;
    }
  }

  return ProjectConfigSchema.parse({
    baseBranch: partial["BASE_BRANCH"],
    worktreesDir: partial["WORKTREES_DIR"],
    copyFiles: partial["COPY_FILES"],
    copyDirs: partial["COPY_DIRS"],
    terminal: partial["TERMINAL"],
    claudeMode: partial["CLAUDE_MODE"],
  });
}
