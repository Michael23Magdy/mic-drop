import { JiraIssue } from "../jira/client.js";

/**
 * Formats the ticket info into a markdown file written to the worktree.
 * In auto mode, this file is passed as the initial prompt via shell substitution.
 * In normal mode, the user references it manually with @.ticket.md in the agent session.
 */
export function formatTicketFile(issue: JiraIssue, baseBranch: string): string {
  return [
    `[${issue.key}] ${issue.title}`,
    "",
    issue.description,
    "",
    `When you're done implementing this, create a pull request using:`,
    `gh pr create --base ${baseBranch}`,
  ].join("\n");
}
