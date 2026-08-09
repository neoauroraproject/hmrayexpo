import type { Api } from "grammy";

/** Downloads a Telegram-hosted file (by `file_id`) into a Buffer. */
export async function downloadTelegramFile(
  api: Api,
  botToken: string,
  fileId: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const file = await api.getFile(fileId);
  if (!file.file_path) {
    throw new Error("Telegram did not return a file_path for this file_id.");
  }
  const url = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download Telegram file (HTTP ${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const filename = file.file_path.split("/").pop() ?? `${fileId}.jpg`;
  return { buffer: Buffer.from(arrayBuffer), filename };
}
