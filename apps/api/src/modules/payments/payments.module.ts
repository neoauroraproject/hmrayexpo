import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { QuotesModule } from "../quotes/quotes.module";
import { OrdersModule } from "../orders/orders.module";
import {
  BotPaymentsController,
  PaymentsController,
  PublicQuotePaymentsController,
} from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [CustomersModule, QuotesModule, OrdersModule],
  controllers: [PaymentsController, PublicQuotePaymentsController, BotPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
