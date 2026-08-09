import type { ApiClient } from "../api-client.js";
import { ensureChannelMembership } from "../channel-gate.js";
import * as L from "../copy.js";
import { mainMenuKeyboard } from "../menus.js";
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
      await ctx.reply(L.welcome(name, result.user.customerCode), {
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
    await ctx.reply(L.CHANNEL_GATE_PASSED, { reply_markup: mainMenuKeyboard() });
  });
}
