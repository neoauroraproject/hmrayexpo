import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),

  REDIS_URL: z.string().url().or(z.string().startsWith("redis://")),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),

  TELEGRAM_BOT_TOKEN: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().min(1).optional(),
  ),
  ADMIN_TELEGRAM_CHAT_ID: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),

  PORT: z.coerce.number().int().positive().default(4000),
  PANEL_PORT: z.coerce.number().int().positive().default(3000),
  WORKER_PORT: z.coerce.number().int().positive().default(4001),

  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  ADMIN_PUBLIC_URL: z.string().url().default("http://localhost:3000"),

  DOMAIN: z.string().optional(),
  ACME_EMAIL: z.string().email().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parse and validate process.env; throws on invalid config */
export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    throw new Error(
      `Invalid environment configuration:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }
  return result.data;
}

/** Parse env without throwing — returns null on failure */
export function tryLoadEnv(env: NodeJS.ProcessEnv = process.env): Env | null {
  const result = EnvSchema.safeParse(env);
  return result.success ? result.data : null;
}
