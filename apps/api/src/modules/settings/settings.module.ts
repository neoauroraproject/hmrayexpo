import { Global, Module } from "@nestjs/common";
import { BotAdminController } from "./bot-admin.controller";
import { BotRuntimeController } from "./bot-runtime.controller";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Global()
@Module({
  controllers: [SettingsController, BotRuntimeController, BotAdminController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
