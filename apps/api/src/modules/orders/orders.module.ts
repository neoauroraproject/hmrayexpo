import { Module } from "@nestjs/common";
import { QuotesModule } from "../quotes/quotes.module";
import { OrdersController, PublicOrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [QuotesModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
