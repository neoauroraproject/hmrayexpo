import { Module } from "@nestjs/common";
import { OrderShipmentController, ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";

@Module({
  controllers: [ShippingController, OrderShipmentController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
