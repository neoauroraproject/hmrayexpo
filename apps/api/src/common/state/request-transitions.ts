import { RequestStatus } from "@hmray/database";

export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.REQUESTED]: [
    RequestStatus.UNDER_REVIEW,
    RequestStatus.QUOTED,
    RequestStatus.EXPIRED,
    RequestStatus.CANCELLED,
  ],
  [RequestStatus.UNDER_REVIEW]: [
    RequestStatus.QUOTED,
    RequestStatus.EXPIRED,
    RequestStatus.CANCELLED,
  ],
  // A re-quote keeps the request in QUOTED and supersedes the previous quote.
  [RequestStatus.QUOTED]: [
    RequestStatus.QUOTED,
    RequestStatus.EXPIRED,
    RequestStatus.CANCELLED,
  ],
  [RequestStatus.EXPIRED]: [RequestStatus.CANCELLED],
  [RequestStatus.CANCELLED]: [],
};

/** Statuses where the customer may still edit the basket. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = [
  RequestStatus.REQUESTED,
  RequestStatus.UNDER_REVIEW,
];

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return REQUEST_TRANSITIONS[from].includes(to);
}
