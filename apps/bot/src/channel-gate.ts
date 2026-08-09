import type { ApiClient, RequiredChannel } from "./api-client.js";
import * as L from "./copy.js";
import { channelGateInlineKeyboard } from "./menus.js";
import { getBotCopy } from "./runtime-copy.js";
import type { BotContext } from "./types.js";

const MEMBER_STATUSES = new Set(["creator", "administrator", "member", "restricted"]);

async function isMember(ctx: BotContext, username: string, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(`@${username}`, userId);
    return MEMBER_STATUSES.has(member.status);
  } catch {
    // Bot isn't an admin of the channel, or the channel is unreachable —
    // don't block the customer over a misconfiguration.
    return true;
  }
}

/**
 * Checks the required-channel gate and, if the customer is missing any,
 * sends the join prompt and returns `false`. Callers should stop processing
 * the current update when this returns `false`.
 */
export async function ensureChannelMembership(
  ctx: BotContext,
  api: ApiClient,
): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return true;

  let channels: RequiredChannel[];
  try {
    channels = await api.listRequiredChannels();
  } catch {
    // If the public endpoint is down, don't lock everyone out of the bot.
    return true;
  }

  const required = channels.filter((channel) => channel.required);
  if (required.length === 0) {
    ctx.session.channelsVerified = true;
    return true;
  }

  const missing: RequiredChannel[] = [];
  for (const channel of required) {
    const member = await isMember(ctx, channel.username, userId);
    if (!member) missing.push(channel);
  }

  if (missing.length === 0) {
    ctx.session.channelsVerified = true;
    return true;
  }

  ctx.session.channelsVerified = false;
  await ctx.reply(getBotCopy().channelGateMessage || L.CHANNEL_GATE_MESSAGE, {
    reply_markup: channelGateInlineKeyboard(missing),
  });
  return false;
}
