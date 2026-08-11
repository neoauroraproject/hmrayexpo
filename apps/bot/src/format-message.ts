/**
 * Light Markdown → Telegram HTML for admin-editable bot copy.
 * Supports: [label](https://...), **bold**, ### headings, real paragraphs.
 */

export function normalizeBotCopyNewlines(source: string): string {
  let text = String(source ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Literal "\n" sequences sometimes appear after bad paste/escape
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "\n");

  const newlineCount = (text.match(/\n/g) ?? []).length;
  // Old single-line saves (from <input>) collapsed paragraphs — recover structure.
  if (newlineCount < 2 && (/###/.test(text) || /💡|💰/.test(text))) {
    text = text
      .replace(/\s*###\s+/g, "\n\n### ")
      .replace(/\s+(?=💡|💰)/g, "\n\n")
      // Collapse runs of spaces/tabs only — keep newlines
      .replace(/[^\S\n]{2,}/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return text.trim();
}

export function formatBotHtml(source: string): string {
  let text = normalizeBotCopyNewlines(source);

  const links: string[] = [];
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const token = `\u0000L${links.length}\u0000`;
      links.push(`<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`);
      return token;
    },
  );

  text = escapeHtml(text);
  // Headings while newlines still exist
  text = text.replace(/^###\s+(.+)$/gm, "<b>$1</b>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  // Explicit <br/> keeps paragraphs reliably in Telegram HTML mode
  text = text.replace(/\n/g, "<br/>");
  text = text.replace(/\u0000L(\d+)\u0000/g, (_m, index: string) => links[Number(index)] ?? "");
  return text;
}

export const NO_LINK_PREVIEW = {
  link_preview_options: { is_disabled: true },
  disable_web_page_preview: true,
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
