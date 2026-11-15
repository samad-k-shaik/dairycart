import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  boundsOf,
  chooseFraming,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  easeOut,
  interpolate,
  isValidLatLng,
  markerLook,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  readTileConfig,
  SINGLE_MARKER_ZOOM,
} from "./map.ts"
import type { MapMarker } from "../types/map.ts"

const HOME: MapMarker = {
  id: "home",
  position: { lat: 17.4375, lng: 78.4483 },
  label: "12-3 Sai Residency, Ameerpet",
  kind: "home",
}
const RAVI: MapMarker = {
  id: "boy-1",
  position: { lat: 17.43, lng: 78.456 },
  label: "Ravi Kumar",
  kind: "delivery-boy",
}

describe("tile settings (#107)", () => {
  it("uses OpenStreetMap when nothing is configured", () => {
    assert.deepEqual(readTileConfig({}), { url: OSM_TILE_URL, attribution: OSM_ATTRIBUTION })
  })

  it("uses a configured tile server and attribution", () => {
    const config = readTileConfig({
      VITE_MAP_TILE_URL: " https://tiles.example.com/{z}/{x}/{y}.png ",
      VITE_MAP_ATTRIBUTION: "© Example",
    })
    assert.deepEqual(config, { url: "https://tiles.example.com/{z}/{x}/{y}.png", attribution: "© Example" })
  })

  it("falls back to OpenStreetMap for a URL without {z}/{x}/{y}", () => {
    assert.equal(readTileConfig({ VITE_MAP_TILE_URL: "https://tiles.example.com/map.png" }).url, OSM_TILE_URL)
    assert.equal(readTileConfig({ VITE_MAP_TILE_URL: "   " }).url, OSM_TILE_URL)
  })

  it("keeps the OpenStreetMap credit when only the URL is changed", () => {
    const config = readTileConfig({ VITE_MAP_TILE_URL: "https://t.example.com/{z}/{x}/{y}.png", VITE_MAP_ATTRIBUTION: "" })
    assert.equal(config.attribution, OSM_ATTRIBUTION)
  })
})

describe("coordinates (#107)", () => {
  it("accepts points on Earth, including the edges", () => {
    assert.equal(isValidLatLng({ lat: 17.385, lng: 78.4867 }), true)
    assert.equal(isValidLatLng({ lat: -90, lng: 180 }), true)
  })

  it("rejects points outside the ranges or not numbers", () => {
    assert.equal(isValidLatLng({ lat: 91, lng: 0 }), false)
    assert.equal(isValidLatLng({ lat: 0, lng: -181 }), false)
    assert.equal(isValidLatLng({ lat: Number.NaN, lng: 0 }), false)
    assert.equal(isValidLatLng({ lat: 0, lng: Number.POSITIVE_INFINITY }), false)
  })

  it("boxes all valid points and ignores invalid ones", () => {
    const bounds = boundsOf([HOME.position, RAVI.position, { lat: 999, lng: 0 }])
    assert.deepEqual(bounds, {
      southWest: { lat: 17.43, lng: 78.4483 },
      northEast: { lat: 17.4375, lng: 78.456 },
    })
    assert.equal(boundsOf([]), null)
  })
})

describe("map framing (#107)", () => {
  it("shows the whole city when there is nothing to show", () => {
    assert.deepEqual(chooseFraming([]), { kind: "center", center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })
  })

  it("zooms in on a single pin", () => {
    assert.deepEqual(chooseFraming([HOME]), { kind: "center", center: HOME.position, zoom: SINGLE_MARKER_ZOOM })
  })

  it("fits several pins on screen", () => {
    const framing = chooseFraming([HOME, RAVI])
    assert.equal(framing.kind, "fit")
  })

  it("lets the page choose the centre and zoom", () => {
    const center = { lat: 17.4, lng: 78.5 }
    assert.deepEqual(chooseFraming([HOME, RAVI], center, 14), { kind: "center", center, zoom: 14 })
  })

  it("ignores pins with invalid coordinates", () => {
    const broken: MapMarker = { ...RAVI, id: "broken", position: { lat: 500, lng: 0 } }
    assert.deepEqual(chooseFraming([HOME, broken]), { kind: "center", center: HOME.position, zoom: SINGLE_MARKER_ZOOM })
    assert.deepEqual(chooseFraming([broken]).kind, "center")
  })
})

describe("marker look (#107)", () => {
  it("draws a home as a blue house", () => {
    const look = markerLook(HOME)
    assert.equal(look.icon, "house")
    assert.match(look.className, /bg-primary/)
    assert.equal(look.description, "Delivery address: 12-3 Sai Residency, Ameerpet")
  })

  it("draws a delivery boy as an amber bike", () => {
    const look = markerLook(RAVI)
    assert.equal(look.icon, "bike")
    assert.match(look.className, /bg-warning/)
    assert.equal(look.description, "Delivery boy: Ravi Kumar")
  })

  it("draws a stale delivery boy grey and says so", () => {
    const look = markerLook({ ...RAVI, stale: true })
    assert.match(look.className, /bg-muted-foreground/)
    assert.match(look.description, /not updated recently/)
  })
})

describe("gliding pins (#111)", () => {
  const from = { lat: 17.43, lng: 78.44 }
  const to = { lat: 17.44, lng: 78.46 }

  it("starts at `from`, ends at `to`, and is halfway at 0.5", () => {
    assert.deepEqual(interpolate(from, to, 0), from)
    assert.deepEqual(interpolate(from, to, 1), to)
    const half = interpolate(from, to, 0.5)
    assert.ok(Math.abs(half.lat - 17.435) < 1e-9 && Math.abs(half.lng - 78.45) < 1e-9)
  })

  it("never overshoots", () => {
    assert.deepEqual(interpolate(from, to, 1.7), to)
    assert.deepEqual(interpolate(from, to, -0.2), from)
  })

  it("eases out: quick start, gentle stop", () => {
    assert.equal(easeOut(0), 0)
    assert.equal(easeOut(1), 1)
    assert.ok(easeOut(0.5) > 0.5)
  })
})
