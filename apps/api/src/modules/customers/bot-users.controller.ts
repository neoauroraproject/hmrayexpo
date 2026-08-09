import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { CustomersService } from "./customers.service";
import { UpsertBotUserDto } from "./dto/upsert-bot-user.dto";

@Controller("bot/users")
@UseGuards(BotSecretGuard)
export class BotUsersController {
  constructor(private readonly customers: CustomersService) {}

  /** Called on /start — idempotent registration that allocates `HM-#####`. */
  @Post("upsert")
  upsert(@Body() dto: UpsertBotUserDto) {
    return this.customers.upsertTelegramUser(dto);
  }
}
