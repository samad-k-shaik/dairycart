<!-- issue-meta
title: [M12-01] Approve the maps and live tracking scope change and write the ADR
labels: epic, architecture, documentation
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-01] Approve the maps and live tracking scope change and write the ADR

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Get the scope change approved and record the technology decisions, so the rest of M12 can be built without asking again.

## 2. Background
`docs/02-project-scope.md` and `AGENTS.md` list **Google Maps** and the **delivery partner app** as out of scope (reason: external API and cost; a separate user type). Live tracking needs a map and a page where delivery boys share their location. Free, open-source tools remove the cost reason:

| Need | Choice | Cost |
|---|---|---|
| Map in the browser | Leaflet (BSD-2-Clause) | Free |
| Map images (tiles) | OpenStreetMap tiles for the POC; tile URL kept configurable | Free, with a usage policy |
| Phone GPS | Browser Geolocation API (`watchPosition`) | Free, built into browsers |
| Keep screen on during a round | Screen Wake Lock API | Free, built into browsers |
| Live updates | Polling first (TanStack Query), SSE later | No new service |
| Fan-out between Cloud Run instances | PostgreSQL `LISTEN/NOTIFY` | Already in our database |
| Distance and ETA | Haversine formula in Python (straight line, average speed) | Free, no API |

Google Maps, Mapbox, Redis, Kafka and native mobile apps stay out of scope.

## 3. Learning objectives
- Writing an Architecture Decision Record (ADR)
- Reading open-source licences and usage policies before adding a dependency
- How live tracking works: write path (phone → server) and read path (server → map)

## 4. Prerequisites
- None (first issue of M12)

## 5. Tasks
- [ ] Add the next free ADR in `docs/04-architecture/high-level-design.md`: "Maps and live delivery tracking with Leaflet, OpenStreetMap and browser geolocation"
- [ ] In the ADR, decide between `react-leaflet` and plain Leaflet in a small React hook (react-leaflet uses the Hippocratic License 2.1, which is free but not an OSI-approved licence; record the decision)
- [ ] In the ADR, record the OpenStreetMap tile usage policy (attribution required, light use only) and the production alternatives (OpenFreeMap with MapLibre, MapTiler free tier, self-hosted tiles)
- [ ] Update `docs/02-project-scope.md`: move "maps and live delivery tracking (open source)" into scope; Google Maps stays out
- [ ] Update the out-of-scope list in `AGENTS.md` the same way
- [ ] Add a short privacy section: location is personal data (India DPDP Act); delivery boys share location only during an active round, with consent; customers see a location only for their own order while it is `OUT_FOR_DELIVERY`
- [ ] Update `docs/04-architecture/database-erd.md` with the planned columns and table (see M12-03 and M12-05)

## 6. Technical guidance
Draw the two paths in the ADR:

```
Delivery boy phone ──PUT every 10–15 s──► FastAPI ──upsert──► delivery_locations
Admin / customer map ◄──poll every 10 s (later SSE)── FastAPI ◄── read latest row
```

Our load is tiny (20 delivery boys × 1 update per 10 s = 2 writes per second), so PostgreSQL is enough. Explain in the ADR why big apps (Uber, Blinkit) need Kafka and Redis and why we do not.

## 7. Acceptance criteria
- [ ] ADR merged and approved by the project lead
- [ ] Scope document and `AGENTS.md` updated in the same PR
- [ ] Every new dependency in the ADR has its licence and cost written down

## 8. Testing requirements
- N/A (documentation)

## 9. Expected deliverables
- ADR, scope update, privacy section, ERD update

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why polling first and not WebSockets?
- Why does the customer never get tracked, only the delivery boy?
