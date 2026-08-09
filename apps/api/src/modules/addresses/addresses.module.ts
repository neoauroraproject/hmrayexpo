import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { AddressesController } from "./addresses.controller";

@Module({
  imports: [CustomersModule],
  controllers: [AddressesController],
})
export class AddressesModule {}
