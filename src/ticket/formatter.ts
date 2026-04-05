import { JiraIssue } from "../jira/client.js";

/**
 * Formats the ticket info into a markdown file written to the worktree.
 * This file is passed as the initial message to Claude via shell substitution:
 *   claude --permission-mode plan "$(cat .ticket.md)"
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
