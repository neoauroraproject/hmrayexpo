/** Unwrap paginated API responses (`{ items }`) or pass through arrays. */
export function unwrapItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export function displayUserName(user?: {
  displayName?: string | null;
  customerCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  if (!user) return "—";
  if (user.displayName?.trim()) return user.displayName.trim();
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  return user.customerCode?.trim() || "—";
}
