import type { BotContext } from "../types.js";

/** True whenever the chat is in the middle of a wizard (not the idle main menu). */
export function isBusy(ctx: BotContext): boolean {
  return ctx.session.mode !== "idle";
}

export async function sayBusy(ctx: BotContext): Promise<void> {
  await ctx.reply("اول کاری که در حال انجامشی رو تموم کن یا «انصراف» رو بزن.");
}

/** Telegram ids never get shown to the user — only used as the API actor key. */
export function requireTelegramUserId(ctx: BotContext): string | undefined {
  return ctx.from ? String(ctx.from.id) : undefined;
}
