import { Module } from "@nestjs/common";
import {
  OrderReturnsController,
  RefundsController,
  ReturnsController,
} from "./returns.controller";
import { ReturnsService } from "./returns.service";

@Module({
  controllers: [ReturnsController, RefundsController, OrderReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
