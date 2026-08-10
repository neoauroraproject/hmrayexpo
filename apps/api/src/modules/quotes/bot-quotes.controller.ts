import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { BotQuoteActorDto } from "./dto/quote.dto";
import { QuotesService } from "./quotes.service";

@Controller("bot/quotes")
@UseGuards(BotSecretGuard)
export class BotQuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post(":codeOrToken/accept")
  @HttpCode(HttpStatus.OK)
  accept(@Param("codeOrToken") codeOrToken: string, @Body() dto: BotQuoteActorDto) {
    return this.quotes.confirmForTelegramUser(codeOrToken, dto.telegramUserId);
  }

  @Post(":codeOrToken/reject")
  @HttpCode(HttpStatus.OK)
  reject(@Param("codeOrToken") codeOrToken: string, @Body() dto: BotQuoteActorDto) {
    return this.quotes.rejectForTelegramUser(codeOrToken, dto.telegramUserId, dto.reason);
  }
}
