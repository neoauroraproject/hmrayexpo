/**
 * Light Markdown → Telegram HTML for admin-editable bot copy.
 * Supports: [label](https://...), **bold**, ### headings, real paragraphs.
 *
 * Important: Telegram HTML only allows a small tag set. Use `<br>` (not `<br/>`).
 */

export function normalizeBotCopyNewlines(source: string): string {
  let text = String(source ?? "")
    .replace(/\u0000/g, "")
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

  const links: Array<{ label: string; url: string }> = [];
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const token = `§§L${links.length}§§`;
      links.push({ label, url });
      return token;
    },
  );

  text = escapeHtml(text);
  // Headings while newlines still exist
  text = text.replace(/^###\s+(.+)$/gm, "<b>$1</b>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  // Telegram HTML: only `<br>` is documented (self-closing slash can break parse)
  text = text.replace(/\n/g, "<br>");
  text = text.replace(/§§L(\d+)§§/g, (_m, index: string) => {
    const link = links[Number(index)];
    if (!link) return "";
    return `<a href="${escapeAttr(link.url)}">${escapeHtml(link.label)}</a>`;
  });
  return text;
}

/** Prefer legacy flag — widely supported and avoids entity parse surprises. */
export const NO_LINK_PREVIEW = {
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
