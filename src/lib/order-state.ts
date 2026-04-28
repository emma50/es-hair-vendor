/**
 * Order status state machine.
 *
 * Defines which transitions the admin UI is allowed to perform, and
 * whether each transition should release (credit back) stock or claim
 * (decrement) stock. Two separate concerns live here:
 *
 *   1. Which transitions are permissible? Prevents admins from flipping
 *      a DELIVERED order back to PROCESSING, or moving a CANCELLED
 *      order straight to SHIPPED without a clean audit trail.
 *
 *   2. Should stock be credited or claimed on the transition? Encoded
 *      as "target is terminal (no stock held)" vs "target holds stock",
 *      combined with the order's current `stockReleased` flag so we
 *      never double-credit or double-decrement.
 *
 * All values match the Prisma `OrderStatus` enum names.
 */

export const ORDER_STATUS_VALUES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'DISPUTED',
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

/**
 * Statuses where the business has released stock back to inventory —
 * either because the sale was voided (CANCELLED) or reversed
 * (REFUNDED). Orders in these states should have `stockReleased = false`.
 */
export const STOCK_RELEASED_STATUSES: readonly OrderStatus[] = [
  'CANCELLED',
  'REFUNDED',
] as const;

export function holdsStock(status: OrderStatus): boolean {
  return !STOCK_RELEASED_STATUSES.includes(status);
}

/**
 * Allowed transitions between statuses. The source is the current
 * status; the value is the set of statuses the admin may transition
 * TO. A status is always a valid "transition" to itself (no-op writes
 * are harmless and we guard against them in the action itself).
 *
 * Rules encoded here:
 *   - PENDING can only move forward (CONFIRMED), get stuck here, or be
 *     voided (CANCELLED).
 *   - CONFIRMED → PROCESSING, SHIPPED (skip-ahead is permitted),
 *     CANCELLED, REFUNDED (rare: refund before fulfilment), or
 *     DISPUTED (bank chargeback). Cannot move BACK to PENDING.
 *   - PROCESSING → SHIPPED, CANCELLED, REFUNDED, DISPUTED.
 *   - SHIPPED → DELIVERED, DISPUTED. Cannot be cancelled once it has
 *     left the warehouse — use REFUNDED after the return is handled.
 *   - DELIVERED → REFUNDED, DISPUTED. A delivered order cannot
 *     "un-deliver" to an earlier state.
 *   - CANCELLED is terminal — no forward transitions. Once cancelled
 *     the admin must create a new order for the customer if they
 *     change their mind. (This avoids the "re-decrement lost variants"
 *     class of bug and keeps the stock math invariant: CANCELLED →
 *     active would need to claim stock that may no longer exist.)
 *   - REFUNDED is terminal for the same reason.
 *   - DISPUTED is a pending-arbitration state: only the bank's outcome
 *     drives the next transition. Admin may resolve to REFUNDED (we
 *     concede / lose) or CONFIRMED (we win — stock was never released
 *     so no reclaim needed).
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: [
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'CANCELLED',
    'REFUNDED',
    'DISPUTED',
  ],
  PROCESSING: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED', 'DISPUTED'],
  SHIPPED: ['SHIPPED', 'DELIVERED', 'DISPUTED'],
  DELIVERED: ['DELIVERED', 'REFUNDED', 'DISPUTED'],
  CANCELLED: ['CANCELLED'],
  REFUNDED: ['REFUNDED'],
  // DISPUTED is a waiting state: the bank is deciding. Only terminal
  // outcomes are legal from here — REFUNDED (we lost/conceded) or
  // CONFIRMED (we won, charge stands). Manual admin transition only.
  DISPUTED: ['DISPUTED', 'REFUNDED', 'CONFIRMED'],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from] ?? [from];
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUS_VALUES as readonly string[]).includes(value)
  );
}
