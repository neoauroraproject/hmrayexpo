/** Queue consumed by `apps/worker`. */
export const NOTIFICATIONS_QUEUE = "hmray-notifications";

/** Job names on the notifications queue. */
export const JOB = {
  /** Direct message to a customer's Telegram chat. */
  TELEGRAM_USER: "telegram.user",
  /** Message to the admin group chat. */
  TELEGRAM_ADMIN: "telegram.admin",
  /** One chunk of a broadcast: the worker fans it out with its own rate limit. */
  BROADCAST_SEND: "broadcast.send",
  /** Connectivity smoke test triggered from settings. */
  TEST: "test",
} as const;

export type JobName = (typeof JOB)[keyof typeof JOB];

export interface NotificationJob<T = Record<string, unknown>> {
  type: JobName | string;
  payload: T;
}
