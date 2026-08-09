import { BadRequestException } from "@nestjs/common";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { diskStorage } from "multer";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function uploadRoot(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || "./uploads";
  return resolve(process.cwd(), raw);
}

export function ensureUploadSubdir(subdir: string): string {
  const dir = join(uploadRoot(), subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeExt(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return ".bin";
}

export function publicUploadPath(subdir: string, filename: string): string {
  return `/uploads/${subdir}/${filename}`;
}

export function imageUploadOptions(subdir: string): MulterOptions {
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? DEFAULT_MAX_BYTES);
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        try {
          cb(null, ensureUploadSubdir(subdir));
        } catch (err) {
          cb(err as Error, "");
        }
      },
      filename: (_req, file, cb) => {
        const name = `${Date.now()}-${randomBytes(8).toString("hex")}${sanitizeExt(file.originalname)}`;
        cb(null, name);
      },
    }),
    limits: { fileSize: Number.isFinite(maxBytes) ? maxBytes : DEFAULT_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        cb(new BadRequestException("فقط تصویر JPEG/PNG/WebP/GIF مجاز است.") as unknown as null, false);
        return;
      }
      cb(null, true);
    },
  };
}
