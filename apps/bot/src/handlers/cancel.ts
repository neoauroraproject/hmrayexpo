import type { Bot } from "grammy";
import * as L from "../copy.js";
import { mainMenuKeyboard } from "../menus.js";
import { initialSession, type BotContext } from "../types.js";

/**
 * Single "انصراف" button shared by every wizard (new request, address,
 * support ticket, payment receipt, order tracking). What it does depends on
 * `ctx.session.mode` at the time it's pressed.
 */
export function registerCancelHandler(bot: Bot<BotContext>): void {
  bot.hears(L.BTN_CANCEL, async (ctx) => {
    const mode = ctx.session.mode;

    if (mode === "idle") {
      await ctx.reply(L.BACK_TO_MENU, { reply_markup: mainMenuKeyboard() });
      return;
    }

    if (mode === "collecting_request" || mode === "awaiting_store_name") {
      Object.assign(ctx.session, initialSession());
      await ctx.reply(L.REQUEST_CANCELLED_DRAFT, { reply_markup: mainMenuKeyboard() });
      return;
    }

    Object.assign(ctx.session, initialSession());
    await ctx.reply(L.CANCELLED_GENERIC, { reply_markup: mainMenuKeyboard() });
  });
}
