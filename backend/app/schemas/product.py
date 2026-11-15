"""Product API schemas (docs/05-api/api-contracts.md → products and admin products)."""

from decimal import Decimal
from typing import Annotated, Any, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.schemas.common import Money


class ProductRead(BaseModel):
    """A product as the API returns it. Exactly the contract's fields, nothing more
    (no created_at)."""

    # from_attributes: build it directly from a SQLAlchemy Product object.
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    name: str
    size: str
    price: Money  # "60.00"
    is_available: bool
    # True/false only: customers may see "Out of stock", never the number (#92).
    in_stock: bool


class AdminProductRead(ProductRead):
    """A product as ADMINS see it: also the stock number (#92)."""

    stock_quantity: int


# ---- Admin input (issue #86) ----


def _money_must_be_a_string(value: Any) -> Any:
    """Money comes in as a string ("45.50"), the same way the API sends it out.

    A JSON number like 45.1 is a float in the client and may already be 45.0999...,
    so it is rejected instead of being silently rounded.
    """
    if not isinstance(value, str):
        # ValueError (not TypeError): pydantic turns ValueError into a 422 response.
        raise ValueError('price must be a string with up to 2 decimals, e.g. "45.50"')  # noqa: TRY004
    return value


# The limits match the database columns: name VARCHAR(100), size VARCHAR(20),
# price NUMERIC(10,2) with CHECK (price > 0). Spaces around the text are removed first.
ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
]
ProductSize = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)
]
# 0–100 000 bottles (#92).
StockQuantity = Annotated[int, Field(ge=0, le=100_000)]
PriceInput = Annotated[
    Decimal,
    BeforeValidator(_money_must_be_a_string),
    Field(gt=0, max_digits=10, decimal_places=2, examples=["45.00"]),
]


class ProductCreate(BaseModel):
    """POST /admin/products. `extra="forbid"`: unknown fields (e.g. product_id) → 422."""

    model_config = ConfigDict(extra="forbid")

    name: ProductName
    size: ProductSize
    price: PriceInput
    is_available: bool = True
    stock_quantity: StockQuantity = 0  # #92


class ProductUpdate(BaseModel):
    """PATCH /admin/products/{id}: send only the fields that change.

    Every field is optional, but a field that IS sent must have a real value: `null`
    is rejected, and an empty body `{}` is rejected because it would change nothing.
    """

    model_config = ConfigDict(extra="forbid")

    name: ProductName | None = None
    size: ProductSize | None = None
    price: PriceInput | None = None
    is_available: bool | None = None
    stock_quantity: StockQuantity | None = None  # #92

    @model_validator(mode="after")
    def _check_sent_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("send at least one field to change")
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self

    def changes(self) -> dict[str, Any]:
        """Only the fields the client actually sent, e.g. {"price": Decimal("65.00")}."""
        return self.model_dump(exclude_unset=True)
