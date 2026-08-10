import { InlineKeyboard, Keyboard } from "grammy";
import { ADMIN_COPY } from "./admin-copy.js";
import * as L from "./copy.js";
import { getBotCopy } from "./runtime-copy.js";

export function mainMenuKeyboard(): Keyboard {
  const menus = getBotCopy().menus;
  return new Keyboard()
    .text(menus.newRequest)
    .text(menus.myRequests)
    .row()
    .text(menus.trackOrder)
    .text(menus.myAddresses)
    .row()
    .text(menus.payments)
    .text(menus.rules)
    .row()
    .text(menus.support)
    .resized();
}

export function adminMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text(ADMIN_COPY.summaryTitle)
    .text(ADMIN_COPY.broadcasts)
    .row()
    .text(ADMIN_COPY.pendingPayments)
    .text(ADMIN_COPY.newRequests)
    .row()
    .text(ADMIN_COPY.customerMenu)
    .resized();
}

export function collectingKeyboard(): Keyboard {
  return new Keyboard()
    .text(L.BTN_FINALIZE)
    .row()
    .text(L.BTN_DELETE_ITEM)
    .text(L.BTN_CANCEL)
    .resized();
}

export function cancelOnlyKeyboard(): Keyboard {
  return new Keyboard().text(L.BTN_CANCEL).resized();
}

export function requestTypeInlineKeyboard(): InlineKeyboard {
  const { services } = getBotCopy();
  const keyboard = new InlineKeyboard();
  if (services.temuEnabled) {
    keyboard.text(services.temu, "newreq:temu");
  }
  if (services.externalEnabled) {
    if (services.temuEnabled) keyboard.row();
    keyboard.text(services.external, "newreq:external");
  }
  return keyboard;
}

export function channelGateInlineKeyboard(
  channels: Array<{ name: string; username: string; inviteLink: string | null }>,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const channel of channels) {
    const url = channel.inviteLink ?? `https://t.me/${channel.username}`;
    keyboard.url(`عضویت در ${channel.name}`, url).row();
  }
  keyboard.text("✅ عضو شدم", "channels:check");
  return keyboard;
}

export function itemDeleteInlineKeyboard(
  items: Array<{ id: string; displayIndex: number }>,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  items.forEach((item, index) => {
    keyboard.text(
      `#${String(item.displayIndex).padStart(2, "0")}`,
      `item:del:${item.id}:${item.displayIndex}`,
    );
    if ((index + 1) % 4 === 0) keyboard.row();
  });
  return keyboard;
}

export function itemNoteInlineKeyboard(itemId: string): InlineKeyboard {
  return new InlineKeyboard().text(L.BTN_ADD_ITEM_NOTE, `item:note:${itemId}`);
}

export function continueDraftInlineKeyboard(requestId: string): InlineKeyboard {
  return new InlineKeyboard().text("ادامه این درخواست", `req:continue:${requestId}`);
}

export function yesNoInlineKeyboard(yesData: string, noData: string): InlineKeyboard {
  return new InlineKeyboard().text(L.SUPPORT_YES, yesData).text(L.SUPPORT_NO, noData);
}

export function addressesInlineKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(L.BTN_ADD_ADDRESS, "addr:add");
}

export function paymentsInlineKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(L.BTN_SEND_RECEIPT, "pay:receipt:start");
}
