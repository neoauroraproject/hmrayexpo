import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { BotSupportController, SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [CustomersModule],
  controllers: [SupportController, BotSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
