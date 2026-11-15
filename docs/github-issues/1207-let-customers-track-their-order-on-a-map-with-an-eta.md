<!-- issue-meta
title: [M12-07] Let customers track their order on a map with an ETA
labels: feature, backend, frontend, security
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-07] Let customers track their order on a map with an ETA

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** Medium · **Estimated effort:** 6–8 hours

## 1. Objective
On the order details page, a customer whose order is `OUT_FOR_DELIVERY` sees the delivery boy's position, the home pin, the distance and an estimated arrival time.

## 2. Background
Customer tracking is the most privacy-sensitive part of M12: a customer may see a delivery boy's location **only** for their own order and **only** while it is out for delivery.

## 3. Learning objectives
- The Haversine formula (distance between two coordinates on Earth)
- Putting a business rule (who may see a location, how ETA is calculated) in a service, not in the router or the browser
- Writing access-control tests

## 4. Prerequisites
- M12-03 and M12-05 done (M12-06 recommended)

## 5. Tasks
- [ ] `GET /api/v1/orders/{id}/tracking` returns `{ status, delivery_boy: { name, position, updated_at, is_stale } | null, destination, distance_km, eta_minutes }`
- [ ] Rules in the service: the order belongs to the caller; status is `OUT_FOR_DELIVERY`; the matched delivery boy is on a round. Otherwise return status only, with no position.
- [ ] `services/geo.py`: `haversine_km()` and `eta_minutes(distance_km, speed_kmh=20)` (straight line; document that roads are longer)
- [ ] `OrderDetailsPage.tsx`: map with both pins, "About 8 min away · 1.2 km", polling every 10 s while out for delivery, no polling otherwise
- [ ] Orders without a pin (older addresses) show the status text only
- [ ] Update the API contract

## 6. Technical guidance
- Do not expose the delivery boy's phone number or history through this endpoint.
- Road-based ETA (OpenRouteService free key, GraphHopper free tier or self-hosted OSRM) is a possible later improvement; keep it out of this issue.

## 7. Acceptance criteria
- [ ] The customer sees a moving marker and an ETA while the order is out for delivery
- [ ] Another customer's order, or an order in any other status, never returns a position

## 8. Testing requirements
- pytest: Haversine against known distances; ETA rounding; every access rule (other user → 404, wrong status → no position, not on a round → no position)
- Frontend tests for the tracking panel states

## 9. Expected deliverables
- Tracking endpoint, geo helpers, customer tracking panel

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why is the ETA calculated on the server and not in the browser?
