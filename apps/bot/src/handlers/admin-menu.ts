import type { Bot } from "grammy";
import { ADMIN_COPY } from "../admin-copy.js";
import { isAdminTelegramUser } from "../admin-gate.js";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { adminMenuKeyboard, mainMenuKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";
import { requireTelegramUserId } from "./guards.js";

function matchAdmin(text: string) {
  return (ctx: BotContext): boolean => ctx.message?.text === text;
}

function panelBaseUrl(apiPanelUrl?: string | null): string {
  return (
    apiPanelUrl ||
    process.env.ADMIN_PUBLIC_URL ||
    process.env.PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");
}

export function registerAdminMenuHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.on("message:text").filter(matchAdmin(ADMIN_COPY.summaryTitle), async (ctx) => {
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;
    if (!(await isAdminTelegramUser(api, telegramUserId))) {
      await ctx.reply(ADMIN_COPY.notAdmin);
      return;
    }
    try {
      const summary = await api.getAdminSummary(telegramUserId);
      const lines = [
        "📊 خلاصه وضعیت HMRAY",
        "",
        `🆕 درخواست‌های جدید: ${summary.pendingRequests}`,
        `🧾 پرداخت‌های در انتظار: ${summary.pendingPayments}`,
        `🎫 تیکت‌های باز: ${summary.openTickets}`,
        `📢 پیش‌نویس پیام همگانی: ${summary.draftBroadcasts}`,
      ];
      if (summary.panelUrl) {
        lines.push("", `پنل: ${summary.panelUrl}`);
      }
      await ctx.reply(lines.join("\n"), { reply_markup: adminMenuKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.on("message:text").filter(matchAdmin(ADMIN_COPY.broadcasts), async (ctx) => {
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;
    if (!(await isAdminTelegramUser(api, telegramUserId))) {
      await ctx.reply(ADMIN_COPY.notAdmin);
      return;
    }
    try {
      const summary = await api.getAdminSummary(telegramUserId);
      const url = `${panelBaseUrl(summary.panelUrl)}/broadcasts`;
      await ctx.reply(ADMIN_COPY.panelHint(url), { reply_markup: adminMenuKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.on("message:text").filter(matchAdmin(ADMIN_COPY.pendingPayments), async (ctx) => {
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;
    if (!(await isAdminTelegramUser(api, telegramUserId))) {
      await ctx.reply(ADMIN_COPY.notAdmin);
      return;
    }
    try {
      const summary = await api.getAdminSummary(telegramUserId);
      const url = summary.links?.payments ?? `${panelBaseUrl(summary.panelUrl)}/payments`;
      await ctx.reply(
        [`پرداخت‌های در انتظار: ${summary.pendingPayments}`, "", ADMIN_COPY.panelHint(url)].join(
          "\n",
        ),
        { reply_markup: adminMenuKeyboard() },
      );
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.on("message:text").filter(matchAdmin(ADMIN_COPY.newRequests), async (ctx) => {
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;
    if (!(await isAdminTelegramUser(api, telegramUserId))) {
      await ctx.reply(ADMIN_COPY.notAdmin);
      return;
    }
    try {
      const summary = await api.getAdminSummary(telegramUserId);
      const url = summary.links?.requests ?? `${panelBaseUrl(summary.panelUrl)}/requests`;
      await ctx.reply(
        [`درخواست‌های جدید: ${summary.pendingRequests}`, "", ADMIN_COPY.panelHint(url)].join("\n"),
        { reply_markup: adminMenuKeyboard() },
      );
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.on("message:text").filter(matchAdmin(ADMIN_COPY.customerMenu), async (ctx) => {
    await ctx.reply("منوی مشتری:", { reply_markup: mainMenuKeyboard() });
  });
}
