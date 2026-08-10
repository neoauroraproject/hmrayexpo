/**
 * Thin fetch wrapper around the HMRAY API. Every `/bot/*` call carries the
 * `X-Bot-Secret` header the API's `BotSecretGuard` requires; `/public/*`
 * calls don't need it but sending it is harmless.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly raw?: unknown;

  constructor(message: string, status: number, raw?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}

export interface UpsertUserPayload {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  language?: string;
}

export interface UpsertUserResult {
  created: boolean;
  user: {
    id: string;
    customerCode: string;
    status: string;
    displayName: string | null;
    phone: string | null;
    telegramUserId: string | null;
    username: string | null;
  };
}

export interface RequiredChannel {
  id: string;
  name: string;
  username: string;
  inviteLink: string | null;
  required: boolean;
  sortOrder: number;
}

export interface BotRequestItem {
  id: string;
  displayIndex: number;
  productCode: string;
  originalUrl: string | null;
  images: string[];
  status: string;
  price: string | null;
  currency: string | null;
  userNote: string | null;
}

export interface BotRequestQuoteSummary {
  id: string;
  code: string;
  status: string;
  expiresAt: string;
  publicToken: string;
  url: string;
}

export interface BotRequestOrderSummary {
  id: string;
  code: string;
  status: string;
}

export interface BotRequest {
  id: string;
  code: string;
  userId: string;
  type: string;
  status: string;
  purchaseMode: string | null;
  storeName: string | null;
  submittedAt: string | null;
  createdAt: string;
  items: BotRequestItem[];
  quotes?: BotRequestQuoteSummary[];
  order?: BotRequestOrderSummary | null;
  canCancel?: boolean;
  trackingCode?: string;
  trackingUrl?: string;
}

export interface PublicTrackDto {
  trackingCode: string;
  customerCode: string | null;
  trackingUrl?: string;
  request: {
    id: string;
    code: string;
    type: string;
    status: string;
    submittedAt: string | null;
    storeName: string | null;
    items: Array<{
      displayIndex: number;
      productCode: string;
      originalUrl: string | null;
      images: string[];
      userNote: string | null;
      status: string;
    }>;
  };
  quotes: Array<{
    code: string;
    status: string;
    productsTotalLabel: string;
    url: string;
    expiresAt: string;
    acceptedAt: string | null;
  }>;
  order: null | {
    code: string;
    status: string;
    totalTomanLabel: string;
    deliveredAt: string | null;
    timeline: Array<{ toStatus: string; createdAt: string }>;
    shipment?: unknown;
  };
  payments: Array<{
    code: string;
    status: string;
    amountLabel: string;
    createdAt: string;
  }>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBotRequestPayload {
  telegramUserId: string;
  type: "TEMU" | "EXTERNAL_STORE";
  storeName?: string;
}

export interface AddRequestItemPayload {
  telegramUserId: string;
  originalUrl?: string;
  images?: string[];
  userNote?: string;
  telegramMessageId?: string;
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface AddressPayload {
  telegramUserId: string;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface AddressDto {
  id: string;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CreateTicketPayload {
  telegramUserId: string;
  subject?: string;
  order?: string;
  body: string;
}

export interface TicketDto {
  id: string;
  code: string;
  status: string;
  subject: string | null;
  createdAt: string;
}

export interface PublicOrderDto {
  code: string;
  status: string;
  totalToman: string;
  totalTomanLabel: string;
  createdAt: string;
  deliveredAt: string | null;
  items: Array<{ displayIndex: number; productCode: string; title: string | null; quantity: number }>;
}

function extractErrorMessage(data: unknown): string | undefined {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly botSecret: string,
  ) {}

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(this.baseUrl.replace(/\/$/, "") + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      json?: unknown;
      form?: FormData;
      query?: Record<string, string | number | undefined>;
    } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { "X-Bot-Secret": this.botSecret };
    let body: string | FormData | undefined;

    if (options.form) {
      body = options.form;
    } else if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.json);
    }

    let res: Response;
    try {
      res = await fetch(url, { method: options.method ?? "GET", headers, body });
    } catch (err) {
      throw new ApiError("خطای شبکه", 0, err);
    }

    const text = await res.text();
    let data: unknown;
    if (text.length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message = extractErrorMessage(data) ?? `HTTP_${res.status}`;
      throw new ApiError(message, res.status, data);
    }
    return data as T;
  }

  // ─── Users ──────────────────────────────────────────────────
  upsertUser(payload: UpsertUserPayload): Promise<UpsertUserResult> {
    return this.request("/bot/users/upsert", { method: "POST", json: payload });
  }

  // ─── Public ─────────────────────────────────────────────────
  listRequiredChannels(): Promise<RequiredChannel[]> {
    return this.request("/public/channels/required");
  }

  getPublicOrder(code: string): Promise<PublicOrderDto> {
    return this.request(`/public/orders/${encodeURIComponent(code)}`);
  }

  getPublicTrack(code: string): Promise<PublicTrackDto> {
    return this.request(`/public/track/${encodeURIComponent(code)}`);
  }

  // ─── Requests ───────────────────────────────────────────────
  createRequest(payload: CreateBotRequestPayload): Promise<BotRequest> {
    return this.request("/bot/requests", { method: "POST", json: payload });
  }

  listMyRequests(
    telegramUserId: string,
    page = 1,
    pageSize = 10,
  ): Promise<Paginated<BotRequest>> {
    return this.request("/bot/requests/mine", { query: { telegramUserId, page, pageSize } });
  }

  addRequestItem(requestId: string, payload: AddRequestItemPayload): Promise<BotRequestItem> {
    return this.request(`/bot/requests/${encodeURIComponent(requestId)}/items`, {
      method: "POST",
      json: payload,
    });
  }

  updateRequestItemNote(
    requestId: string,
    itemId: string,
    payload: { telegramUserId: string; userNote: string },
  ): Promise<BotRequestItem> {
    return this.request(
      `/bot/requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}`,
      { method: "PATCH", json: payload },
    );
  }

  removeRequestItem(
    requestId: string,
    itemId: string,
    telegramUserId: string,
  ): Promise<{ removed: boolean }> {
    return this.request(
      `/bot/requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}`,
      { method: "DELETE", query: { telegramUserId } },
    );
  }

  finalizeRequest(requestId: string, telegramUserId: string): Promise<BotRequest> {
    return this.request(`/bot/requests/${encodeURIComponent(requestId)}/finalize`, {
      method: "POST",
      json: { telegramUserId },
    });
  }

  cancelRequest(requestId: string, telegramUserId: string): Promise<BotRequest> {
    return this.request(`/bot/requests/${encodeURIComponent(requestId)}/cancel`, {
      method: "POST",
      json: { telegramUserId },
    });
  }

  // ─── Uploads ────────────────────────────────────────────────
  async uploadBotFile(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), filename);
    return this.request("/bot/uploads", { method: "POST", form });
  }

  // ─── Addresses ──────────────────────────────────────────────
  listAddresses(telegramUserId: string): Promise<AddressDto[]> {
    return this.request("/bot/addresses", { query: { telegramUserId } });
  }

  createAddress(payload: AddressPayload): Promise<AddressDto> {
    return this.request("/bot/addresses", { method: "POST", json: payload });
  }

  deleteAddress(id: string, telegramUserId: string): Promise<{ deleted: boolean }> {
    return this.request(`/bot/addresses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      query: { telegramUserId },
    });
  }

  // ─── Support ────────────────────────────────────────────────
  createTicket(payload: CreateTicketPayload): Promise<TicketDto> {
    return this.request("/bot/tickets", { method: "POST", json: payload });
  }

  listMyTickets(telegramUserId: string, page = 1, pageSize = 10): Promise<Paginated<TicketDto>> {
    return this.request("/bot/tickets/mine", { query: { telegramUserId, page, pageSize } });
  }

  // ─── Payments ───────────────────────────────────────────────
  async uploadPaymentReceipt(
    paymentId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
    meta: { telegramUserId: string; telegramMessageId?: string; telegramChatId?: string },
  ): Promise<unknown> {
    const form = new FormData();
    form.append("receipt", new Blob([buffer], { type: mimeType }), filename);
    form.append("telegramUserId", meta.telegramUserId);
    if (meta.telegramMessageId) form.append("telegramMessageId", meta.telegramMessageId);
    if (meta.telegramChatId) form.append("telegramChatId", meta.telegramChatId);
    return this.request(`/bot/payments/${encodeURIComponent(paymentId)}/receipt`, {
      method: "POST",
      form,
    });
  }

  // ─── Quotes (bot) ───────────────────────────────────────────
  acceptQuote(codeOrToken: string, telegramUserId: string): Promise<QuoteAcceptResult> {
    return this.request(`/bot/quotes/${encodeURIComponent(codeOrToken)}/accept`, {
      method: "POST",
      json: { telegramUserId },
    });
  }

  rejectQuote(
    codeOrToken: string,
    telegramUserId: string,
    reason?: string,
  ): Promise<QuoteRejectResult> {
    return this.request(`/bot/quotes/${encodeURIComponent(codeOrToken)}/reject`, {
      method: "POST",
      json: { telegramUserId, reason },
    });
  }

  // ─── Admin (bot) ────────────────────────────────────────────
  getAdminMe(telegramUserId: string): Promise<AdminMeResult> {
    return this.request("/bot/admin/me", { query: { telegramUserId } });
  }

  getAdminSummary(telegramUserId: string): Promise<AdminSummaryResult> {
    return this.request("/bot/admin/summary", { query: { telegramUserId } });
  }
}

export interface QuoteAcceptResult {
  status: string;
  awaitingPayment?: boolean;
  quoteCode: string;
  amountDue: string;
  amountDueLabel: string;
  inspectionType?: string;
  paymentMethods: Array<{
    id: string;
    title: string;
    description: string | null;
    accountOrWallet: string | null;
    network: string | null;
    instructions: string | null;
  }>;
  url?: string;
}

export interface QuoteRejectResult {
  status: string;
  quoteCode: string;
}

export interface AdminMeResult {
  isAdmin: boolean;
  role?: string;
  displayName?: string;
}

export interface AdminSummaryResult {
  pendingRequests: number;
  pendingPayments: number;
  openTickets: number;
  draftBroadcasts: number;
  panelUrl: string;
  links?: {
    payments: string;
    requests: string;
    broadcasts: string;
  };
}
