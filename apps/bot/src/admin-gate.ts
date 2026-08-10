import type { ApiClient } from "./api-client.js";

export async function isAdminTelegramUser(
  api: ApiClient,
  telegramUserId: string,
): Promise<boolean> {
  try {
    const me = await api.getAdminMe(telegramUserId);
    return Boolean(me.isAdmin);
  } catch {
    return false;
  }
}
