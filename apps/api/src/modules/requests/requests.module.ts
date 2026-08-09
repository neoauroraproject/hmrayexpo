import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { BotRequestsController } from "./bot-requests.controller";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [CustomersModule],
  controllers: [RequestsController, BotRequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
