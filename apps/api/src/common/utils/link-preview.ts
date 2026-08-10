import * as dns from "node:dns/promises";
import * as net from "node:net";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512 * 1024;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/**
 * Best-effort OG/Twitter image extraction for product URLs (e.g. Temu).
 * Never throws — returns null on any failure or SSRF rejection.
 */
export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const parsed = parseHttpUrl(url);
    if (!parsed) return null;

    if (await isBlockedHost(parsed.hostname)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!res.ok) return null;

      const finalUrl = res.url ? new URL(res.url) : parsed;
      if (await isBlockedHost(finalUrl.hostname)) return null;

      const html = await readLimitedText(res, MAX_HTML_BYTES);
      if (!html) return null;

      const imageRef = extractImageMeta(html);
      if (!imageRef) return null;

      const absolute = resolveImageUrl(imageRef, finalUrl);
      return absolute;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
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

  // Literal IP in hostname
  if (net.isIP(host)) {
    return isPrivateOrReservedIp(host);
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (records.length === 0) return true;
    return records.some((r) => isPrivateOrReservedIp(r.address));
  } catch {
    // If DNS fails, refuse to fetch (safer than guessing).
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
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (family === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe80")) return true; // link-local
    if (normalized.startsWith("ff")) return true; // multicast
    // IPv4-mapped
    const mapped = normalized.match(/^:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped?.[1]) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }
  return true;
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string | null> {
  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) {
    // Still try streaming truncate — some servers lie; don't abort solely on CL.
  }

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
