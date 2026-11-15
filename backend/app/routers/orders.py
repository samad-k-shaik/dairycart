"""Customer order endpoints (M3-04, M3-05; login required since #90):

    POST /api/v1/orders              → place an order (201 + Location header)
    GET  /api/v1/orders/mine         → the logged-in user's orders, newest first
    GET  /api/v1/orders/{order_id}   → one order (owner or ADMIN only)
    GET  /api/v1/orders/{order_id}/tracking → where is it? (#112, same visibility)
    GET  /api/v1/orders/{order_id}/tracking/stream → the same, pushed (SSE, #113)

Every endpoint needs a logged-in user (401 without a valid token). The old lookup by
phone number (GET /orders?phone=) was removed in #90: anyone who knew a phone number
could see that customer's orders.

The router only handles HTTP; the rules are in services/order_service.py.
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.errors import NotFoundError
from app.core.live_updates import SSE_HEADERS, sse_stream
from app.database.session import get_db
from app.models import User
from app.schemas.common import ErrorResponse
from app.schemas.delivery import TrackingRead
from app.schemas.order import OrderCreate, OrderRead, OrderSummary
from app.services import order_service, tracking_service

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={401: {"model": ErrorResponse, "description": "Not logged in (#90)"}},
)

DbSession = Annotated[Session, Depends(get_db)]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Place an order",
    responses={
        400: _error("DUPLICATE_PRODUCT: the same product twice"),
        404: _error("NOT_FOUND: a product does not exist"),
        409: _error("PRODUCT_UNAVAILABLE: a product is not available"),
        422: _error("Invalid body, or prices/totals were sent"),
    },
)
def create_order(
    data: OrderCreate, response: Response, db: DbSession, user: CurrentUser
) -> OrderRead:
    """Login required (#90). Send only product ids and quantities. The backend
    calculates every price and the total from the database. If any item fails,
    nothing is saved. The order is saved with the logged-in account."""
    order = order_service.create_order(db, data, user)
    response.headers["Location"] = f"/api/v1/orders/{order.order_id}"
    return OrderRead.from_order(order)


# "/mine" is declared BEFORE "/{order_id}": routes are matched in order, and "mine"
# must not be read as an order id.
@router.get("/mine", response_model=list[OrderSummary], summary="My orders")
def list_my_orders(db: DbSession, user: CurrentUser) -> list[OrderSummary]:
    """The logged-in user's orders, newest first. `[]` if there are none."""
    rows = order_service.list_my_orders(db, user)
    return [OrderSummary.model_validate(asdict(row)) for row in rows]


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Order details",
    responses={
        404: _error("No such order, or it belongs to someone else"),
        422: _error("Invalid id"),
    },
)
def get_order(
    order_id: Annotated[int, Path(gt=0, description="A positive order id")],
    db: DbSession,
    user: CurrentUser,
) -> OrderRead:
    """Only the user who placed the order, or an ADMIN, can see it."""
    return OrderRead.from_order(order_service.get_order_for(db, order_id, user))


@router.get(
    "/{order_id}/tracking",
    response_model=TrackingRead,
    summary="Track my order (#112)",
    responses={404: _error("No such order, or someone else's")},
)
def track_order(
    order_id: Annotated[int, Path(gt=0)], user: CurrentUser, db: DbSession
) -> TrackingRead:
    """While the order is OUT_FOR_DELIVERY and the delivery boy is sharing his location:
    his first name and position, the order's map pin, the straight-line distance and an
    estimated arrival time. Otherwise the status only. The page asks every 10 s."""
    return tracking_service.track_order(db, order_id, user)


@router.get(
    "/{order_id}/tracking/stream",
    summary="Track my order, pushed as Server-Sent Events (#113)",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "SSE stream"},
        404: _error("No such order, or someone else's"),
    },
)
def track_order_stream(
    order_id: Annotated[int, Path(gt=0)], user: CurrentUser, db: DbSession
) -> StreamingResponse:
    """`event: snapshot` with the same JSON as GET /tracking, at once and whenever the
    delivery boy moves or the status changes; `: ping` every 15 s. The same access rule is
    checked BEFORE streaming (404) and again for every snapshot."""
    tracking_service.track_order(db, order_id, user)  # 404 now, not inside the stream
    user_id = user.user_id

    def snapshot() -> str | None:
        try:
            current = db.get(User, user_id)
            if current is None:
                return None
            return tracking_service.track_order(db, order_id, current).model_dump_json()
        except NotFoundError:
            return None
        finally:
            db.commit()  # end the read transaction, so the next snapshot sees new data

    return StreamingResponse(
        sse_stream(snapshot), media_type="text/event-stream", headers=SSE_HEADERS
    )
