import { createServer } from "node:http";
import { Bot, webhookCallback } from "grammy";
import { ApiClient } from "./api-client.js";
import { loadBotEnvBase, resolveBotEnv } from "./env.js";
import { registerAddressesHandlers } from "./handlers/addresses.js";
import { registerCancelHandler } from "./handlers/cancel.js";
import { registerFallbackHandlers } from "./handlers/fallback.js";
import { registerMyRequestsHandler } from "./handlers/my-requests.js";
import { registerNewRequestHandlers } from "./handlers/new-request.js";
import { registerPaymentsHandlers } from "./handlers/payments.js";
import { registerRulesHandler } from "./handlers/rules.js";
import { registerStartHandler } from "./handlers/start.js";
import { registerSupportHandlers } from "./handlers/support.js";
import { registerTrackOrderHandlers } from "./handlers/track-order.js";
import { createSessionMiddleware } from "./session.js";
import type { BotContext } from "./types.js";

async function main(): Promise<void> {
  loadBotEnvBase();
  const env = await resolveBotEnv();
  const api = new ApiClient(env.apiBaseUrl, env.botInternalSecret);

  const bot = new Bot<BotContext>(env.telegramBotToken);
  bot.use(createSessionMiddleware(env.redisUrl));

  // Registration order matters: exact-text/`hears` handlers and command
  // handlers run first, mode-gated free-text/photo handlers run next inside
  // each `register*` call, and the fallback handlers (registered last) catch
  // anything nothing else claimed.
  registerStartHandler(bot, api);
  registerCancelHandler(bot);
  registerNewRequestHandlers(bot, api);
  registerMyRequestsHandler(bot, api);
  registerTrackOrderHandlers(bot, api);
  registerAddressesHandlers(bot, api);
  registerPaymentsHandlers(bot, api);
  registerRulesHandler(bot);
  registerSupportHandlers(bot, api);
  registerFallbackHandlers(bot);

  bot.catch((error) => {
    console.error(`Bot error while handling update ${error.ctx.update.update_id}:`, error.error);
  });

  if (env.botMode === "webhook" && env.webhookUrl) {
    await bot.init();
    await bot.api.setWebhook(env.webhookUrl, {
      secret_token: env.webhookSecretToken,
    });

    const handleUpdate = webhookCallback(bot, "http", {
      secretToken: env.webhookSecretToken,
    });

    const server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }
      handleUpdate(req, res).catch((err) => {
        console.error("Webhook handling error:", err);
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
    });

    server.listen(env.webhookPort, () => {
      console.log(
        `HMRAY Bot listening for webhooks on :${env.webhookPort} (registered ${env.webhookUrl})`,
      );
    });
    return;
  }

  console.log("HMRAY Bot starting in long-polling mode…");
  await bot.start({
    onStart: (info) => {
      console.log(`HMRAY Bot ready as @${info.username}`);
    },
  });
}

main().catch((err) => {
  console.error("Fatal error starting the bot:", err);
  process.exit(1);
});
