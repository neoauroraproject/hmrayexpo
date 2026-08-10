import {
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RequestStatus,
  TicketStatus,
} from "@hmray/types";

const REQUEST_STATUS_FA: Record<RequestStatus, string> = {
  [RequestStatus.REQUESTED]: "در حال بررسی",
  [RequestStatus.UNDER_REVIEW]: "در حال بررسی توسط تیم",
  [RequestStatus.QUOTED]: "قیمت‌گذاری‌شده",
  [RequestStatus.EXPIRED]: "منقضی‌شده",
  [RequestStatus.CANCELLED]: "لغوشده",
};

export function requestStatusLabel(status: RequestStatus, submittedAt: string | null): string {
  if (status === RequestStatus.REQUESTED && !submittedAt) {
    return "پیش‌نویس — ثبت نهایی نشده";
  }
  return REQUEST_STATUS_FA[status] ?? status;
}

const QUOTE_STATUS_FA: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: "در حال آماده‌سازی",
  [QuoteStatus.SENT]: "ارسال‌شده — منتظر تأیید توئه",
  [QuoteStatus.ACCEPTED]: "تأییدشده — منتظر پرداخت",
  [QuoteStatus.REJECTED]: "ردشده",
  [QuoteStatus.EXPIRED]: "منقضی‌شده",
  [QuoteStatus.SUPERSEDED]: "نسخه جدیدتری داره",
};

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_FA[status] ?? status;
}

const ORDER_STATUS_FA: Record<OrderStatus, string> = {
  [OrderStatus.CONFIRMED]: "ثبت‌شده",
  [OrderStatus.PAID]: "پرداخت‌شده",
  [OrderStatus.PURCHASING]: "در حال خرید",
  [OrderStatus.PURCHASED]: "خریداری‌شده",
  [OrderStatus.IN_TRANSIT_TO_OMAN]: "در مسیر عمان",
  [OrderStatus.ARRIVED_OMAN]: "رسیده به عمان",
  [OrderStatus.QUALITY_CHECK]: "در حال بازرسی کیفیت",
  [OrderStatus.READY_FOR_IRAN]: "آماده ارسال به ایران",
  [OrderStatus.SHIPPING_TO_IRAN]: "در مسیر ایران",
  [OrderStatus.ARRIVED_IRAN]: "رسیده به ایران",
  [OrderStatus.DOMESTIC_DELIVERY]: "در حال ارسال داخلی",
  [OrderStatus.DELIVERED]: "تحویل‌شده",
  [OrderStatus.CANCELLED]: "لغوشده",
  [OrderStatus.RETURN_REQUESTED]: "درخواست مرجوعی ثبت‌شده",
  [OrderStatus.RETURN_PROCESSING]: "در حال بررسی مرجوعی",
  [OrderStatus.REFUND_PENDING]: "در انتظار استرداد وجه",
  [OrderStatus.REFUNDED]: "وجه برگشت داده‌شده",
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_FA[status] ?? status;
}

const TICKET_STATUS_FA: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "باز",
  [TicketStatus.PENDING]: "در حال پیگیری",
  [TicketStatus.RESOLVED]: "حل‌شده",
  [TicketStatus.CLOSED]: "بسته‌شده",
};

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_FA[status] ?? status;
}

const PAYMENT_STATUS_FA: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "در انتظار بررسی",
  [PaymentStatus.UNDER_REVIEW]: "در حال بررسی",
  [PaymentStatus.CONFIRMED]: "تأییدشده",
  [PaymentStatus.REJECTED]: "ردشده",
  [PaymentStatus.REFUNDED]: "برگشت‌داده‌شده",
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_FA[status] ?? status;
}

/** Renders an ISO date using the Persian calendar, e.g. "۱۴۰۵/۰۵/۱۸". */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("fa-IR").format(new Date(iso));
  } catch {
    return "-";
  }
}
