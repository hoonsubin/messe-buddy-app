// Markdown → HTML for assistant chat messages. The model (policy-assistant)
// often replies with markdown (lists, bold, headings); render it properly.
//
// SECURITY NOTE: marked does not sanitize. Output is treated as trusted because
// it originates from our own server-side, document-grounded LiteLLM model — not
// from user input (user messages are rendered as plain text). Before exposing
// this to untrusted model output, add DOMPurify around renderMarkdown().
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(src: string): string {
  const html = marked.parse(src, { async: false }) as string;
  // Open links in a new tab and harden against tab-nabbing.
  return html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}
