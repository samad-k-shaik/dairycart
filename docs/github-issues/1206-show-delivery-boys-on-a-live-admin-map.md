<!-- issue-meta
title: [M12-06] Show delivery boys on a live admin map
labels: feature, backend, frontend
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-06] Show delivery boys on a live admin map

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** Medium · **Estimated effort:** 5–6 hours

## 1. Objective
Give the admin a map that shows where every delivery boy on a round is, refreshed every 10 seconds.

## 2. Background
This is the first **read path**. Polling with TanStack Query (`refetchInterval`) is the simplest way to get updates: it needs no new infrastructure and works on Cloud Run with several instances. An upgrade to push (SSE) comes in M12-08.

## 3. Learning objectives
- Polling with TanStack Query and stopping it when the tab is hidden
- Showing "freshness" (stale data) in the UI
- Animating a marker between two positions so movement looks smooth

## 4. Prerequisites
- M12-05 done

## 5. Tasks
- [ ] `GET /api/v1/admin/delivery-boys/locations`: name, areas, position, `updated_at`, `is_stale`, and his orders' pins for today
- [ ] Service function decides `is_stale` (older than 2 minutes), so the rule lives in one place
- [ ] Frontend service function in `src/services/` and a hook using `refetchInterval: 10_000`
- [ ] Map on the admin Orders board (or a "Live map" tab): delivery boy markers, grey when stale, popup with name and last update time; customer pins for today's orders
- [ ] Animate markers from the old to the new position over about 1 second
- [ ] Update the API contract

## 6. Technical guidance
- TanStack Query pauses `refetchInterval` in background tabs by default; keep that.
- Do not refetch the whole Orders board every 10 s, only the locations query.

## 7. Acceptance criteria
- [ ] The admin sees a moving marker while a delivery boy is on a round (test with two browsers)
- [ ] Stale and not-sharing delivery boys are clearly different

## 8. Testing requirements
- pytest: admin only (403 for others), stale flag, empty state when no one is on a round
- Frontend tests: loading, empty, error states of the live map panel

## 9. Expected deliverables
- Admin locations endpoint, live map panel

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- How many requests per second do 3 admins polling every 10 s cause, and is that a problem?
