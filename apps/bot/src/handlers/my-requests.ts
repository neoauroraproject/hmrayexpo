import type { Bot } from "grammy";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { requestStatusLabel, quoteStatusLabel } from "../format.js";
import { continueDraftInlineKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";
import type { QuoteStatus, RequestStatus } from "@hmray/types";

export function registerMyRequestsHandler(bot: Bot<BotContext>, api: ApiClient): void {
  bot.hears(L.BTN_MY_REQUESTS, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;

    try {
      const list = await api.listMyRequests(telegramUserId, 1, 10);
      if (list.items.length === 0) {
        await ctx.reply(L.MY_REQUESTS_EMPTY);
        return;
      }

      await ctx.reply(L.MY_REQUESTS_TITLE);
      for (const request of list.items) {
        const isDraft = request.status === "REQUESTED" && !request.submittedAt;
        const latestQuote = request.quotes?.[0];
        const text = L.requestSummary({
          code: request.code,
          statusLabel: requestStatusLabel(request.status as RequestStatus, request.submittedAt),
          itemCount: request.items.length,
          isDraft,
          latestQuoteLine: latestQuote
            ? `پیش‌فاکتور: ${latestQuote.code} — ${quoteStatusLabel(latestQuote.status as QuoteStatus)}`
            : undefined,
        });

        if (isDraft) {
          await ctx.reply(text, { reply_markup: continueDraftInlineKeyboard(request.id) });
        } else {
          await ctx.reply(text);
        }
      }
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });
}
