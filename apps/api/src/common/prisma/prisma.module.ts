import { Global, Module } from "@nestjs/common";
import { prisma } from "@hmray/database";
import { PrismaLifecycle, PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [
    { provide: PrismaService, useFactory: (): PrismaService => prisma },
    PrismaLifecycle,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
