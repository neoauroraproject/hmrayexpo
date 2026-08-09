import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsRangeDto } from "./dto/analytics.dto";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.FINANCE)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  summary(@Query() query: AnalyticsRangeDto) {
    return this.analytics.summary(query);
  }
}
