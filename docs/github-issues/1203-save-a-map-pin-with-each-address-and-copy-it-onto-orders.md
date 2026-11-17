<!-- issue-meta
title: [M12-03] Save a map pin with each address and copy it onto orders
labels: feature, backend, frontend, database
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-03] Save a map pin with each address and copy it onto orders

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** High · **Estimated effort:** 6–8 hours

## 1. Objective
Let a customer drop a pin when saving an address, store its coordinates, and copy them onto orders and subscriptions, so a delivery destination can be shown on a map.

## 2. Background
Turning Indian house addresses into coordinates automatically (geocoding) is often wrong, and free geocoders such as Nominatim allow only 1 request per second. A pin dropped by the customer is free and accurate. Saving a pin is **one** request per address save; the map images while dragging come from the tile server, not our backend.

Orders already keep a text copy of the address (`delivery_address`) so editing an address never changes a past order. Coordinates follow the same rule.

## 3. Learning objectives
- Adding nullable columns with an Alembic migration on a table that already has data
- Validating coordinates with Pydantic and a database CHECK constraint
- Using the browser Geolocation API once ("Use my current location")

## 4. Prerequisites
- M12-02 done

## 5. Tasks
- [ ] Alembic migration: `latitude NUMERIC(9,6) NULL`, `longitude NUMERIC(9,6) NULL` on `addresses`, and `delivery_latitude` / `delivery_longitude` on `orders` and `subscriptions` (matching `delivery_address` / `delivery_pincode`), with CHECK constraints (−90…90, −180…180, both null or both set)
- [ ] Update models, schemas and the address service; checkout copies the pin onto the order (and subscription) like it copies the address text
- [ ] Update `docs/05-api/api-contracts.md` (address request/response, order response)
- [ ] Address form: a `MapView` with a draggable pin and a "Use my current location" button (`navigator.geolocation.getCurrentPosition`)
- [ ] The pin is **optional**: existing addresses without coordinates keep working
- [ ] Update `docs/04-architecture/database-erd.md`

## 6. Technical guidance
- `NUMERIC(9,6)` gives about 10 cm precision, more than enough. (Floats are also acceptable for coordinates; the "never float" rule is about money. Pick one and explain it in the PR.)
- Geolocation needs HTTPS in production (`localhost` works in development) and the user's permission; handle "permission denied" with a friendly message.
- Coordinates are personal data: do not log them.

## 7. Acceptance criteria
- [ ] A customer can save, edit and remove a pin on an address
- [ ] A new order keeps the pin even if the address is later edited or deleted
- [ ] Invalid coordinates return the standard 422 error format

## 8. Testing requirements
- pytest: valid and invalid coordinates, "only one of lat/lng" rejected, order copies the pin, old addresses without a pin still work
- Migration upgrade and downgrade tested on a database with existing rows
- Frontend test for the address form with and without a pin

## 9. Expected deliverables
- Migration, backend changes, API contract update, address form with map picker

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why do orders keep a copy of the coordinates instead of pointing to the address row?
