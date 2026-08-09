import type { Bot } from "grammy";
import * as L from "../copy.js";
import { matchMenu } from "../match-menu.js";
import { getBotCopy } from "../runtime-copy.js";
import type { BotContext } from "../types.js";
import { isBusy, sayBusy } from "./guards.js";

export function registerRulesHandler(bot: Bot<BotContext>): void {
  bot.on("message:text").filter(matchMenu("rules"), async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    await ctx.reply(getBotCopy().rulesText || L.RULES_TEXT);
  });
}
