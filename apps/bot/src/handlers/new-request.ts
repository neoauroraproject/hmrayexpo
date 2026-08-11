import type { Bot, Context } from "grammy";
import type { ApiClient, BotRequestItem } from "../api-client.js";
import * as L from "../copy.js";
import {
  NO_LINK_PREVIEW,
  normalizeBotCopyNewlines,
} from "../format-message.js";
import { matchMenu } from "../match-menu.js";
import {
  collectingKeyboard,
  itemDeleteInlineKeyboard,
  itemNoteInlineKeyboard,
  mainMenuKeyboard,
  requestTypeInlineKeyboard,
} from "../menus.js";
import { getBotCopy } from "../runtime-copy.js";
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

/** Prefer HTML formatting; if Telegram rejects entities, fall back to plain text. */
async function replyCopy(
  ctx: Context,
  source: string,
  extra: Parameters<Context["reply"]>[1] = {},
): Promise<void> {
  const plain = normalizeBotCopyNewlines(source);
  const html = formatBotHtml(source);
  try {
    await ctx.reply(html, {
      parse_mode: "HTML",
      ...NO_LINK_PREVIEW,
      ...extra,
    });
  } catch (err) {
    console.warn("[hmray-bot] HTML reply failed, falling back to plain:", err);
    await ctx.reply(plain, {
      ...NO_LINK_PREVIEW,
      ...extra,
    });
  }
}

async function openRequest(
  ctx: BotContext,
  api: ApiClient,
  type: "TEMU" | "EXTERNAL_STORE",
  storeName?: string,
  introMessage?: string,
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
    ctx.session.noteItemId = undefined;

    const text = introMessage?.trim() || L.REQUEST_OPENED_FIRST_ITEM;
    await replyCopy(ctx, text, { reply_markup: collectingKeyboard() });
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
}

export function registerNewRequestHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.on("message:text").filter(matchMenu("newRequest"), async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    try {
      const copy = getBotCopy();
      const keyboard = requestTypeInlineKeyboard();
      if (keyboard.inline_keyboard.length === 0) {
        await ctx.reply("فعلاً هیچ سرویسی برای ثبت درخواست فعال نیست.");
        return;
      }
      await replyCopy(ctx, copy.chooseRequestType || L.CHOOSE_REQUEST_TYPE, {
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error("[hmray-bot] newRequest handler failed:", err);
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery("newreq:temu", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    const copy = getBotCopy();
    if (!copy.services.temuEnabled) {
      await ctx.reply(L.ERROR_GENERIC);
      return;
    }
    await openRequest(ctx, api, "TEMU", undefined, copy.temuStartMessage);
  });

  bot.callbackQuery("newreq:external", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    if (!getBotCopy().services.externalEnabled) {
      await ctx.reply(L.ERROR_GENERIC);
      return;
    }
    ctx.session.mode = "awaiting_store_name";
    await ctx.reply(L.ASK_STORE_NAME, { ...NO_LINK_PREVIEW });
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
      ctx.session.noteItemId = undefined;
      const copy = getBotCopy();
      const intro =
        found.type === "TEMU" ? copy.temuStartMessage : copy.externalStartMessage;
      await replyCopy(ctx, intro || L.REQUEST_OPENED_FIRST_ITEM, {
        reply_markup: collectingKeyboard(),
      });
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
      ctx.session.noteItemId = undefined;
      await ctx.reply(
        L.requestFinalized(finalized.trackingCode ?? finalized.code, finalized.trackingUrl),
        { reply_markup: mainMenuKeyboard() },
      );
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

  bot.callbackQuery(/^item:note:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const itemId = ctx.match[1];
    if (!ctx.session.openRequestId) {
      await ctx.reply(L.NO_OPEN_REQUEST);
      return;
    }
    ctx.session.mode = "awaiting_item_note";
    ctx.session.noteItemId = itemId;
    await ctx.reply(L.ASK_ITEM_NOTE, { reply_markup: collectingKeyboard() });
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_store_name",
    async (ctx) => {
      const storeName = ctx.message.text.trim();
      await openRequest(
        ctx,
        api,
        "EXTERNAL_STORE",
        storeName === L.BTN_SKIP ? undefined : storeName,
        getBotCopy().externalStartMessage,
      );
    },
  );

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_item_note",
    (ctx) => handleItemNoteText(ctx, api),
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

async function handleItemNoteText(ctx: BotContext, api: ApiClient): Promise<void> {
  const telegramUserId = requireTelegramUserId(ctx);
  const requestId = ctx.session.openRequestId;
  const itemId = ctx.session.noteItemId;
  const note = ctx.message?.text?.trim();
  if (!telegramUserId || !requestId || !itemId || !note) return;

  try {
    await api.updateRequestItemNote(requestId, itemId, {
      telegramUserId,
      userNote: note,
    });
    ctx.session.mode = "collecting_request";
    ctx.session.noteItemId = undefined;
    await ctx.reply(L.ITEM_NOTE_SAVED, { reply_markup: collectingKeyboard() });
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
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
    await ackItemAdded(ctx, item);
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
    await ackItemAdded(ctx, item);
  } catch (err) {
    await ctx.reply(L.friendlyError(err));
  }
}

/**
 * Acknowledge each collected item and keep the collecting keyboard visible
 * so the customer can send more links/photos or press finalize.
 */
async function ackItemAdded(ctx: BotContext, item: BotRequestItem): Promise<void> {
  ctx.session.openRequestItemCount += 1;
  await ctx.reply(L.itemAdded(item.displayIndex), {
    reply_markup: itemNoteInlineKeyboard(item.id),
  });
}
