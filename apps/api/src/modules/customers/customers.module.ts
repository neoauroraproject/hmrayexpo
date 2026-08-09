import { Module } from "@nestjs/common";
import { BotUsersController } from "./bot-users.controller";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  controllers: [CustomersController, BotUsersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
