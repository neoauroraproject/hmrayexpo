import { interpolateBotCopy } from "@hmray/shared";
import { ADMIN_COPY } from "../admin-copy.js";
import { isAdminTelegramUser } from "../admin-gate.js";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { ensureChannelMembership } from "../channel-gate.js";
import { adminMenuKeyboard, mainMenuKeyboard } from "../menus.js";
import { getBotCopy } from "../runtime-copy.js";
import { initialSession, type BotContext } from "../types.js";

export function registerStartHandler(bot: import("grammy").Bot<BotContext>, api: ApiClient): void {
  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    try {
      const result = await api.upsertUser({
        telegramUserId: String(from.id),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        language: from.language_code,
      });

      // A fresh /start always resets any in-progress wizard.
      Object.assign(ctx.session, initialSession());

      const passed = await ensureChannelMembership(ctx, api);
      if (!passed) return;

      const name = result.user.displayName ?? from.first_name ?? "دوست عزیز";
      const isAdmin = await isAdminTelegramUser(api, String(from.id));

      if (isAdmin) {
        await ctx.reply(ADMIN_COPY.welcome(name), {
          reply_markup: adminMenuKeyboard(),
        });
        return;
      }

      const copy = getBotCopy();
      const text = interpolateBotCopy(copy.welcome, {
        name,
        customerCode: result.user.customerCode,
      });
      await ctx.reply(text, {
        reply_markup: mainMenuKeyboard(),
      });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery("channels:check", async (ctx) => {
    await ctx.answerCallbackQuery();
    const passed = await ensureChannelMembership(ctx, api);
    if (!passed) {
      await ctx.reply(L.CHANNEL_GATE_STILL_MISSING);
      return;
    }
    const from = ctx.from;
    if (from && (await isAdminTelegramUser(api, String(from.id)))) {
      await ctx.reply(L.CHANNEL_GATE_PASSED, { reply_markup: adminMenuKeyboard() });
      return;
    }
    await ctx.reply(L.CHANNEL_GATE_PASSED, { reply_markup: mainMenuKeyboard() });
  });
}
