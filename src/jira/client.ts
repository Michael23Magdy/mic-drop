import { JiraCredentials } from "../config/credentials.js";
import { parseAdf } from "./adfParser.js";

export interface JiraIssue {
  key: string;
  title: string;
  description: string;
}

export class JiraAuthError extends Error {
  constructor() {
    super("Invalid Jira credentials. Run mic-drop setup to reconfigure.");
    this.name = "JiraAuthError";
  }
}

export class JiraTicketNotFoundError extends Error {
  constructor(key: string) {
    super(`Ticket ${key} not found.`);
    this.name = "JiraTicketNotFoundError";
  }
}

export class JiraApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export async function fetchIssue(
  creds: JiraCredentials,
  issueKey: string
): Promise<JiraIssue> {
  const token = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  const url = `https://${creds.domain}/rest/api/3/issue/${issueKey}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new JiraAuthError();
  }
  if (res.status === 404) {
    throw new JiraTicketNotFoundError(issueKey);
  }
  if (!res.ok) {
    throw new JiraApiError(res.status, `Jira API returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    fields: { summary: string; description: unknown };
  };

  const title = data.fields?.summary;
  if (!title) {
    throw new JiraApiError(200, `Could not parse ticket ${issueKey} — missing summary field.`);
  }

  return {
    key: issueKey,
    title,
    description: parseAdf(data.fields.description),
  };
}

/**
 * Verifies credentials by hitting the /myself endpoint.
 * Used during setup to confirm before saving to keychain.
 */
export async function verifyCredentials(creds: JiraCredentials): Promise<void> {
  const token = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  const url = `https://${creds.domain}/rest/api/3/myself`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new JiraAuthError();
  }
  if (!res.ok) {
    throw new JiraApiError(res.status, `Jira API returned HTTP ${res.status}`);
  }
}
