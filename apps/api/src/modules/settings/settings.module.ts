import { Global, Module } from "@nestjs/common";
import { BotRuntimeController } from "./bot-runtime.controller";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Global()
@Module({
  controllers: [SettingsController, BotRuntimeController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
