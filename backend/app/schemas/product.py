"""Product API schemas (docs/05-api/api-contracts.md → GET /products)."""

from pydantic import BaseModel, ConfigDict

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
