import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Roles } from "../../common/decorators/roles.decorator";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminRole } from "@hmray/database";
import {
  imageUploadOptions,
  publicUploadPath,
} from "../../common/uploads/multer.options";

const GENERAL_DIR = "files";

@Controller()
export class UploadsController {
  @Post("admin/uploads")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(
    AdminRole.OWNER,
    AdminRole.ADMIN,
    AdminRole.SUPPORT,
    AdminRole.FINANCE,
    AdminRole.OPERATOR,
  )
  @UseInterceptors(FileInterceptor("file", imageUploadOptions(GENERAL_DIR)))
  adminUpload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("فایل ارسال نشده است.");
    }
    return {
      url: publicUploadPath(GENERAL_DIR, file.filename),
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post("admin/uploads/multiple")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(
    AdminRole.OWNER,
    AdminRole.ADMIN,
    AdminRole.SUPPORT,
    AdminRole.FINANCE,
    AdminRole.OPERATOR,
  )
  @UseInterceptors(FilesInterceptor("files", 10, imageUploadOptions(GENERAL_DIR)))
  adminUploadMany(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException("فایلی ارسال نشده است.");
    }
    return {
      files: files.map((file) => ({
        url: publicUploadPath(GENERAL_DIR, file.filename),
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      })),
    };
  }

  @Post("bot/uploads")
  @UseGuards(BotSecretGuard)
  @UseInterceptors(FileInterceptor("file", imageUploadOptions(GENERAL_DIR)))
  botUpload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("فایل ارسال نشده است.");
    }
    return {
      url: publicUploadPath(GENERAL_DIR, file.filename),
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
