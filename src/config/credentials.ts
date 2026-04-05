import keytar from "keytar";

const SERVICE = "mic-drop";

export interface JiraCredentials {
  domain: string;
  email: string;
  apiToken: string;
}

export async function saveCredentials(creds: JiraCredentials): Promise<void> {
  await keytar.setPassword(SERVICE, "jira-domain", creds.domain);
  await keytar.setPassword(SERVICE, "jira-email", creds.email);
  await keytar.setPassword(SERVICE, "jira-api-token", creds.apiToken);
}

export async function loadCredentials(): Promise<JiraCredentials | null> {
  const [domain, email, apiToken] = await Promise.all([
    keytar.getPassword(SERVICE, "jira-domain"),
    keytar.getPassword(SERVICE, "jira-email"),
    keytar.getPassword(SERVICE, "jira-api-token"),
  ]);

  if (!domain || !email || !apiToken) return null;
  return { domain, email, apiToken };
}

export async function clearCredentials(): Promise<void> {
  await Promise.all([
    keytar.deletePassword(SERVICE, "jira-domain"),
    keytar.deletePassword(SERVICE, "jira-email"),
    keytar.deletePassword(SERVICE, "jira-api-token"),
  ]);
}
