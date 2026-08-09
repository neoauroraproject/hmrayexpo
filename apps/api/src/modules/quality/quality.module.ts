import { Module } from "@nestjs/common";
import {
  OrderQualityChecksController,
  PublicQualityController,
  QualityChecksController,
} from "./quality.controller";
import { QualityService } from "./quality.service";

@Module({
  controllers: [
    OrderQualityChecksController,
    QualityChecksController,
    PublicQualityController,
  ],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
