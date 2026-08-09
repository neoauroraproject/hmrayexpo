import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminRole } from "@hmray/database";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { imageUploadOptions, publicUploadPath } from "../../common/uploads/multer.options";
import { FA } from "../../common/errors/messages";
import { PaymentsService } from "./payments.service";
import {
  CreateManualPaymentDto,
  CreateQuotePaymentDto,
  ListPaymentsQueryDto,
  RejectPaymentDto,
  UploadReceiptDto,
} from "./dto/payment.dto";

const RECEIPTS_DIR = "receipts";

@Controller("public/quotes")
export class PublicQuotePaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Accepts JSON or multipart with an optional `receipt` image. */
  @Post(":codeOrToken/payments")
  @UseInterceptors(FileInterceptor("receipt", imageUploadOptions(RECEIPTS_DIR)))
  create(
    @Param("codeOrToken") codeOrToken: string,
    @Body() dto: CreateQuotePaymentDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    const receiptUrl = receipt ? publicUploadPath(RECEIPTS_DIR, receipt.filename) : null;
    return this.payments.createForQuote(codeOrToken, dto, receiptUrl);
  }
}

@Controller("bot/payments")
@UseGuards(BotSecretGuard)
export class BotPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(":id/receipt")
  @UseInterceptors(FileInterceptor("receipt", imageUploadOptions(RECEIPTS_DIR)))
  upload(
    @Param("id") id: string,
    @Body() dto: UploadReceiptDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    if (!receipt) {
      throw new BadRequestException(FA.UPLOAD_REQUIRED);
    }
    return this.payments.uploadReceipt(id, dto, publicUploadPath(RECEIPTS_DIR, receipt.filename));
  }
}

@Controller("admin/payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@Query() query: ListPaymentsQueryDto) {
    return this.payments.list(query);
  }

  @Post()
  @Roles(AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT)
  create(
    @Body() dto: CreateManualPaymentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.payments.createManual(dto, admin, context);
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @Roles(AdminRole.ADMIN, AdminRole.FINANCE)
  confirm(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.payments.confirm(id, admin, context);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @Roles(AdminRole.ADMIN, AdminRole.FINANCE)
  reject(
    @Param("id") id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.payments.reject(id, dto, admin, context);
  }
}
