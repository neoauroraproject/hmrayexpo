import type {
  AdminRole,
  Currency,
  InspectionType,
  OrderStatus,
  PaymentSource,
  PaymentStatus,
  PurchaseMode,
  QuoteStatus,
  RequestItemStatus,
  RequestStatus,
  RequestType,
  TicketStatus,
} from "./enums.js";

/** Minimal customer snapshot for API responses */
export interface CustomerDto {
  id: string;
  customerCode: string;
  telegramUserId?: string;
  displayName?: string;
  phone?: string;
}

/** A single product line inside a purchase request */
export interface RequestItemDto {
  id: string;
  displayIndex: number;
  productCode: string;
  title?: string;
  originalUrl?: string;
  images: string[];
  status: RequestItemStatus;
  price?: string;
  currency?: Currency;
  userNote?: string;
}

/** Purchase request summary */
export interface RequestDto {
  id: string;
  code: string;
  userId: string;
  type: RequestType;
  status: RequestStatus;
  purchaseMode?: PurchaseMode;
  storeName?: string;
  items: RequestItemDto[];
  createdAt: string;
}

/** Quote line item */
export interface QuoteItemDto {
  id: string;
  displayIndex: number;
  productCode: string;
  quantity: number;
  price: string;
  currency: Currency;
  imageUrl?: string;
}

/** Quote summary */
export interface QuoteDto {
  id: string;
  code: string;
  requestId: string;
  status: QuoteStatus;
  omrRate: string;
  productsTotal: string;
  items: QuoteItemDto[];
  notes: string[];
  publicToken: string;
  expiresAt: string;
}

/** Payment record */
export interface PaymentDto {
  id: string;
  code: string;
  orderId?: string;
  quoteId?: string;
  amount: string;
  currency: Currency;
  status: PaymentStatus;
  source: PaymentSource;
  receiptUrl?: string;
  confirmedAt?: string;
}

/** Order summary */
export interface OrderDto {
  id: string;
  code: string;
  requestId: string;
  quoteId: string;
  userId: string;
  status: OrderStatus;
  inspectionType: InspectionType;
  purchaseMode: PurchaseMode;
  totalToman: string;
}

/** Support ticket summary */
export interface SupportTicketDto {
  id: string;
  code: string;
  userId: string;
  orderId?: string;
  status: TicketStatus;
  subject?: string;
  createdAt: string;
}

/** Admin user */
export interface AdminUserDto {
  id: string;
  username: string;
  email?: string;
  role: AdminRole;
  displayName: string;
}

/** Generic paginated list wrapper */
export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
