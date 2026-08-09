import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { loadEnv } from "@hmray/config";

export const env = loadEnv();

/** Shared BullMQ/ioredis connection. `maxRetriesPerRequest: null` is required by BullMQ. */
export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

/** Must match `NOTIFICATIONS_QUEUE` in `apps/api/src/modules/notifications/notifications.constants.ts`. */
export const NOTIFICATIONS_QUEUE = "hmray-notifications";

/** Dedicated queue that carries the repeatable quote-expiry sweep. */
export const QUOTE_EXPIRY_QUEUE = "hmray-quote-expiry";

/**
 * Job names the API enqueues on `NOTIFICATIONS_QUEUE`.
 * Mirrors `JOB` in `apps/api/src/modules/notifications/notifications.constants.ts`.
 */
export const JOB = {
  TELEGRAM_USER: "telegram.user",
  TELEGRAM_ADMIN: "telegram.admin",
  BROADCAST_SEND: "broadcast.send",
  TEST: "test",
} as const;

export type JobName = (typeof JOB)[keyof typeof JOB];

/** Envelope the API enqueues: `queue.add(type, { type, payload })`. */
export interface NotificationJob<T = Record<string, unknown>> {
  type: JobName | string;
  payload: T;
}

export const QUOTE_EXPIRY_JOB_NAME = "sweep";
const QUOTE_EXPIRY_JOB_ID = "quote-expiry-cron";
const QUOTE_EXPIRY_INTERVAL_MS = 60_000;

export const quoteExpiryQueue = new Queue(QUOTE_EXPIRY_QUEUE, { connection });

/** Used to (re-)enqueue Telegram delivery jobs from the quote-expiry sweep, same as the API. */
export const notificationsQueue = new Queue<NotificationJob>(NOTIFICATIONS_QUEUE, { connection });

/** Idempotent: re-adding the same repeatable jobId on every boot does not duplicate it. */
export async function scheduleQuoteExpirySweep(): Promise<void> {
  await quoteExpiryQueue.add(
    QUOTE_EXPIRY_JOB_NAME,
    {},
    {
      jobId: QUOTE_EXPIRY_JOB_ID,
      repeat: { every: QUOTE_EXPIRY_INTERVAL_MS },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  );
}

export async function closeQueues(): Promise<void> {
  await Promise.all([quoteExpiryQueue.close(), notificationsQueue.close()]);
}
