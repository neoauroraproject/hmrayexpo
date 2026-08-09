export interface PageArgs {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export function pageArgs(page?: number, pageSize?: number): PageArgs {
  const safePage = Math.max(1, Math.trunc(page ?? 1));
  const safeSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  return {
    page: safePage,
    pageSize: safeSize,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  };
}

export function paginated<T>(items: T[], total: number, args: PageArgs): Paginated<T> {
  return {
    items,
    total,
    page: args.page,
    pageSize: args.pageSize,
    pageCount: Math.max(1, Math.ceil(total / args.pageSize)),
  };
}
