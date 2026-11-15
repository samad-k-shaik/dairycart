/**
 * Delivery slot types (#100): mirror `docs/05-api/api-contracts.md` → Delivery slots.
 * Times come from the API as "HH:MM:SS" (24-hour, India time), e.g. "08:00:00".
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */

/** "08:00:00" */
export type IsoTime = string

/** GET /delivery-slots: a slot a customer can choose. */
export type DeliverySlot = {
  delivery_slot_id: number
  name: string
  start_time: IsoTime
  end_time: IsoTime
  /** "Morning, 8:00 AM – 9:00 AM" */
  label: string
  /** How many more subscriptions can book it (0 when full). */
  spaces_left: number
  is_full: boolean
}

/** The slot a subscription booked (inside Subscription.delivery_slot). */
export type BookedSlot = {
  delivery_slot_id: number
  name: string
  start_time: IsoTime
  end_time: IsoTime
  label: string
  /** false: the admin switched it off; the booking still stands. */
  is_active: boolean
}

/** GET /admin/delivery-slots: also capacity, bookings and on/off. */
export type AdminDeliverySlot = DeliverySlot & {
  capacity: number
  /** ACTIVE subscriptions in this slot. */
  booked: number
  is_active: boolean
}

/** POST /admin/delivery-slots. Times as "HH:MM". */
export type DeliverySlotCreate = {
  name: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
}

/** PATCH /admin/delivery-slots/{id}: only the fields that change. */
export type DeliverySlotUpdate = Partial<DeliverySlotCreate>
