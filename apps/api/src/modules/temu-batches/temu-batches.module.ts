import { Module } from "@nestjs/common";
import { TemuBatchesController } from "./temu-batches.controller";
import { TemuBatchesService } from "./temu-batches.service";

@Module({
  controllers: [TemuBatchesController],
  providers: [TemuBatchesService],
  exports: [TemuBatchesService],
})
export class TemuBatchesModule {}
