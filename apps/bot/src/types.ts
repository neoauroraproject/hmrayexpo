import type { Context, SessionFlavor } from "grammy";

/**
 * `mode` drives the free-text/photo router in `handlers/router.ts` — it is
 * the only piece of state that decides how the next non-command message from
 * a chat gets interpreted.
 */
export type BotMode =
  | "idle"
  | "collecting_request"
  | "awaiting_store_name"
  | "awaiting_order_code"
  | "awaiting_address_field"
  | "awaiting_ticket_order_code"
  | "awaiting_ticket_body"
  | "awaiting_payment_id"
  | "awaiting_payment_receipt";

export type AddressField =
  | "recipientName"
  | "mobile"
  | "province"
  | "city"
  | "address"
  | "postalCode";

export interface AddressDraft {
  recipientName?: string;
  mobile?: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
}

export interface SessionData {
  mode: BotMode;

  /** Open (not-yet-finalized) purchase request, while `mode === "collecting_request"`. */
  openRequestId?: string;
  openRequestCode?: string;
  openRequestType?: "TEMU" | "EXTERNAL_STORE";
  openRequestItemCount: number;

  /** Address creation wizard. */
  addressDraft?: AddressDraft;
  addressFieldIndex: number;

  /** Support ticket wizard. */
  ticketOrderCode?: string;

  /** Payment receipt flow. */
  paymentId?: string;

  /** Set once membership has been confirmed, to avoid re-checking every message. */
  channelsVerified: boolean;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function initialSession(): SessionData {
  return {
    mode: "idle",
    openRequestItemCount: 0,
    addressFieldIndex: 0,
    channelsVerified: false,
  };
}

export const ADDRESS_FIELD_ORDER: AddressField[] = [
  "recipientName",
  "mobile",
  "province",
  "city",
  "address",
  "postalCode",
];
