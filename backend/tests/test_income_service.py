"""Admin Income tab (#105): delivered orders only, India delivery days, previous-period
comparison, litres from sizes, type / product / area breakdowns. Fixed dates far in the
past, so other test data and today's date do not matter."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Order, OrderStatus, Product, SubscriptionPlan, User
from app.schemas.subscription import SubscriptionCreate
from app.services.income_service import (
    income_report,
    litres_per_unit,
    percent_change,
)
from app.services.subscription_service import create_subscription, generate_orders_for
from tests import factories

START, END = date(2020, 3, 1), date(2020, 3, 10)  # 10 days; previous: 20–29 Feb
URL = "/api/v1/admin/income"


def ist_noon(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, 6, 30, tzinfo=UTC)  # 12:00 IST


def one_time(
    db: Session,
    day: date,
    *lines: tuple[Product, int],
    status: OrderStatus = OrderStatus.DELIVERED,
    pincode: str | None = None,
    placed_at: datetime | None = None,
) -> Order:
    order = factories.make_order(db, items=list(lines), status=status)
    order.order_date = placed_at or ist_noon(day)
    order.delivery_pincode = pincode
    db.flush()
    return order


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Cow Milk", size="500 ml", price="30.00")


@pytest.fixture
def litre(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Buffalo Milk", size="1 Litre", price="70.00")


@pytest.fixture
def paneer(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Paneer", size="200 g", price="90.00")


# ---- helpers ----


@pytest.mark.parametrize(
    ("name", "size", "litres"),
    [
        ("Cow Milk", "500 ml", 0.5),
        ("Cow Milk", "1 Litre", 1.0),
        ("Buffalo Milk", "2 L", 2.0),
        ("Toned milk", "250ml", 0.25),
        ("Paneer", "200 g", None),
        ("Ghee", "500 ml", None),  # not milk
        ("Cow Milk", "1 bottle", None),  # no unit
    ],
)
def test_litres_per_unit(name: str, size: str, litres: float | None) -> None:
    assert litres_per_unit(name, size) == litres


def test_percent_change() -> None:
    assert percent_change(Decimal("108.50"), Decimal(100)) == 8.5
    assert percent_change(90, 100) == -10.0
    assert percent_change(5, 0) is None


# ---- the report ----


def test_only_delivered_orders_are_income(
    db_session: Session, milk: Product, litre: Product
) -> None:
    one_time(db_session, START, (milk, 2))  # 60, 1 litre
    one_time(db_session, END, (litre, 1))  # 70, 1 litre (2 litres in all)
    one_time(db_session, START, (litre, 5), status=OrderStatus.PLACED)  # pending 350
    one_time(db_session, START, (litre, 5), status=OrderStatus.CANCELLED)  # nothing

    report = income_report(db_session, START, END)

    s = report.summary
    assert (s.income, s.delivered_orders, s.litres) == (Decimal("130.00"), 2, 2.0)
    assert (s.pending_income, s.pending_orders) == (Decimal("350.00"), 1)
    assert s.avg_daily_income == Decimal("13.00")  # 130 / 10 days
    assert len(report.daily) == 10
    assert report.daily[0].income == Decimal("60.00")
    assert report.daily[-1].income == Decimal("70.00")
    assert all(d.income == 0 for d in report.daily[1:-1])


def test_india_day_edges(db_session: Session, milk: Product) -> None:
    # 18:29 UTC on 29 Feb = 23:59 IST 29 Feb (outside); 18:30 UTC = 00:00 IST 1 Mar (inside)
    one_time(
        db_session,
        START,
        (milk, 1),
        placed_at=datetime(2020, 2, 29, 18, 29, tzinfo=UTC),
    )
    inside = one_time(
        db_session,
        START,
        (milk, 1),
        placed_at=datetime(2020, 2, 29, 18, 30, tzinfo=UTC),
    )

    report = income_report(db_session, START, END)

    assert report.summary.delivered_orders == 1
    assert [r.order_id for r in report.recent] == [inside.order_id]


def test_compared_with_the_previous_period(db_session: Session, milk: Product) -> None:
    one_time(db_session, date(2020, 2, 25), (milk, 2))  # previous period: 60
    one_time(db_session, START, (milk, 3))  # this period: 90

    report = income_report(db_session, START, END)

    assert (report.previous_start, report.previous_end) == (
        date(2020, 2, 20),
        date(2020, 2, 29),
    )
    assert report.summary.income_change == 50.0
    assert report.summary.litres_change == 50.0
    assert report.summary.delivered_orders_change == 0.0


def test_types_products_and_areas(db_session: Session, milk: Product, paneer: Product) -> None:
    one_time(db_session, START, (milk, 4), (paneer, 1), pincode="500016")  # 120 + 90
    one_time(db_session, START, (milk, 2), pincode="500081")  # 60
    one_time(db_session, date(2020, 2, 25), (milk, 1), pincode="500016")  # previous 30
    report = income_report(db_session, START, END)

    one_time_row = next(t for t in report.by_type if t.type == "ONE_TIME")
    assert (one_time_row.income, one_time_row.share) == (Decimal("270.00"), 100.0)
    products = {(p.name, p.size): p for p in report.by_product}
    assert products[("Cow Milk", "500 ml")].litres == 3.0
    assert products[("Paneer", "200 g")].litres is None
    assert report.by_product[0].name == "Cow Milk"  # biggest income first
    areas = {a.pincode: a for a in report.by_area}
    assert (areas["500016"].income, areas["500016"].litres) == (Decimal("210.00"), 2.0)
    assert areas["500016"].growth == 600.0  # 210 vs 30
    assert areas["500081"].growth is None  # nothing before
    assert any("500016" in line for line in report.insights)


def test_subscription_income(db_session: Session, milk: Product) -> None:
    user: User = factories.make_user(db_session)
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": START,
            "delivery_slot_id": factories.standard_slot(db_session).delivery_slot_id,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": milk.product_id, "quantity": 2}],
        }
    )
    create_subscription(db_session, data, user, today=START - timedelta(days=1))
    [(_, order_id)] = generate_orders_for(db_session, START).created
    order = db_session.get(Order, order_id)
    assert order is not None
    order.status = OrderStatus.DELIVERED
    db_session.flush()

    report = income_report(db_session, START, END)

    subscription_row = next(t for t in report.by_type if t.type == "SUBSCRIPTION")
    assert subscription_row.income == Decimal("60.00")
    assert report.subscriptions.income == Decimal("60.00")
    assert report.subscriptions.active >= 1
    assert report.recent[0].type == "SUBSCRIPTION"


def test_monthly_has_six_months_ending_with_the_period(db_session: Session, milk: Product) -> None:
    one_time(db_session, date(2019, 12, 5), (milk, 1))

    report = income_report(db_session, START, END)

    assert [m.month for m in report.monthly] == [
        "2019-10",
        "2019-11",
        "2019-12",
        "2020-01",
        "2020-02",
        "2020-03",
    ]
    assert report.monthly[2].income == Decimal("30.00")


def test_an_empty_period(db_session: Session) -> None:
    report = income_report(db_session, date(2001, 1, 1), date(2001, 1, 7))
    assert report.summary.income == 0
    assert report.summary.income_change is None
    assert report.insights == ["No delivered orders in this period yet."]


# ---- API ----


def test_admin_only(client: TestClient, normal_user: User) -> None:
    assert client.get(URL).status_code == 401
    assert client.get(URL, headers=factories.auth_header(normal_user)).status_code == 403


def test_api_default_period_and_validation(client: TestClient, admin_user: User) -> None:
    headers = factories.auth_header(admin_user)

    ok = client.get(URL, headers=headers)
    assert ok.status_code == 200
    assert ok.json()["start"].endswith("-01")  # this month so far

    for params in (
        {"from": "2020-03-10", "to": "2020-03-01"},  # end before start
        {"from": "2020-01-01", "to": "2021-01-02"},  # > 366 days
        {"from": "01-03-2020"},
    ):
        assert client.get(URL, params=params, headers=headers).status_code == 422, params
