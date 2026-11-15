"""Admin Income tab schemas (#105, docs/05-api/api-contracts.md → Income).

`change` values are percent changes vs the previous period of the same length, rounded
to one decimal (e.g. 8.5 = +8.5 %); null when the previous period had nothing to compare.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import Money


class IncomeSummary(BaseModel):
    litres: float  # milk sold, from product sizes ("500 ml", "1 Litre")
    litres_change: float | None
    income: Money  # DELIVERED orders only
    income_change: float | None
    avg_daily_income: Money
    avg_daily_change: float | None
    delivered_orders: int
    delivered_orders_change: float | None
    # Orders in the period that are not delivered yet (placed / confirmed / on the way).
    pending_income: Money
    pending_orders: int


class DailyIncome(BaseModel):
    date: date
    income: Money
    orders: int


class MonthlyIncome(BaseModel):
    month: str  # "2026-11"
    income: Money
    orders: int


class IncomeByType(BaseModel):
    type: Literal["SUBSCRIPTION", "ONE_TIME"]
    income: Money
    orders: int
    share: float  # percent of the period's income


class ProductIncome(BaseModel):
    product_id: int
    name: str
    size: str
    quantity: int
    litres: float | None  # None for products that are not milk (paneer, ghee…)
    income: Money
    share: float


class AreaIncome(BaseModel):
    pincode: str | None  # None: orders without an address (before #102)
    area_name: str | None
    litres: float
    income: Money
    orders: int
    customers: int
    growth: float | None


class SubscriptionIncome(BaseModel):
    active: int  # ACTIVE subscriptions now
    income: Money  # from delivered subscription orders in the period
    income_change: float | None


class RecentDelivered(BaseModel):
    order_id: int
    date: date
    customer_name: str
    type: Literal["SUBSCRIPTION", "ONE_TIME"]
    amount: Money


class IncomeReport(BaseModel):
    """GET /admin/income"""

    start: date
    end: date
    previous_start: date
    previous_end: date
    days: int
    summary: IncomeSummary
    daily: list[DailyIncome]
    monthly: list[MonthlyIncome]
    by_type: list[IncomeByType]
    by_product: list[ProductIncome]
    by_area: list[AreaIncome]
    subscriptions: SubscriptionIncome
    recent: list[RecentDelivered]
    insights: list[str]
