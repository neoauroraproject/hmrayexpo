/** Minimal structured console logger — swap for pino/winston later if needed. */

type LogMeta = Record<string, unknown>;

function line(level: string, scope: string, message: string, meta?: LogMeta): string {
  const ts = new Date().toISOString();
  const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] [${scope}] ${message}${suffix}`;
}

export function createLogger(scope: string) {
  return {
    info(message: string, meta?: LogMeta): void {
      console.log(line("INFO", scope, message, meta));
    },
    warn(message: string, meta?: LogMeta): void {
      console.warn(line("WARN", scope, message, meta));
    },
    error(message: string, meta?: LogMeta): void {
      console.error(line("ERROR", scope, message, meta));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
