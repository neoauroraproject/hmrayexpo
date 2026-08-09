import { OrderStatus } from "@hmray/database";

/**
 * The fulfillment pipeline from docs/domain.md. A request can never jump
 * straight to a purchase: an Order only exists after an accepted quote, and
 * PURCHASED additionally requires a CONFIRMED payment (see OrdersService).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PURCHASING, OrderStatus.CANCELLED],
  [OrderStatus.PURCHASING]: [OrderStatus.PURCHASED, OrderStatus.CANCELLED],
  [OrderStatus.PURCHASED]: [OrderStatus.IN_TRANSIT_TO_OMAN],
  [OrderStatus.IN_TRANSIT_TO_OMAN]: [OrderStatus.ARRIVED_OMAN],
  [OrderStatus.ARRIVED_OMAN]: [OrderStatus.QUALITY_CHECK],
  [OrderStatus.QUALITY_CHECK]: [OrderStatus.READY_FOR_IRAN],
  [OrderStatus.READY_FOR_IRAN]: [OrderStatus.SHIPPING_TO_IRAN],
  [OrderStatus.SHIPPING_TO_IRAN]: [OrderStatus.ARRIVED_IRAN],
  [OrderStatus.ARRIVED_IRAN]: [OrderStatus.DOMESTIC_DELIVERY],
  [OrderStatus.DOMESTIC_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURN_PROCESSING, OrderStatus.DELIVERED],
  [OrderStatus.RETURN_PROCESSING]: [OrderStatus.REFUND_PENDING, OrderStatus.DELIVERED],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Statuses that mean "money has been spent with the supplier". */
export const PURCHASE_STATUSES: OrderStatus[] = [
  OrderStatus.PURCHASING,
  OrderStatus.PURCHASED,
];

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
