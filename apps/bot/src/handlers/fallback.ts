import type { Bot } from "grammy";
import * as L from "../copy.js";
import { mainMenuKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";

/**
 * Registered last: anything that didn't match a command, exact button text,
 * or an active wizard's mode-filter falls through here.
 */
export function registerFallbackHandlers(bot: Bot<BotContext>): void {
  bot.on("message:text", async (ctx) => {
    await ctx.reply(L.UNKNOWN_COMMAND, { reply_markup: mainMenuKeyboard() });
  });

  bot.on("message:photo", async (ctx) => {
    await ctx.reply(L.ITEM_SOURCE_NEEDED, { reply_markup: mainMenuKeyboard() });
  });

  bot.on("callback_query:data", async (ctx) => {
    await ctx.answerCallbackQuery();
  });
}
