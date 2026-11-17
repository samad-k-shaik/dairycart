/**
 * Delivery boy types (#103): mirror `docs/05-api/api-contracts.md` → Delivery boys.
 * Delivery boys are records kept by the admin; since #109 one can get a login.
 */

/** One allocated area: a PIN code, optionally with a locality name. */
export type DeliveryArea = {
  pincode: string
  area_name: string | null
}

/** GET /admin/delivery-boys (one item) and the create / edit / area responses. */
export type DeliveryBoy = {
  delivery_boy_id: number
  name: string
  phone: string
  is_active: boolean
  areas: DeliveryArea[]
  created_at: string
  /** Today's orders in his areas (not cancelled); 0 while inactive. */
  today_orders: number
  /** #109: he can log in (with `phone`) on the /delivery pages. */
  has_login: boolean
}

export type DeliveryBoyInput = { name: string; phone: string; is_active: boolean }
export type DeliveryBoyUpdate = Partial<DeliveryBoyInput>
export type AreaInput = { pincode: string; area_name: string | null }
