/**
 * Address form rules (#102): the same limits as the backend (POST/PATCH /addresses).
 * Each check gives fast feedback; the backend validates again.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { Address, AddressInput, AddressUpdate } from "../types/address.ts"
import type { LatLng } from "../types/map.ts"

export const MAX_ADDRESSES = 10
/** Indian PIN code: 6 digits, not starting with 0. */
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

export type AddressFormValues = {
  label: string
  house: string
  street: string
  landmark: string
  city: string
  pincode: string
  /** #108: optional map pin; null = no pin. */
  pin: LatLng | null
  is_default: boolean
}

export type AddressFormField = "label" | "house" | "street" | "landmark" | "city" | "pincode"
export type AddressFormErrors = Partial<Record<AddressFormField, string>>

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  label: "Home",
  house: "",
  street: "",
  landmark: "",
  city: "",
  pincode: "",
  pin: null,
  is_default: false,
}

/** [min, max] characters after trimming; landmark may be empty. */
const LENGTHS: Record<AddressFormField, [number, number]> = {
  label: [2, 30],
  house: [1, 100],
  street: [2, 150],
  landmark: [0, 100],
  city: [2, 50],
  pincode: [6, 6],
}

const MISSING: Record<AddressFormField, string> = {
  label: "Please give it a name, e.g. Home.",
  house: "Please enter the house / flat number.",
  street: "Please enter the street or area.",
  landmark: "",
  city: "Please enter the city.",
  pincode: "Please enter the 6-digit PIN code.",
}

export function validateAddressForm(values: AddressFormValues): AddressFormErrors {
  const errors: AddressFormErrors = {}
  for (const field of Object.keys(LENGTHS) as AddressFormField[]) {
    const value = values[field].trim()
    const [min, max] = LENGTHS[field]
    if (field === "pincode") {
      if (value.length === 0) errors.pincode = MISSING.pincode
      else if (!PINCODE_PATTERN.test(value)) errors.pincode = "Enter a 6-digit PIN code, e.g. 500016."
    } else if (value.length === 0 && min > 0) {
      errors[field] = MISSING[field]
    } else if (value.length < min || value.length > max) {
      errors[field] = `Use ${min}–${max} characters.`
    }
  }
  return errors
}

/** Clean values, ready to send. Call after validateAddressForm. */
export function toAddressInput(values: AddressFormValues): AddressInput {
  return {
    label: values.label.trim(),
    house: values.house.trim(),
    street: values.street.trim(),
    landmark: values.landmark.trim() || null,
    city: values.city.trim(),
    pincode: values.pincode.trim(),
    latitude: values.pin ? roundCoordinate(values.pin.lat) : null,
    longitude: values.pin ? roundCoordinate(values.pin.lng) : null,
    is_default: values.is_default,
  }
}

export function toAddressFormValues(address: Address): AddressFormValues {
  return {
    label: address.label,
    house: address.house,
    street: address.street,
    landmark: address.landmark ?? "",
    city: address.city,
    pincode: address.pincode,
    pin:
      address.latitude !== null && address.longitude !== null
        ? { lat: address.latitude, lng: address.longitude }
        : null,
    is_default: address.is_default,
  }
}

/** For PATCH: only the fields that changed (the default is changed separately). */
export function changedAddressFields(address: Address, values: AddressFormValues): AddressUpdate {
  const input = toAddressInput(values)
  const changes: AddressUpdate = {}
  for (const field of ["label", "house", "street", "city", "pincode"] as const) {
    if (input[field] !== address[field]) changes[field] = input[field]
  }
  if (input.landmark !== address.landmark) changes.landmark = input.landmark
  // #108: the pin is sent as a pair (both null removes it), and only if it moved.
  if (input.latitude !== address.latitude || input.longitude !== address.longitude) {
    changes.latitude = input.latitude
    changes.longitude = input.longitude
  }
  return changes
}

/** 6 decimals (about 11 cm): what the backend stores, so a saved pin compares equal. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * A friendly sentence for a failed "Use my current location" (#108). `code` is the
 * browser's GeolocationPositionError code: 1 = permission denied, 2 = position
 * unavailable, 3 = timeout; anything else (e.g. no geolocation in this browser) is generic.
 */
export function locationErrorMessage(code: number | null): string {
  if (code === 1) return "Location permission is off. Allow it in your browser, or tap the map instead."
  if (code === 2) return "Your location could not be found. Tap the map instead."
  if (code === 3) return "Finding your location took too long. Try again, or tap the map instead."
  return "This browser cannot share your location. Tap the map instead."
}

/** The address to choose first: the default, else the first one, else none. */
export function preferredAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.is_default) ?? addresses[0] ?? null
}
