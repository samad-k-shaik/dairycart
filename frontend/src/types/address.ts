/**
 * Saved delivery address types (#102): mirror `docs/05-api/api-contracts.md` → Addresses.
 */

/** GET /addresses (one item), POST/PATCH responses. */
export type Address = {
  address_id: number
  /** "Home", "Office"… */
  label: string
  /** House / flat number, building */
  house: string
  /** Street / area */
  street: string
  landmark: string | null
  city: string
  /** 6 digits, not starting with 0 */
  pincode: string
  is_default: boolean
  /** One line, as copied onto orders: "12-3 Sai Residency, MG Road, Hyderabad - 500016". */
  full_text: string
  created_at: string
}

/** POST /addresses body. */
export type AddressInput = {
  label: string
  house: string
  street: string
  landmark: string | null
  city: string
  pincode: string
  is_default?: boolean
}

/** PATCH /addresses/{id}: only the fields that change (landmark null = remove it). */
export type AddressUpdate = Partial<Omit<AddressInput, "is_default">>
