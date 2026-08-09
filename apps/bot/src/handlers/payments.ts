import type { Bot } from "grammy";
import { QuoteStatus } from "@hmray/types";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { quoteStatusLabel } from "../format.js";
import { cancelOnlyKeyboard, mainMenuKeyboard, paymentsInlineKeyboard } from "../menus.js";
import { downloadTelegramFile } from "../telegram-files.js";
import type { BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";

const AWAITING_PAYMENT_STATUSES = new Set<string>([QuoteStatus.SENT, QuoteStatus.ACCEPTED]);
const PAYMENT_ID_PATTERN = /^P-[A-Za-z0-9]+$/i;

export function registerPaymentsHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.hears(L.BTN_PAYMENTS, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;

    try {
      const list = await api.listMyRequests(telegramUserId, 1, 20);
      const pendingQuotes = list.items.flatMap((request) => request.quotes ?? []).filter((quote) =>
        AWAITING_PAYMENT_STATUSES.has(quote.status),
      );

      await ctx.reply(L.PAYMENTS_MENU_INTRO);

      if (pendingQuotes.length === 0) {
        await ctx.reply(L.PENDING_QUOTES_EMPTY, { reply_markup: paymentsInlineKeyboard() });
        return;
      }

      await ctx.reply(L.PENDING_QUOTES_TITLE);
      for (const quote of pendingQuotes) {
        await ctx.reply(
          L.quoteLine({
            code: quote.code,
            statusLabel: quoteStatusLabel(quote.status as QuoteStatus),
            url: quote.url,
          }),
        );
      }
      await ctx.reply(L.BTN_SEND_RECEIPT, { reply_markup: paymentsInlineKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery("pay:receipt:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    ctx.session.mode = "awaiting_payment_id";
    await ctx.reply(L.ASK_PAYMENT_ID, { reply_markup: cancelOnlyKeyboard() });
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_payment_id",
    async (ctx) => {
      const paymentId = ctx.message.text.trim();
      if (!PAYMENT_ID_PATTERN.test(paymentId)) {
        await ctx.reply(L.PAYMENT_ID_INVALID);
        return;
      }
      ctx.session.paymentId = paymentId;
      ctx.session.mode = "awaiting_payment_receipt";
      await ctx.reply(L.ASK_PAYMENT_RECEIPT, { reply_markup: cancelOnlyKeyboard() });
    },
  );

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_payment_receipt",
    async (ctx) => {
      await ctx.reply(L.ASK_PAYMENT_RECEIPT, { reply_markup: cancelOnlyKeyboard() });
    },
  );

  bot.on("message:photo").filter(
    (ctx) => ctx.session.mode === "awaiting_payment_receipt",
    async (ctx) => {
      const telegramUserId = requireTelegramUserId(ctx);
      const paymentId = ctx.session.paymentId;
      const botToken = ctx.api.token;
      if (!telegramUserId || !paymentId) return;

      const photos = ctx.message.photo;
      const best = photos[photos.length - 1];

      try {
        const { buffer, filename } = await downloadTelegramFile(ctx.api, botToken, best.file_id);
        await api.uploadPaymentReceipt(paymentId, buffer, filename, "image/jpeg", {
          telegramUserId,
          telegramMessageId: String(ctx.message.message_id),
          telegramChatId: String(ctx.chat.id),
        });
        ctx.session.mode = "idle";
        ctx.session.paymentId = undefined;
        await ctx.reply(L.RECEIPT_UPLOADED, { reply_markup: mainMenuKeyboard() });
      } catch (err) {
        await ctx.reply(L.friendlyError(err));
      }
    },
  );
}
