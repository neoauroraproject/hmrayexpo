import type { BotCopyMenus } from "@hmray/shared";
import { getBotCopy } from "./runtime-copy.js";
import type { BotContext } from "./types.js";

/** Match a reply-keyboard press against the current (possibly admin-edited) menu label. */
export function matchMenu(key: keyof BotCopyMenus) {
  return (ctx: BotContext): boolean => {
    const text = ctx.message?.text;
    if (!text) return false;
    return text === getBotCopy().menus[key];
  };
}
