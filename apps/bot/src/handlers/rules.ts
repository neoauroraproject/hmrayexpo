import type { Bot } from "grammy";
import * as L from "../copy.js";
import type { BotContext } from "../types.js";
import { isBusy, sayBusy } from "./guards.js";

export function registerRulesHandler(bot: Bot<BotContext>): void {
  bot.hears(L.BTN_RULES, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    await ctx.reply(L.RULES_TEXT);
  });
}
