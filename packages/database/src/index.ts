import { PrismaClient } from "@prisma/client";

// Reuse one client across HMR / worker reloads in development.
const globalForPrisma = globalThis as unknown as { hmrayPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.hmrayPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hmrayPrisma = prisma;
}

export * from "@prisma/client";
