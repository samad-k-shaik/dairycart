<!-- issue-meta
title: [M1-10] Implement product list and product details endpoints
labels: backend
milestone: M1 – Backend Foundation
-->
# [M1-10] Implement product list and product details endpoints

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Implement `GET /api/v1/products` (with `include_unavailable`) and `GET /api/v1/products/{id}` using the router → service → repository layers.

## 2. Background
These are the first real business endpoints. They establish the layering pattern every later endpoint copies, so clarity matters more than speed.

## 3. Learning objectives
- Pydantic response models (`response_model`) and `from_attributes`
- Repository pattern and service layer
- Query parameters and path parameters with validation
- Serialising `Decimal` as a string

## 4. Prerequisites
- M1-05, M1-07, M1-08 merged
- ADR-006 accepted in M0

## 5. Tasks
- [ ] Create `app/schemas/product.py` (`ProductRead`)
- [ ] Create `app/repositories/product_repository.py` (`list(include_unavailable)`, `get(product_id)`)
- [ ] Create `app/services/product_service.py` raising `NotFoundError`
- [ ] Create `app/routers/products.py` with both endpoints
- [ ] Ensure `price` serialises as `"60.00"`

## 6. Technical guidance
Routers call services; services call repositories; only repositories touch SQLAlchemy queries. Order products by `product_id`.

## 7. Acceptance criteria
- [ ] Default list hides unavailable products; `include_unavailable=true` shows them
- [ ] Unknown id returns 404 `NOT_FOUND`; `id=0` or `id=abc` returns 422
- [ ] Responses match the API contract examples exactly

## 8. Testing requirements
- API tests for list, list with unavailable, details, 404 and 422
- Service unit test: `NotFoundError` raised for missing product

## 9. Expected deliverables
- Schema, repository, service, router, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Walk through a request from router to database and back
- Why send prices as strings?
