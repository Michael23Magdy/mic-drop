/**
 * Parses Atlassian Document Format (ADF) JSON into plain text.
 * Recursively walks the content tree collecting all text nodes.
 */

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

function extractText(node: AdfNode): string[] {
  const parts: string[] = [];
  if (node.type === "text" && node.text) {
    parts.push(node.text);
  }
  if (node.content) {
    for (const child of node.content) {
      parts.push(...extractText(child));
    }
  }
  return parts;
}

export function parseAdf(description: unknown): string {
  if (!description || typeof description !== "object") {
    return "No description provided.";
  }

  const texts = extractText(description as AdfNode);
  if (texts.length === 0) return "No description provided.";
  return texts.join("\n");
}
