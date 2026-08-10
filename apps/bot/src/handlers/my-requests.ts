import type { Bot } from "grammy";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { requestStatusLabel, quoteStatusLabel } from "../format.js";
import { matchMenu } from "../match-menu.js";
import {
  cancelRequestConfirmKeyboard,
  requestActionsInlineKeyboard,
} from "../menus.js";
import type { BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";
import type { QuoteStatus, RequestStatus } from "@hmray/types";

export function registerMyRequestsHandler(bot: Bot<BotContext>, api: ApiClient): void {
  bot.on("message:text").filter(matchMenu("myRequests"), async (ctx) => {
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

        await ctx.reply(text, {
          parse_mode: "HTML",
          reply_markup: requestActionsInlineKeyboard({
            code: request.code,
            requestId: request.id,
            trackingUrl: request.trackingUrl,
            isDraft,
            canCancel: Boolean(request.canCancel),
          }),
        });
      }
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery(/^req:cancel:(?!yes:|no:)(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const requestId = ctx.match[1];
    await ctx.reply(L.CANCEL_REQUEST_CONFIRM, {
      reply_markup: cancelRequestConfirmKeyboard(requestId),
    });
  });

  bot.callbackQuery(/^req:cancel:yes:(.+)$/, async (ctx) => {
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) {
      await ctx.answerCallbackQuery({ text: "ابتدا /start بزنید" });
      return;
    }
    const requestId = ctx.match[1];
    try {
      const cancelled = await api.cancelRequest(requestId, telegramUserId);
      await ctx.answerCallbackQuery({ text: "لغو شد" });
      await ctx.editMessageText(L.requestCancelled(cancelled.code), { parse_mode: "HTML" }).catch(
        async () => {
          await ctx.reply(L.requestCancelled(cancelled.code), { parse_mode: "HTML" });
        },
      );
    } catch (err) {
      await ctx.answerCallbackQuery({ text: L.friendlyError(err).slice(0, 180), show_alert: true });
    }
  });

  bot.callbackQuery(/^req:cancel:no:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "باشه" });
    await ctx.editMessageText(L.CANCEL_REQUEST_ABORTED).catch(async () => {
      await ctx.reply(L.CANCEL_REQUEST_ABORTED);
    });
  });
}
