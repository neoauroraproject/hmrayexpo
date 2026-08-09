import { Module } from "@nestjs/common";
import {
  PaymentMethodsAdminController,
  PaymentMethodsPublicController,
} from "./payment-methods.controller";

@Module({
  controllers: [PaymentMethodsAdminController, PaymentMethodsPublicController],
})
export class PaymentMethodsModule {}
