"""Admin Income tab (#105): an income overview for a period of India days.

Rules
- Income = DELIVERED orders only: payment is cash on delivery, so an order is income
  once it is delivered. Not-yet-delivered orders are shown as "pending".
- An order counts on its delivery day (see income_repository).
- Every figure is compared with the previous period of the same length, right before
  it (1–30 Nov → 2–31 Oct).
- Litres: only milk products, from their size text ("500 ml" → 0.5, "1 Litre" → 1).
- No delivery charges, expenses, profit or payment status: the app has no such data.
"""

import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import InvalidFieldError
from app.repositories.income_repository import IncomeRepository
from app.schemas.common import ErrorDetail
from app.schemas.income import (
    AreaIncome,
    DailyIncome,
    IncomeByType,
    IncomeReport,
    IncomeSummary,
    MonthlyIncome,
    ProductIncome,
    RecentDelivered,
    SubscriptionIncome,
)

MAX_DAYS = 366
MONTHS = 6
RECENT = 8
ZERO = Decimal("0.00")
_SIZE = re.compile(r"(\d+(?:\.\d+)?)\s*(ml|l|lt|ltr|litre|litres|liter|liters)\b", re.IGNORECASE)


def litres_per_unit(name: str, size: str) -> float | None:
    """Litres in ONE unit of a milk product, or None if it is not milk or the size has
    no ml / litre unit. "Cow Milk", "500 ml" → 0.5; "Paneer", "200 g" → None."""
    if "milk" not in name.lower():
        return None
    match = _SIZE.search(size)
    if not match:
        return None
    amount = float(match.group(1))
    return amount / 1000 if match.group(2).lower() == "ml" else amount


def percent_change(now: Decimal | float, before: Decimal | float) -> float | None:
    """+8.5 for 108.5 vs 100; None when there was nothing before."""
    if not before:
        return None
    return round((float(now) - float(before)) / float(before) * 100, 1)


def _share(part: Decimal, whole: Decimal) -> float:
    return round(float(part) / float(whole) * 100, 1) if whole else 0.0


def validate_period(start: date, end: date) -> None:
    if end < start:
        raise InvalidFieldError(
            "The end date must be on or after the start date.",
            details=[ErrorDetail(field="to", issue="before from")],
        )
    if (end - start).days + 1 > MAX_DAYS:
        raise InvalidFieldError(
            f"Choose at most {MAX_DAYS} days.",
            details=[ErrorDetail(field="to", issue="period too long")],
        )


