import { InlineKeyboard, Keyboard } from "grammy";
import * as L from "./copy.js";

export function mainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text(L.BTN_NEW_REQUEST)
    .text(L.BTN_MY_REQUESTS)
    .row()
    .text(L.BTN_TRACK_ORDER)
    .text(L.BTN_MY_ADDRESSES)
    .row()
    .text(L.BTN_PAYMENTS)
    .text(L.BTN_RULES)
    .row()
    .text(L.BTN_SUPPORT)
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
  return new InlineKeyboard()
    .text(L.BTN_TEMU, "newreq:temu")
    .row()
    .text(L.BTN_EXTERNAL, "newreq:external");
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
