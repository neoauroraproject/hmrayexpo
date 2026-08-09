import { Module } from "@nestjs/common";
import { ChannelsAdminController, ChannelsPublicController } from "./channels.controller";

@Module({
  controllers: [ChannelsAdminController, ChannelsPublicController],
})
export class ChannelsModule {}
