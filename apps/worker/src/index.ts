import { Worker, type Job } from "bullmq";
import { prisma } from "@hmray/database";
import {
  connection,
  NOTIFICATIONS_QUEUE,
  QUOTE_EXPIRY_QUEUE,
  scheduleQuoteExpirySweep,
  closeQueues,
  type NotificationJob,
} from "./queues.js";
import { processNotificationJob } from "./processors/notifications.js";
import { runQuoteExpirySweep } from "./processors/quote-expiry.js";
import { createLogger } from "./logger.js";

const logger = createLogger("worker");

const notificationsWorker = new Worker<NotificationJob>(
  NOTIFICATIONS_QUEUE,
  async (job: Job<NotificationJob>) => processNotificationJob(job),
  { connection, concurrency: 5 },
);

const quoteExpiryWorker = new Worker(
  QUOTE_EXPIRY_QUEUE,
  async () => runQuoteExpirySweep(),
  { connection, concurrency: 1 },
);

notificationsWorker.on("completed", (job) => {
  logger.info(`Notification job completed`, { jobId: job.id, name: job.name });
});
notificationsWorker.on("failed", (job, err) => {
  logger.error(`Notification job failed: ${err.message}`, { jobId: job?.id, name: job?.name });
});
notificationsWorker.on("error", (err) => {
  logger.error(`Notifications worker error: ${err.message}`);
});

quoteExpiryWorker.on("completed", (job, result: unknown) => {
  const expired = (result as { expired?: number } | undefined)?.expired ?? 0;
  if (expired > 0) {
    logger.info(`Quote-expiry sweep completed`, { jobId: job.id, expired });
  }
});
quoteExpiryWorker.on("failed", (job, err) => {
  logger.error(`Quote-expiry sweep failed: ${err.message}`, { jobId: job?.id });
});
quoteExpiryWorker.on("error", (err) => {
  logger.error(`Quote-expiry worker error: ${err.message}`);
});

async function main(): Promise<void> {
  await Promise.all([notificationsWorker.waitUntilReady(), quoteExpiryWorker.waitUntilReady()]);
  await scheduleQuoteExpirySweep();
  logger.info("HMRAY worker ready", {
    queues: [NOTIFICATIONS_QUEUE, QUOTE_EXPIRY_QUEUE],
  });
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal} — shutting down gracefully`);

  try {
    await Promise.all([notificationsWorker.close(), quoteExpiryWorker.close()]);
    await closeQueues();
    await connection.quit();
    await prisma.$disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${(error as Error).message}`);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled rejection: ${(reason as Error)?.message ?? String(reason)}`);
});

main().catch((error) => {
  logger.error(`Failed to start worker: ${(error as Error).message}`);
  process.exit(1);
});
