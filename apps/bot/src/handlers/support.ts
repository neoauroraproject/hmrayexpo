import type { Bot } from "grammy";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { cancelOnlyKeyboard, mainMenuKeyboard, yesNoInlineKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";

export function registerSupportHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.hears(L.BTN_SUPPORT, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    ctx.session.ticketOrderCode = undefined;
    await ctx.reply(L.SUPPORT_ASK_HAS_ORDER, {
      reply_markup: yesNoInlineKeyboard("support:order:yes", "support:order:no"),
    });
  });

  bot.callbackQuery("support:order:yes", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.mode = "awaiting_ticket_order_code";
    await ctx.reply(L.SUPPORT_ASK_ORDER_CODE, { reply_markup: cancelOnlyKeyboard() });
  });

  bot.callbackQuery("support:order:no", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.mode = "awaiting_ticket_body";
    await ctx.reply(L.SUPPORT_ASK_BODY, { reply_markup: cancelOnlyKeyboard() });
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_ticket_order_code",
    async (ctx) => {
      ctx.session.ticketOrderCode = ctx.message.text.trim();
      ctx.session.mode = "awaiting_ticket_body";
      await ctx.reply(L.SUPPORT_ASK_BODY, { reply_markup: cancelOnlyKeyboard() });
    },
  );

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_ticket_body",
    async (ctx) => {
      const telegramUserId = requireTelegramUserId(ctx);
      if (!telegramUserId) return;

      try {
        await api.createTicket({
          telegramUserId,
          body: ctx.message.text.trim(),
          order: ctx.session.ticketOrderCode,
        });
        ctx.session.mode = "idle";
        ctx.session.ticketOrderCode = undefined;
        await ctx.reply(L.SUPPORT_TICKET_CREATED, { reply_markup: mainMenuKeyboard() });
      } catch (err) {
        await ctx.reply(L.friendlyError(err));
      }
    },
  );
}
