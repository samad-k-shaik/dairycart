<!-- issue-meta
title: [M12-02] Add a reusable map component with Leaflet and OpenStreetMap
labels: feature, frontend
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-02] Add a reusable map component with Leaflet and OpenStreetMap

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** High · **Estimated effort:** 4–6 hours

## 1. Objective
Create one `MapView` component that every later M12 screen uses to show a map with markers.

## 2. Background
Learning maps without live data first is easier. This issue only draws a map; nothing is saved yet.

## 3. Learning objectives
- What map tiles are and why they come from a tile server, not our backend
- Latitude / longitude, zoom levels and marker icons
- Wrapping a non-React library (Leaflet) in a React component

## 4. Prerequisites
- M12-01 approved (library choice recorded in the ADR)

## 5. Tasks
- [ ] Add Leaflet (and react-leaflet, if the ADR chose it) with exact pinned versions
- [ ] Add `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` to `frontend/.env.example`, with OpenStreetMap defaults
- [ ] Create `src/components/map/MapView.tsx`: props for centre, zoom and a list of markers (`{ id, lat, lng, label, kind }`)
- [ ] Marker icons for `home`, `delivery-boy` and `stale` (grey) using Lucide icons and design-system colours
- [ ] Always show the attribution "© OpenStreetMap contributors"
- [ ] Add a `LatLng` type in `src/types/`
- [ ] Show the component on `DesignPage.tsx` with a few sample markers

## 6. Technical guidance
- Default centre: the dairy's city; keep it in one constant.
- Leaflet needs its CSS imported once, and the map container needs a fixed height, or it renders as a blank box.
- Leaflet's default marker images break with Vite bundling; use `L.divIcon` with our own icons instead.
- The map must work on a phone (touch zoom and drag) and follow the design system (rounded card around the map).

## 7. Acceptance criteria
- [ ] `MapView` renders tiles and markers on desktop and phone width
- [ ] Attribution visible
- [ ] Tile URL comes from configuration, not hard-coded in the component

## 8. Testing requirements
- Vitest + React Testing Library: renders markers from props (mock Leaflet or test the marker mapping function)
- `npm run lint`, type check and tests pass

## 9. Expected deliverables
- `MapView` component, types, env example, design page demo

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Who serves the map images, and what would happen if 10,000 users opened the map at once?
