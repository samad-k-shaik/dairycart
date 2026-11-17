<!-- issue-meta
title: [M12-08] Push location updates with SSE and PostgreSQL LISTEN/NOTIFY
labels: feature, backend, frontend, architecture
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-08] Push location updates with SSE and PostgreSQL LISTEN/NOTIFY

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** Low (stretch) · **Estimated effort:** 8–10 hours

## 1. Objective
Replace polling on the admin and customer maps with Server-Sent Events (SSE), so a new position reaches the map as soon as it is saved.

## 2. Background
On Cloud Run the backend may run as several instances. The delivery boy's `PUT` can reach instance A while the customer's SSE connection is open on instance B. PostgreSQL `LISTEN/NOTIFY` lets instance A tell every instance "delivery boy 7 moved" with no new service (no Redis). Uber's first push system was also built on SSE.

## 3. Learning objectives
- SSE: a long-lived HTTP response with `Content-Type: text/event-stream`
- `LISTEN/NOTIFY` with psycopg 3
- Why horizontally scaled servers need a shared message channel

## 4. Prerequisites
- M12-06 and M12-07 done and working with polling

## 5. Tasks
- [ ] After the location upsert, run `NOTIFY delivery_location, '<delivery_boy_id>'` in the same transaction
- [ ] One background listener per instance (dedicated psycopg connection, `LISTEN delivery_location`) that forwards events to connected streams
- [ ] `GET /api/v1/admin/delivery-boys/locations/stream` and `GET /api/v1/orders/{id}/tracking/stream` using FastAPI `StreamingResponse` (same access rules as the polling endpoints)
- [ ] Heartbeat comment every 15–20 s so proxies do not close idle connections
- [ ] Frontend: read the stream with `fetch` + `ReadableStream` (not `EventSource`, which cannot send our `Authorization: Bearer` header); reconnect with backoff; **fall back to polling** on failure
- [ ] Write an ADR follow-up: what changed and the measured difference vs polling

## 6. Technical guidance
- Cloud Run closes a request at its timeout (60 minutes at most); the client must reconnect, which is normal.
- Every open stream holds a connection on the instance; check the Cloud Run concurrency setting and document the limit.
- No new library is needed: `StreamingResponse` and psycopg are already in the stack. If one seems needed, it requires an ADR.
- Keep the polling endpoints: they are the fallback.

## 7. Acceptance criteria
- [ ] A position update appears on an open admin map within about 1 second
- [ ] With two backend instances (two local processes), updates still reach every client
- [ ] If the stream fails, the map silently falls back to polling

## 8. Testing requirements
- pytest: stream access rules (same as polling endpoints); NOTIFY sent on upsert
- Manual test with two backend processes behind one URL, recorded in the PR

## 9. Expected deliverables
- Stream endpoints, listener, frontend stream client with fallback, ADR follow-up

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What breaks if we keep a plain Python list of connected clients without `LISTEN/NOTIFY`?
