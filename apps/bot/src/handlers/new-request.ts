import type { Bot } from "grammy";
import type { ApiClient, BotRequestItem } from "../api-client.js";
import * as L from "../copy.js";
import { collectingKeyboard, itemDeleteInlineKeyboard, mainMenuKeyboard, requestTypeInlineKeyboard } from "../menus.js";
import { downloadTelegramFile } from "../telegram-files.js";
import type { BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";

const URL_REGEX = /https?:\/\/\S+/i;

function extractUrl(text: string): string | undefined {
  const match = text.match(URL_REGEX);
  return match?.[0];
}

function noteWithoutUrl(text: string, url: string | undefined): string | undefined {
  if (!url) return text.trim() || undefined;
  const rest = text.replace(url, "").trim();
  return rest.length > 0 ? rest : undefined;
}

async function openRequest(
  ctx: BotContext,
  api: ApiClient,
  type: "TEMU" | "EXTERNAL_STORE",
  storeName?: string,
): Promise<void> {
  const telegramUserId = requireTelegramUserId(ctx);
  if (!telegramUserId) return;

  try {
    const request = await api.createRequest({ telegramUserId, type, storeName });
    ctx.session.mode = "collecting_request";
    ctx.session.openRequestId = request.id;
    ctx.session.openRequestCode = request.code;
    ctx.session.openRequestType = type;
    ctx.session.openRequestItemCount = 0;

    await ctx.reply(L.REQUEST_OPENED_FIRST_ITEM, { reply_markup: collectingKeyboard() });
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
}

export function registerNewRequestHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.hears(L.BTN_NEW_REQUEST, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    await ctx.reply(L.CHOOSE_REQUEST_TYPE, { reply_markup: requestTypeInlineKeyboard() });
  });

  bot.callbackQuery("newreq:temu", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    await openRequest(ctx, api, "TEMU");
  });

  bot.callbackQuery("newreq:external", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    ctx.session.mode = "awaiting_store_name";
    await ctx.reply(L.ASK_STORE_NAME);
  });

  bot.callbackQuery(/^req:continue:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const requestId = ctx.match[1];
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;

    try {
      const list = await api.listMyRequests(telegramUserId, 1, 50);
      const found = list.items.find((request) => request.id === requestId);
      if (!found) {
        await ctx.reply(L.ERROR_NOT_FOUND);
        return;
      }
      ctx.session.mode = "collecting_request";
      ctx.session.openRequestId = found.id;
      ctx.session.openRequestCode = found.code;
      ctx.session.openRequestType = found.type as "TEMU" | "EXTERNAL_STORE";
      ctx.session.openRequestItemCount = found.items.length;
      await ctx.reply(L.REQUEST_OPENED_FIRST_ITEM, { reply_markup: collectingKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.hears(L.BTN_FINALIZE, async (ctx, next) => {
    if (ctx.session.mode !== "collecting_request") {
      await next();
      return;
    }
    const telegramUserId = requireTelegramUserId(ctx);
    const requestId = ctx.session.openRequestId;
    if (!telegramUserId || !requestId) return;

    try {
      const finalized = await api.finalizeRequest(requestId, telegramUserId);
      ctx.session.mode = "idle";
      ctx.session.openRequestId = undefined;
      ctx.session.openRequestCode = undefined;
      ctx.session.openRequestType = undefined;
      ctx.session.openRequestItemCount = 0;
      await ctx.reply(L.requestFinalized(finalized.code), { reply_markup: mainMenuKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.hears(L.BTN_DELETE_ITEM, async (ctx, next) => {
    if (ctx.session.mode !== "collecting_request") {
      await next();
      return;
    }
    const telegramUserId = requireTelegramUserId(ctx);
    const requestId = ctx.session.openRequestId;
    if (!telegramUserId || !requestId) return;

    try {
      const list = await api.listMyRequests(telegramUserId, 1, 50);
      const found = list.items.find((request) => request.id === requestId);
      const items = found?.items ?? [];
      if (items.length === 0) {
        await ctx.reply(L.NO_ITEMS_TO_DELETE);
        return;
      }
      await ctx.reply(L.CHOOSE_ITEM_TO_DELETE, { reply_markup: itemDeleteInlineKeyboard(items) });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery(/^item:del:([^:]+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [, itemId, displayIndexRaw] = ctx.match;
    const telegramUserId = requireTelegramUserId(ctx);
    const requestId = ctx.session.openRequestId;
    if (!telegramUserId || !requestId) return;

    try {
      await api.removeRequestItem(requestId, itemId, telegramUserId);
      ctx.session.openRequestItemCount = Math.max(0, ctx.session.openRequestItemCount - 1);
      await ctx.reply(L.itemDeleted(Number(displayIndexRaw)), {
        reply_markup: collectingKeyboard(),
      });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_store_name",
    async (ctx) => {
      const storeName = ctx.message.text.trim();
      await openRequest(ctx, api, "EXTERNAL_STORE", storeName === L.BTN_SKIP ? undefined : storeName);
    },
  );

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "collecting_request",
    (ctx) => handleCollectingText(ctx, api),
  );

  bot.on("message:photo").filter(
    (ctx) => ctx.session.mode === "collecting_request",
    (ctx) => handleCollectingPhoto(ctx, api),
  );
}

async function handleCollectingText(ctx: BotContext, api: ApiClient): Promise<void> {
  const telegramUserId = requireTelegramUserId(ctx);
  const requestId = ctx.session.openRequestId;
  if (!telegramUserId || !requestId || !ctx.message?.text) return;

  const text = ctx.message.text;
  const url = extractUrl(text);
  if (!url) {
    await ctx.reply(L.ITEM_SOURCE_NEEDED);
    return;
  }
  const userNote = noteWithoutUrl(text, url);

  try {
    const item: BotRequestItem = await api.addRequestItem(requestId, {
      telegramUserId,
      originalUrl: url,
      userNote,
      telegramMessageId: String(ctx.message.message_id),
    });
    await ackItemAdded(ctx, item.displayIndex);
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
}

async function handleCollectingPhoto(ctx: BotContext, api: ApiClient): Promise<void> {
  const telegramUserId = requireTelegramUserId(ctx);
  const requestId = ctx.session.openRequestId;
  const botToken = ctx.api.token;
  if (!telegramUserId || !requestId || !ctx.message?.photo) return;

  const photos = ctx.message.photo;
  const best = photos[photos.length - 1];

  try {
    const { buffer, filename } = await downloadTelegramFile(ctx.api, botToken, best.file_id);
    const uploaded = await api.uploadBotFile(buffer, filename, "image/jpeg");
    const item = await api.addRequestItem(requestId, {
      telegramUserId,
      images: [uploaded.url],
      userNote: ctx.message.caption?.trim() || undefined,
      telegramMessageId: String(ctx.message.message_id),
    });
    await ackItemAdded(ctx, item.displayIndex);
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
}

/**
 * First item gets the friendly "we got it, we'll send prices separately" ack;
 * every item after that is just a one-line confirmation — enough feedback
 * without nagging "next product?" after every message.
 */
async function ackItemAdded(ctx: BotContext, displayIndex: number): Promise<void> {
  const isFirst = ctx.session.openRequestItemCount === 0;
  ctx.session.openRequestItemCount += 1;
  await ctx.reply(isFirst ? L.FIRST_ITEM_ACK : L.itemAdded(displayIndex));
}
