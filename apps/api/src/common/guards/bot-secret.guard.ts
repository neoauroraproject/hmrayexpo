import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { AppConfigService } from "../config/app-config.service";
import { FA } from "../errors/messages";

/**
 * Guards every `/api/bot/*` route. The Telegram bot process is trusted only
 * because it can present `BOT_INTERNAL_SECRET`; there is no per-customer JWT.
 */
@Injectable()
export class BotSecretGuard implements CanActivate {
  private readonly logger = new Logger(BotSecretGuard.name);

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.botInternalSecret;
    if (!expected) {
      this.logger.error("BOT_INTERNAL_SECRET is not set — rejecting all /api/bot requests.");
      throw new UnauthorizedException(FA.BOT_SECRET_MISSING);
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers["x-bot-secret"];
    const provided = Array.isArray(header) ? header[0] : header;

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException(FA.BOT_SECRET_INVALID);
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
