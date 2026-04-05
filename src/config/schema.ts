import { z } from "zod";

export const ProjectConfigSchema = z.object({
  baseBranch: z.string().default("develop"),
  worktreesDir: z.string().default(".worktrees"),
  copyFiles: z.array(z.string()).default([]),
  copyDirs: z.array(z.string()).default([]),
  terminal: z.string().default("warp"),
  claudeMode: z.string().default("--permission-mode plan"),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const PROJECT_CONFIG_DEFAULTS: ProjectConfig = {
  baseBranch: "develop",
  worktreesDir: ".worktrees",
  copyFiles: [],
  copyDirs: [],
  terminal: "warp",
  claudeMode: "--permission-mode plan",
};
