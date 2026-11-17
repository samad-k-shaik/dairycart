/**
 * MapPinField (#108): the optional "Map pin" part of the address form.
 *
 * The customer can tap the map, drag the pin, or use "Use my current location" (the
 * browser's Geolocation API, asked once; this is NOT live tracking). The pin helps the
 * delivery boy find the door; the written address stays the main information, so the pin
 * is optional.
 *
 * Geolocation only works on HTTPS pages (and on localhost during development), and only
 * after the customer allows it. Every failure has a friendly message (lib/address.ts).
 */
import { useState } from "react"
import { Loader2, LocateFixed, X } from "lucide-react"

import LazyMapView from "@/components/map/LazyMapView"
import { Button } from "@/components/ui/button"
import { locationErrorMessage, roundCoordinate } from "@/lib/address"
import type { LatLng, MapMarker } from "@/types/map"

type Props = {
  value: LatLng | null
  onChange: (pin: LatLng | null) => void
}

export function MapPinField({ value, onChange }: Props) {
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState("")

  function pick(position: LatLng) {
    setLocationError("")
    onChange({ lat: roundCoordinate(position.lat), lng: roundCoordinate(position.lng) })
  }

  function locateMe() {
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setLocationError(locationErrorMessage(null))
      return
    }
    setLocating(true)
    setLocationError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        pick({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        setLocating(false)
        setLocationError(locationErrorMessage(error.code))
      },
      // GPS if available; give up after 10 s; a reading up to 1 minute old is fine.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const markers: MapMarker[] = value ? [{ id: "pin", kind: "home", label: "Your delivery pin", position: value }] : []

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Map pin (optional)</legend>
      <p id="map-pin-help" className="text-small text-muted-foreground">
        Tap the map where your door is, or drag the pin. It helps the delivery boy find you.
      </p>

      <LazyMapView label="Map: tap to place your delivery pin" markers={markers} onPick={pick} className="h-64" />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={locateMe} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
          Use my current location
        </Button>
        {value && (
          <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(null)}>
            <X aria-hidden="true" />
            Remove pin
          </Button>
        )}
      </div>

      {/* Read out by screen readers when the pin changes. */}
      <p className="text-small text-muted-foreground" aria-live="polite">
        {value ? `Pin placed at ${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}.` : "No pin yet."}
      </p>
      {locationError && (
        <p role="alert" className="text-small text-destructive">
          {locationError}
        </p>
      )}
    </fieldset>
  )
}
