import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppConfigModule } from "./common/config/config.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuditModule } from "./modules/audit/audit.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { ChannelsModule } from "./modules/channels/channels.module";
import { PaymentMethodsModule } from "./modules/payment-methods/payment-methods.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { SupportModule } from "./modules/support/support.module";
import { SearchModule } from "./modules/search/search.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { TemuBatchesModule } from "./modules/temu-batches/temu-batches.module";
import { ShippingModule } from "./modules/shipping/shipping.module";
import { QualityModule } from "./modules/quality/quality.module";
import { ReturnsModule } from "./modules/returns/returns.module";
import { BroadcastsModule } from "./modules/broadcasts/broadcasts.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";

@Module({
  imports: [
    // Global infrastructure — available to every feature module.
    AppConfigModule,
    PrismaModule,
    AuditModule,
    NotificationsModule,
    SettingsModule,
    AuthModule,
    // Feature modules, roughly in workflow order.
    CustomersModule,
    ChannelsModule,
    PaymentMethodsModule,
    AddressesModule,
    RequestsModule,
    QuotesModule,
    OrdersModule,
    PaymentsModule,
    TemuBatchesModule,
    ShippingModule,
    QualityModule,
    ReturnsModule,
    SupportModule,
    BroadcastsModule,
    SearchModule,
    DashboardModule,
    AnalyticsModule,
    UploadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
