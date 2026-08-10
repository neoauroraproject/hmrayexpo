import type { Bot } from "grammy";
import { ApiError, type ApiClient, type QuoteAcceptResult } from "../api-client.js";
import * as L from "../copy.js";
import { mainMenuKeyboard, paymentsInlineKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";
import { requireTelegramUserId } from "./guards.js";

function formatPaymentPackage(result: QuoteAcceptResult): string {
  const lines = [
    `✅ پیش‌فاکتور ${result.quoteCode} تأیید شد.`,
    "",
    `مبلغ قابل پرداخت: ${result.amountDueLabel}`,
    "",
    "روش‌های پرداخت:",
  ];

  for (const method of result.paymentMethods ?? []) {
    lines.push("", `• ${method.title}`);
    if (method.accountOrWallet) lines.push(`  حساب/کیف: ${method.accountOrWallet}`);
    if (method.network) lines.push(`  شبکه: ${method.network}`);
    if (method.instructions) lines.push(`  ${method.instructions}`);
  }

  lines.push(
    "",
    "از منوی «پرداخت‌ها» رسید را بفرست، یا جزئیات را در لینک زیر ببین:",
  );
  if (result.url) lines.push(result.url);

  return lines.join("\n");
}

function quoteCallbackError(err: unknown): string {
  if (err instanceof ApiError) {
    const raw = typeof err.raw === "object" && err.raw && "message" in err.raw
      ? String((err.raw as { message: unknown }).message)
      : err.message;
    if (
      raw.includes("قبلاً تأیید") ||
      err.message.includes("قبلاً تأیید") ||
      err.status === 409
    ) {
      if (raw.includes("رد") || err.message.includes("رد")) {
        return "این پیش‌فاکتور قبلاً رد شده است.";
      }
      return "این پیش‌فاکتور قبلاً تأیید شده است.";
    }
    if (raw.includes("منقضی") || err.message.includes("منقضی") || err.status === 410) {
      return "مهلت این پیش‌فاکتور به پایان رسیده است.";
    }
    if (raw.includes("متعلق") || err.message.includes("متعلق") || err.status === 403) {
      return "این پیش‌فاکتور متعلق به شما نیست.";
    }
    return err.message || L.friendlyError(err);
  }
  return L.friendlyError(err);
}

export function registerQuoteHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.callbackQuery(/^quote:accept:(.+)$/, async (ctx) => {
    const token = ctx.match[1];
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId || !token) {
      await ctx.answerCallbackQuery({ text: "خطا" });
      return;
    }

    try {
      const result = await api.acceptQuote(token, telegramUserId);
      await ctx.answerCallbackQuery({ text: "تأیید شد" });
      await ctx.reply(formatPaymentPackage(result), {
        reply_markup: paymentsInlineKeyboard(),
      });
    } catch (err) {
      const text = quoteCallbackError(err);
      await ctx.answerCallbackQuery({ text: text.slice(0, 180) });
      await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
    }
  });

  bot.callbackQuery(/^quote:reject:(.+)$/, async (ctx) => {
    const token = ctx.match[1];
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId || !token) {
      await ctx.answerCallbackQuery({ text: "خطا" });
      return;
    }

    try {
      const result = await api.rejectQuote(token, telegramUserId);
      await ctx.answerCallbackQuery({ text: "رد شد" });
      await ctx.reply(
        `❌ پیش‌فاکتور ${result.quoteCode} رد شد.\nاگر نیاز داشتی، از منو درخواست جدید ثبت کن.`,
        { reply_markup: mainMenuKeyboard() },
      );
    } catch (err) {
      const text = quoteCallbackError(err);
      await ctx.answerCallbackQuery({ text: text.slice(0, 180) });
      await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
    }
  });
}
