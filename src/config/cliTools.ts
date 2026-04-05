export interface CliToolDefinition {
  id: string;
  label: string;        // shown in inquirer select
  command: string;      // binary name (empty for 'other')
  defaultFlags: string; // safe/plan-mode equivalent for this tool
}

export const CLI_TOOLS: readonly CliToolDefinition[] = [
  {
    id: "claude",
    label: "Claude Code",
    command: "claude",
    defaultFlags: "--permission-mode plan",
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    command: "gemini",
    defaultFlags: "", // default interactive mode (omit --yolo for safety)
  },
  {
    id: "codex",
    label: "OpenAI Codex CLI",
    command: "codex",
    defaultFlags: "--approval-mode suggest", // suggest-only, mirrors plan mode
  },
  {
    id: "other",
    label: "Other",
    command: "",
    defaultFlags: "",
  },
];

export function getCliTool(id: string): CliToolDefinition | undefined {
  return CLI_TOOLS.find((t) => t.id === id);
}
