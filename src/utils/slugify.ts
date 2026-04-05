const MAX_DESC_LENGTH = 60;

/**
 * Converts a Jira ticket title into a safe git branch name suffix.
 * Mirrors the bash sed pipeline in the original script.
 */
export function slugify(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9._-]/g, "-") // replace non-alphanumeric with hyphen
    .replace(/-{2,}/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, MAX_DESC_LENGTH)
    .replace(/-+$/, ""); // trim trailing hyphen after slice
}

/**
 * Builds the full branch name: TICKET-KEY_Slugified-Title
 */
export function buildBranchName(issueKey: string, title: string): string {
  return `${issueKey}_${slugify(title)}`;
}