def _months_back(day: date, months: int) -> date:
    """First day of the month `months` months before `day`'s month."""
    index = day.year * 12 + day.month - 1 - months
    return date(index // 12, index % 12 + 1, 1)


@dataclass
class _Totals:
    income: Decimal
    orders: int
    litres: float


def _totals(repository: IncomeRepository, start: date, end: date) -> _Totals:
    rows = repository.daily(start, end)
    litres = sum(
        quantity * (litres_per_unit(name, size) or 0)
        for _, _, name, size, quantity, _ in repository.product_lines(start, end)
    )
    return _Totals(
        income=sum((income for _, income, _ in rows), ZERO),
        orders=sum(orders for _, _, orders in rows),
        litres=round(litres, 2),
    )


def income_report(db: Session, start: date, end: date) -> IncomeReport:
    validate_period(start, end)
    repository = IncomeRepository(db)
    days = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)

    # ---- the period, day by day (missing days = 0) ----
    per_day = {day: (income, orders) for day, income, orders in repository.daily(start, end)}
    daily = [
        DailyIncome(
            date=start + timedelta(days=i),
            income=per_day.get(start + timedelta(days=i), (ZERO, 0))[0],
            orders=per_day.get(start + timedelta(days=i), (ZERO, 0))[1],
        )
        for i in range(days)
    ]
    lines = repository.product_lines(start, end)
    now = _Totals(
        income=sum((d.income for d in daily), ZERO),
        orders=sum(d.orders for d in daily),
        litres=round(sum(q * (litres_per_unit(n, s) or 0) for _, _, n, s, q, _ in lines), 2),
    )
    before = _totals(repository, previous_start, previous_end)
    pending_income, pending_orders = repository.pending(start, end)
    avg_now = (now.income / days).quantize(Decimal("0.01"))
    avg_before = before.income / days

    summary = IncomeSummary(
        litres=now.litres,
        litres_change=percent_change(now.litres, before.litres),
        income=now.income,
        income_change=percent_change(now.income, before.income),
        avg_daily_income=avg_now,
        avg_daily_change=percent_change(avg_now, avg_before),
        delivered_orders=now.orders,
        delivered_orders_change=percent_change(now.orders, before.orders),
        pending_income=pending_income,
        pending_orders=pending_orders,
    )

    # ---- last 6 months up to the end of the period ----
    month_rows = {
        month: (income, orders)
        for month, income, orders in repository.monthly(_months_back(end, MONTHS - 1), end)
    }
    monthly = []
    for back in range(MONTHS - 1, -1, -1):
        first = _months_back(end, back)
        income, orders = month_rows.get(first, (ZERO, 0))
        monthly.append(MonthlyIncome(month=f"{first:%Y-%m}", income=income, orders=orders))

    # ---- subscription vs one-time ----
    type_rows = {
        is_sub: (income, orders) for is_sub, income, orders in repository.by_type(start, end)
    }
    by_type = [
        IncomeByType(
            type=kind,
            income=type_rows.get(is_sub, (ZERO, 0))[0],
            orders=type_rows.get(is_sub, (ZERO, 0))[1],
            share=_share(type_rows.get(is_sub, (ZERO, 0))[0], now.income),
        )
        for kind, is_sub in (("SUBSCRIPTION", True), ("ONE_TIME", False))
    ]

    # ---- products, and litres per area ----
    products: dict[int, dict] = {}
    area_litres: dict[str | None, float] = defaultdict(float)
    for pincode, product_id, name, size, quantity, income in lines:
        per_unit = litres_per_unit(name, size)
        entry = products.setdefault(
            product_id,
            {
                "name": name,
                "size": size,
                "quantity": 0,
                "income": ZERO,
                "per_unit": per_unit,
            },
        )
        entry["quantity"] += quantity
        entry["income"] += income
        if per_unit:
            area_litres[pincode] += quantity * per_unit
    by_product = sorted(
        (
            ProductIncome(
                product_id=product_id,
                name=p["name"],
                size=p["size"],
                quantity=p["quantity"],
                litres=round(p["quantity"] * p["per_unit"], 2) if p["per_unit"] else None,
                income=p["income"],
                share=_share(p["income"], now.income),
            )
            for product_id, p in products.items()
        ),
        key=lambda p: p.income,
        reverse=True,
    )

    # ---- areas (PIN codes), with growth vs the previous period ----
    names = repository.area_names()
    previous_area = {
        pin: income for pin, income, _, _ in repository.by_area(previous_start, previous_end)
    }
    by_area = sorted(
        (
            AreaIncome(
                pincode=pincode,
                area_name=names.get(pincode or ""),
                litres=round(area_litres.get(pincode, 0.0), 2),
                income=income,
                orders=orders,
                customers=customers,
                growth=percent_change(income, previous_area.get(pincode, ZERO)),
            )
            for pincode, income, orders, customers in repository.by_area(start, end)
        ),
        key=lambda a: a.income,
        reverse=True,
    )

    # ---- subscriptions ----
    previous_types = {
        is_sub: income for is_sub, income, _ in repository.by_type(previous_start, previous_end)
    }
    subscriptions = SubscriptionIncome(
        active=repository.active_subscriptions(),
        income=by_type[0].income,
        income_change=percent_change(by_type[0].income, previous_types.get(True, ZERO)),
    )

    recent = [
        RecentDelivered(
            order_id=order_id,
            date=day,
            customer_name=customer,
            type="SUBSCRIPTION" if is_sub else "ONE_TIME",
            amount=total,
        )
        for order_id, day, customer, is_sub, total in repository.recent_delivered(
            start, end, RECENT
        )
    ]

    return IncomeReport(
        start=start,
        end=end,
        previous_start=previous_start,
        previous_end=previous_end,
        days=days,
        summary=summary,
        daily=daily,
        monthly=monthly,
        by_type=by_type,
        by_product=by_product,
        by_area=by_area,
        subscriptions=subscriptions,
        recent=recent,
        insights=insights(summary, by_type, by_product, by_area),
    )


def _rupees(amount: Decimal) -> str:
    """Decimal("88200.00") → "₹88,200" (Indian grouping is done by the frontend; the
    insights keep a simple form)."""
    return f"₹{amount:,.0f}"


def insights(
    summary: IncomeSummary,
    by_type: list[IncomeByType],
    by_product: list[ProductIncome],
    by_area: list[AreaIncome],
) -> list[str]:
    """Up to four short sentences worked out from the numbers."""
    if not summary.income:
        return ["No delivered orders in this period yet."]
    lines: list[str] = []
    change = summary.income_change
    if change is not None:
        direction = "up" if change >= 0 else "down"
        lines.append(f"Income is {direction} {abs(change)}% compared to the previous period.")
    subscription = by_type[0]
    lines.append(f"Subscriptions bring {subscription.share}% of the income.")
    if by_product:
        top = by_product[0]
        lines.append(f"{top.name} {top.size} is the best seller ({_rupees(top.income)}).")
    known_areas = [a for a in by_area if a.pincode]
    if known_areas:
        best = known_areas[0]
        place = f"{best.pincode} · {best.area_name}" if best.area_name else best.pincode
        lines.append(f"{place} is the top delivery area ({_rupees(best.income)}).")
    return lines
