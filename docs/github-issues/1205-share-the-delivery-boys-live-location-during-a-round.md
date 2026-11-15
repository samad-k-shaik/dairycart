<!-- issue-meta
title: [M12-05] Share the delivery boy's live location during a round
labels: feature, backend, frontend, database, security
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-05] Share the delivery boy's live location during a round

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** High · **Estimated effort:** 8–10 hours

## 1. Objective
When a delivery boy taps **Start round**, his phone sends its GPS position to the backend every 10–15 seconds until he taps **Stop round**.

## 2. Background
This is the **write path** of live tracking. The server keeps only the **latest** position per delivery boy (one row, overwritten each time), which is all the maps need. Load: 20 delivery boys × one update per 10 s = 2 writes per second, easy for PostgreSQL.

## 3. Learning objectives
- `navigator.geolocation.watchPosition` and its options (accuracy, timeout, maximum age)
- Upserts (`INSERT … ON CONFLICT … DO UPDATE`)
- Throttling: sending less often without losing useful data
- The Screen Wake Lock API

## 4. Prerequisites
- M12-04 done

## 5. Tasks
- [ ] Migration: `delivery_locations` table: `delivery_boy_id` (PK/FK), `latitude`, `longitude`, `accuracy_m`, `recorded_at` (phone time), `updated_at` (server time), `is_sharing` (bool)
- [ ] `PUT /api/v1/delivery/me/location`: validates and upserts (repository → service → router)
- [ ] `POST /api/v1/delivery/me/round/start` and `/stop`: set `is_sharing`; stop clears the position
- [ ] Frontend `/delivery`: Start / Stop round buttons, consent text, current status ("Sharing location, last sent 5 s ago")
- [ ] Throttle in the browser: send when 10 s have passed **or** he moved more than 20 m, never more than once every 5 s
- [ ] Request a screen wake lock during a round and re-request it when the page becomes visible again
- [ ] Ignore readings with very poor accuracy (for example over 100 m)
- [ ] Update the API contract and ERD

## 6. Technical guidance
- Known limitation (write it in the PR): a web page cannot track in the background. If the screen locks or he switches apps, updates pause. Only a native app can fix that, which is out of scope.
- Reject positions sent while the round is stopped (409), so location is never stored without consent.
- Never log coordinates.
- A position older than 2 minutes counts as **stale**; readers (M12-06, M12-07) show it greyed out.

## 7. Acceptance criteria
- [ ] Starting a round on a phone makes `delivery_locations` update about every 10 s while moving
- [ ] Stopping a round stops sending and clears the stored position
- [ ] Only the logged-in delivery boy can write his own location

## 8. Testing requirements
- pytest: upsert creates then updates one row; invalid coordinates → 422; not in a round → 409; other roles → 403
- Unit test for the throttle function (time and distance rules)
- Manual test on a real phone over HTTPS (for example the deployed app or a tunnel), recorded in the PR

## 9. Expected deliverables
- Migration, endpoints, delivery page round controls, throttle helper with tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why do we overwrite one row instead of inserting a new row every time?
- Why throttle by both time and distance?
