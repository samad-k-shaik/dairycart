<!-- issue-meta
title: [M12-09] Add a "Navigate" button that opens turn-by-turn directions to the customer
labels: feature, frontend, architecture
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-09] Add a "Navigate" button that opens turn-by-turn directions to the customer

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** Medium · **Estimated effort:** 2–3 hours

## 1. Objective
On the delivery boy's "Today's deliveries" page (#109), give every order a **Navigate** button that opens turn-by-turn directions to the customer in the phone's maps app.

## 2. Background
The order card already has an **Open map** button (`mapLink()` in `frontend/src/lib/delivery.ts`), but:
- it only appears when the order has a map pin (#108), so orders whose address was saved without a pin get no button at all;
- it opens an OpenStreetMap **web page** showing the spot, not directions. A delivery boy on a bike needs one tap to start navigation.

A Google Maps **directions URL** (`https://www.google.com/maps/dir/?api=1&destination=…`) is a plain link: no API key, no billing account, no cost, no script loaded into our app. On Android and iPhone it opens the Google Maps app with directions ready; elsewhere it opens maps in the browser. ADR-018 kept Google Maps out because of **cost, API keys and a billing account**; none of those apply to a link, so this issue amends ADR-018 to allow *outbound directions links only*. Our own maps (address pin, live map, tracking) stay on Leaflet + OpenStreetMap.

## 3. Learning objectives
- Building a URL safely with `URLSearchParams` (encoding an address with spaces, commas, `/` and `#`)
- Deep links: how a normal `https://` link hands over to an installed app
- Writing an ADR amendment when a decision's reasons change

## 4. Prerequisites
- #108 and #109 done

## 5. Tasks
- [ ] Replace `mapLink()` with `navigationLink(order)` in `frontend/src/lib/delivery.ts`:
  - pin set → `destination=<lat>,<lng>` (most accurate)
  - no pin but an address → `destination=<address text>, <PIN code>`
  - neither → `null` (no button)
- [ ] On the order card in `TodayDeliveriesPage.tsx`, rename the button to **Navigate** with the Lucide `Navigation` icon; opens in a new tab (`target="_blank" rel="noreferrer"`); accessible name includes the customer's name
- [ ] Amend ADR-018 in `docs/04-architecture/high-level-design.md`: outbound Google Maps directions links are allowed (no API, key or billing); embedding Google Maps stays out
- [ ] Update `AGENTS.md` "Out of scope" wording to match

## 6. Technical guidance
- Use `URLSearchParams` so the address is encoded correctly; do not build the query string by hand.
- No backend change: `GET /api/v1/delivery/me/orders` already returns `delivery_address`, `delivery_pincode`, `delivery_latitude` and `delivery_longitude`.
- The link sends the customer's address or coordinates to Google when the delivery boy taps it. That is the delivery boy's choice, the same as copying the address into a maps app by hand; nothing is sent while the page loads.

## 7. Acceptance criteria
- [ ] An order with a pin opens directions to the exact pin
- [ ] An order without a pin but with an address opens directions to the address text and PIN code
- [ ] An order with neither shows no Navigate button
- [ ] The button works on a phone (opens the maps app) and on a laptop (opens a browser tab)

## 8. Testing requirements
- Unit tests in `frontend/src/lib/delivery.test.ts`: pin case, address-only case, special characters encoded, neither case
- Manual check on a phone and in a desktop browser

## 9. Expected deliverables
- `navigationLink()` with tests, updated order card, ADR-018 amendment

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why is a directions link allowed when ADR-018 says Google Maps stays out?
- Why does the pin take priority over the address text?
