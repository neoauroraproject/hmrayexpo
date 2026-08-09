import { BadRequestException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { FA } from "../errors/messages";

/** Parses a Telegram user id (arrives as a JSON string to survive 64-bit ids). */
export function toTelegramId(value: string | number | bigint): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException(FA.INVALID_INPUT);
  }
}

/** Unguessable token for public quote links. */
export function publicToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Retries a code generator until it produces a value not already taken.
 * Public codes are short random strings, so collisions are rare but possible.
 */
export async function uniqueCode(
  generate: () => string,
  exists: (code: string) => Promise<boolean>,
  attempts = 12,
): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const code = generate();
    if (!(await exists(code))) {
      return code;
    }
  }
  throw new Error("Could not allocate a unique public code after several attempts");
}

export function serializeBigInt(value: bigint | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toString();
}
