import type { Bot } from "grammy";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { addressesInlineKeyboard, cancelOnlyKeyboard, mainMenuKeyboard } from "../menus.js";
import { ADDRESS_FIELD_ORDER, type AddressField, type BotContext } from "../types.js";
import { isBusy, requireTelegramUserId, sayBusy } from "./guards.js";

const FIELD_PROMPTS: Record<AddressField, string> = {
  recipientName: L.ADDRESS_ASK_RECIPIENT,
  mobile: L.ADDRESS_ASK_MOBILE,
  province: L.ADDRESS_ASK_PROVINCE,
  city: L.ADDRESS_ASK_CITY,
  address: L.ADDRESS_ASK_FULL,
  postalCode: L.ADDRESS_ASK_POSTAL_CODE,
};

function validateField(field: AddressField, value: string): string | undefined {
  if (field === "mobile" && value.replace(/\D/g, "").length < 8) return L.ADDRESS_INVALID_MOBILE;
  if (field === "postalCode" && value.replace(/\D/g, "").length < 5) return L.ADDRESS_INVALID_POSTAL;
  if (field === "recipientName" && value.length < 2) return L.ADDRESS_INVALID_TOO_SHORT;
  if (field === "address" && value.length < 5) return L.ADDRESS_INVALID_TOO_SHORT;
  if ((field === "province" || field === "city") && value.length < 1) return L.ADDRESS_INVALID_TOO_SHORT;
  return undefined;
}

async function promptNextField(ctx: BotContext): Promise<void> {
  const field = ADDRESS_FIELD_ORDER[ctx.session.addressFieldIndex];
  await ctx.reply(FIELD_PROMPTS[field], { reply_markup: cancelOnlyKeyboard() });
}

export function registerAddressesHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.hears(L.BTN_MY_ADDRESSES, async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    const telegramUserId = requireTelegramUserId(ctx);
    if (!telegramUserId) return;

    try {
      const addresses = await api.listAddresses(telegramUserId);
      if (addresses.length === 0) {
        await ctx.reply(L.ADDRESSES_EMPTY, { reply_markup: addressesInlineKeyboard() });
        return;
      }
      await ctx.reply(L.ADDRESSES_TITLE);
      for (const address of addresses) {
        await ctx.reply(L.addressSummary(address));
      }
      await ctx.reply(L.BTN_ADD_ADDRESS, { reply_markup: addressesInlineKeyboard() });
    } catch (err) {
      await ctx.reply(L.friendlyError(err));
    }
  });

  bot.callbackQuery("addr:add", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    ctx.session.mode = "awaiting_address_field";
    ctx.session.addressDraft = {};
    ctx.session.addressFieldIndex = 0;
    await promptNextField(ctx);
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_address_field",
    async (ctx) => {
      const field = ADDRESS_FIELD_ORDER[ctx.session.addressFieldIndex];
      const value = ctx.message.text.trim();

      const error = validateField(field, value);
      if (error) {
        await ctx.reply(error);
        return;
      }

      ctx.session.addressDraft = { ...ctx.session.addressDraft, [field]: value };
      ctx.session.addressFieldIndex += 1;

      if (ctx.session.addressFieldIndex < ADDRESS_FIELD_ORDER.length) {
        await promptNextField(ctx);
        return;
      }

      const telegramUserId = requireTelegramUserId(ctx);
      const draft = ctx.session.addressDraft;
      if (!telegramUserId || !draft?.recipientName || !draft.mobile || !draft.province ||
        !draft.city || !draft.address || !draft.postalCode) {
        await ctx.reply(L.ERROR_GENERIC, { reply_markup: mainMenuKeyboard() });
        ctx.session.mode = "idle";
        return;
      }

      try {
        await api.createAddress({
          telegramUserId,
          recipientName: draft.recipientName,
          mobile: draft.mobile,
          province: draft.province,
          city: draft.city,
          address: draft.address,
          postalCode: draft.postalCode,
        });
        ctx.session.mode = "idle";
        ctx.session.addressDraft = undefined;
        ctx.session.addressFieldIndex = 0;
        await ctx.reply(L.ADDRESS_SAVED, { reply_markup: mainMenuKeyboard() });
      } catch (err) {
        await ctx.reply(L.friendlyError(err));
      }
    },
  );
}
