import { Module } from "@nestjs/common";
import {
  PublicQuotesController,
  QuotesController,
  RequestQuotesController,
} from "./quotes.controller";
import { QuotesService } from "./quotes.service";

@Module({
  controllers: [RequestQuotesController, QuotesController, PublicQuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
