import {
  DEFAULT_BOT_COPY,
  mergeBotCopy,
  type BotCopyConfig,
} from "@hmray/shared";

let cachedCopy: BotCopyConfig = mergeBotCopy(DEFAULT_BOT_COPY);
let botMaintenanceMode = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function getBotCopy(): BotCopyConfig {
  return cachedCopy;
}

export function isBotMaintenanceMode(): boolean {
  return botMaintenanceMode;
}

export function applyRuntimeConfig(data: {
  botCopy?: Partial<BotCopyConfig> | null;
  botMaintenanceMode?: boolean;
}): void {
  if (data.botCopy !== undefined) {
    cachedCopy = mergeBotCopy(data.botCopy);
  }
  if (typeof data.botMaintenanceMode === "boolean") {
    botMaintenanceMode = data.botMaintenanceMode;
  }
}

async function fetchRuntimeConfig(
  apiBaseUrl: string,
  secret: string,
): Promise<void> {
  try {
    const res = await fetch(`${apiBaseUrl}/bot/runtime-config`, {
      headers: { "X-Bot-Secret": secret },
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      botCopy?: Partial<BotCopyConfig> | null;
      botMaintenanceMode?: boolean;
    };
    applyRuntimeConfig(data);
  } catch (err) {
    console.warn("[hmray-bot] runtime-config poll failed:", err);
  }
}

/** Poll `/bot/runtime-config` every 30s so admin copy edits take effect without restart. */
export function startCopyPolling(apiBaseUrl: string, secret: string): void {
  void fetchRuntimeConfig(apiBaseUrl, secret);
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void fetchRuntimeConfig(apiBaseUrl, secret);
  }, 30_000);
}
