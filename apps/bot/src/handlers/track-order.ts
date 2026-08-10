import type { Bot } from "grammy";
import type { ApiClient } from "../api-client.js";
import * as L from "../copy.js";
import { orderStatusLabel, requestStatusLabel } from "../format.js";
import { matchMenu } from "../match-menu.js";
import { cancelOnlyKeyboard, mainMenuKeyboard } from "../menus.js";
import type { BotContext } from "../types.js";
import type { OrderStatus, RequestStatus } from "@hmray/types";
import { isBusy, sayBusy } from "./guards.js";

export function registerTrackOrderHandlers(bot: Bot<BotContext>, api: ApiClient): void {
  bot.on("message:text").filter(matchMenu("trackOrder"), async (ctx) => {
    if (isBusy(ctx)) {
      await sayBusy(ctx);
      return;
    }
    ctx.session.mode = "awaiting_order_code";
    await ctx.reply(L.ASK_ORDER_CODE, { reply_markup: cancelOnlyKeyboard() });
  });

  bot.on("message:text").filter(
    (ctx) => ctx.session.mode === "awaiting_order_code",
    async (ctx) => {
      const code = ctx.message.text.trim();
      try {
        const track = await api.getPublicTrack(code);
        ctx.session.mode = "idle";
        await ctx.reply(
          L.trackSummary({
            trackingCode: track.trackingCode,
            requestStatusLabel: requestStatusLabel(
              track.request.status as RequestStatus,
              track.request.submittedAt,
            ),
            itemCount: track.request.items.length,
            orderCode: track.order?.code ?? null,
            orderStatusLabel: track.order
              ? orderStatusLabel(track.order.status as OrderStatus)
              : null,
            trackingUrl: track.trackingUrl ?? null,
          }),
          { reply_markup: mainMenuKeyboard() },
        );
      } catch (err) {
        const apiErr = err as { status?: number };
        if (apiErr?.status === 404) {
          await ctx.reply(L.ORDER_NOT_FOUND);
          return;
        }
        await ctx.reply(L.friendlyError(err));
      }
    },
  );
}
