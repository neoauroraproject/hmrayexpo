/**
 * Light Markdown → Telegram HTML for admin-editable bot copy.
 * Supports: [label](https://...), **bold**, ### headings, newlines.
 */
export function formatBotHtml(source: string): string {
  const links: string[] = [];
  let text = source.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const token = `\u0000L${links.length}\u0000`;
      links.push(`<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`);
      return token;
    },
  );

  text = escapeHtml(text);
  text = text.replace(/^###\s+(.+)$/gm, "<b>$1</b>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  text = text.replace(/\u0000L(\d+)\u0000/g, (_m, index: string) => links[Number(index)] ?? "");
  return text;
}

export const NO_LINK_PREVIEW = {
  link_preview_options: { is_disabled: true },
  // Compatibility with older Bot API clients / libraries.
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
