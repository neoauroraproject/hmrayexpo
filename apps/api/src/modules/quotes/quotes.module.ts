import { Module } from "@nestjs/common";
import { BotQuotesController } from "./bot-quotes.controller";
import {
  PublicQuotesController,
  QuotesController,
  RequestQuotesController,
} from "./quotes.controller";
import { QuotesService } from "./quotes.service";

@Module({
  controllers: [
    RequestQuotesController,
    QuotesController,
    PublicQuotesController,
    BotQuotesController,
  ],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
