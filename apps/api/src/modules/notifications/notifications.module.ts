import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AppConfigService } from "../../common/config/app-config.service";
import { NOTIFICATIONS_QUEUE } from "./notifications.constants";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          url: config.redisUrl,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
