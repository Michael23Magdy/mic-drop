import { Command } from "commander";
import { runSetup } from "./commands/setup.js";
import { runTicket } from "./commands/run.js";

const program = new Command();

program
  .name("mic-drop")
  .description("Turn a Jira ticket into an isolated git worktree with Claude Code — in one command.")
  .version("0.1.0");

program
  .command("setup")
  .description("Interactive setup wizard for Jira credentials and project configuration")
  .action(async () => {
    await runSetup();
  });

program
  .argument("<issue-key>", "Jira issue key (e.g. PROJ-123)")
  .option("-p, --project <path>", "Path to the git project root (defaults to current directory)")
  .description("Create a worktree and launch Claude for the given Jira ticket")
  .action(async (issueKey: string, opts: { project?: string }) => {
    await runTicket(issueKey, opts);
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
