import { z } from "zod";

export const ProjectConfigSchema = z.object({
  baseBranch: z.string().default("develop"),
  worktreesDir: z.string().default(".worktrees"),
  copyFiles: z.array(z.string()).default([]),
  copyDirs: z.array(z.string()).default([]),
  terminal: z.string().default("warp"),
  cliTool: z.string().default("claude"),
  cliCommand: z.string().default("claude"),
  cliFlags: z.string().default("--permission-mode plan"),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const PROJECT_CONFIG_DEFAULTS: ProjectConfig = {
  baseBranch: "develop",
  worktreesDir: ".worktrees",
  copyFiles: [],
  copyDirs: [],
  terminal: "warp",
  cliTool: "claude",
  cliCommand: "claude",
  cliFlags: "--permission-mode plan",
};
