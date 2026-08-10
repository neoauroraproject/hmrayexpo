import * as dns from "node:dns/promises";
import * as net from "node:net";

const FETCH_TIMEOUT_MS = 4_000;
const MAX_HTML_BYTES = 384 * 1024;
const MAX_REDIRECTS = 6;

/** Prefer crawler UAs — Temu serves OG tags to these, but bot-challenge pages to browsers. */
const CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export interface LinkPreview {
  title: string | null;
  image: string | null;
}

/**
 * Best-effort OG/Twitter (and Temu share-URL) extraction for product links.
 * Never throws — returns nulls on any failure or SSRF rejection.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const parsed = parseHttpUrl(url);
    if (!parsed) return emptyPreview();

    const hop = await fetchWithRedirects(parsed.toString(), CRAWLER_UA);
    if (!hop) return emptyPreview();

    const fromQuery = imageFromUrlParams(hop.finalUrl);
    const fromHtml = hop.html ? extractPreview(hop.html, hop.finalUrl) : emptyPreview();

    return {
      title: fromHtml.title,
      image: fromHtml.image ?? fromQuery,
    };
  } catch {
    return emptyPreview();
  }
}

/** @deprecated Prefer fetchLinkPreview — kept for existing call sites. */
export async function fetchOgImage(url: string): Promise<string | null> {
  const preview = await fetchLinkPreview(url);
  return preview.image;
}

function emptyPreview(): LinkPreview {
  return { title: null, image: null };
}

async function fetchWithRedirects(
  startUrl: string,
  userAgent: string,
): Promise<{ finalUrl: URL; html: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = startUrl;
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      const parsed = parseHttpUrl(current);
      if (!parsed) return null;
      if (await isBlockedHost(parsed.hostname)) return null;

      const res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const location = res.headers.get("location");
      if (location && res.status >= 300 && res.status < 400) {
        const next = new URL(location, parsed);
        if (next.protocol !== "http:" && next.protocol !== "https:") return null;
        // Temu (and similar) put product image on the redirect target query string.
        // Prefer that fast path — avoid downloading challenge/SPA HTML when possible.
        if (imageFromUrlParams(next)) {
          // Still try one final fetch for title when cheap; if it fails, image alone is enough.
          current = next.toString();
          const titleHop = await fetchFinalHtml(current, userAgent, controller.signal);
          return {
            finalUrl: next,
            html: titleHop?.html ?? "",
          };
        }
        current = next.toString();
        continue;
      }

      if (!res.ok) return null;

      const resolvedFinal = parseHttpUrl(current) ?? parsed;
      if (await isBlockedHost(resolvedFinal.hostname)) return null;

      const html = await readLimitedText(res, MAX_HTML_BYTES);
      if (!html) return null;
      return { finalUrl: resolvedFinal, html };
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFinalHtml(
  url: string,
  userAgent: string,
  signal: AbortSignal,
): Promise<{ html: string } | null> {
  try {
    const parsed = parseHttpUrl(url);
    if (!parsed) return null;
    if (await isBlockedHost(parsed.hostname)) return null;

    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const finalHost = res.url ? new URL(res.url).hostname : parsed.hostname;
    if (await isBlockedHost(finalHost)) return null;
    const html = await readLimitedText(res, MAX_HTML_BYTES);
    return html ? { html } : null;
  } catch {
    return null;
  }
}

function extractPreview(html: string, finalUrl: URL): LinkPreview {
  const rawTitle = extractTitleMeta(html);
  const title = cleanProductTitle(rawTitle);
  const imageRef = extractImageMeta(html) ?? imageFromUrlParams(finalUrl);
  const image = imageRef ? resolveImageUrl(imageRef, finalUrl) : null;
  return { title, image };
}

function imageFromUrlParams(url: URL): string | null {
  for (const key of ["share_img", "top_gallery_url", "image", "img", "pic"]) {
    const value = url.searchParams.get(key)?.trim();
    if (value && /^https?:\/\//i.test(value) && !value.startsWith("data:")) {
      return value;
    }
  }
  return null;
}

function extractTitleMeta(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']title["']/i,
    /<title[^>]*>([^<]*)<\/title>/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    const value = match?.[1]?.trim();
    if (value) return decodeHtmlEntities(value);
  }
  return null;
}

function cleanProductTitle(raw: string | null): string | null {
  if (!raw) return null;
  let title = raw.replace(/\s+/g, " ").trim();
  title = title.replace(/\s*[-|–—]\s*Temu(\s+\w+)?\s*$/i, "").trim();
  if (!title) return null;
  if (title.length > 280) title = `${title.slice(0, 277).trim()}…`;
  return title;
}

function parseHttpUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  return parsed;
}

async function isBlockedHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  if (net.isIP(host)) {
    return isPrivateOrReservedIp(host);
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (records.length === 0) return true;
    return records.some((r) => isPrivateOrReservedIp(r.address));
  } catch {
    return true;
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (family === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe80")) return true;
    if (normalized.startsWith("ff")) return true;
    const mapped = normalized.match(/^:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped?.[1]) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }
  return true;
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string | null> {
  if (!res.body) {
    const text = await res.text();
    return text.slice(0, maxBytes);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    chunks.push(value);
  }

  const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return merged.toString("utf8");
}

function extractImageMeta(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    const value = match?.[1]?.trim();
    if (value && !value.startsWith("data:")) return decodeHtmlEntities(value);
  }
  return null;
}

function resolveImageUrl(ref: string, base: URL): string | null {
  try {
    const resolved = new URL(ref, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
