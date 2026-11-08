/**
 * App-wide constants. Values that come from the requirements live here so they
 * are not "magic numbers" scattered across components.
 */

/** FR-C3: a cart line can hold 1–20 units. The backend enforces the same range. */
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 20

/** FR-A2: admin order table shows 20 orders per page by default. */
export const ADMIN_PAGE_SIZE = 20

/**
 * localStorage keys. The "-v1" suffix is a version: if the stored shape ever
 * changes, we bump it to "-v2" so old, incompatible data is simply ignored.
 */
export const STORAGE_KEYS = {
  cart: 'milk-cart-v1', // name required by issue #26
  lastPhone: 'milk-last-phone-v1', // order history remembers the last phone (#29)
  mockDb: 'milk-mock-db-v1', // M2 only: mock orders survive a page refresh
  mockMode: 'milk-mock-mode-v1', // M2 only: dev switch for slow / failing services
} as const
