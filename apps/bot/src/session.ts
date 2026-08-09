import { MemorySessionStorage, session, type StorageAdapter } from "grammy";
import { Redis } from "ioredis";
import { initialSession, type BotContext, type SessionData } from "./types.js";

const REDIS_KEY_PREFIX = "hmray:bot:session:";

function createRedisStorage(redisUrl: string): StorageAdapter<SessionData> {
  const client = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 });
  client.on("error", (err: Error) => {
    console.error("Redis session store error:", err.message);
  });

  return {
    async read(key) {
      const raw = await client.get(REDIS_KEY_PREFIX + key);
      return raw ? (JSON.parse(raw) as SessionData) : undefined;
    },
    async write(key, value) {
      await client.set(REDIS_KEY_PREFIX + key, JSON.stringify(value));
    },
    async delete(key) {
      await client.del(REDIS_KEY_PREFIX + key);
    },
  };
}

/**
 * Session is keyed per-chat (grammY default). Falls back to an in-memory
 * store — fine for local dev, but state is lost on restart — and switches to
 * Redis automatically when `REDIS_URL` is configured, so multiple bot
 * instances/restarts share the same open-request state.
 */
export function createSessionMiddleware(redisUrl?: string) {
  const storage: StorageAdapter<SessionData> = redisUrl
    ? createRedisStorage(redisUrl)
    : new MemorySessionStorage<SessionData>();

  return session<SessionData, BotContext>({
    initial: initialSession,
    storage,
  });
}
