"""Map pin columns (#108, ADR-018): an optional latitude/longitude pair.

Used by ADDRESSES (latitude, longitude) and by ORDERS and SUBSCRIPTIONS, which keep a copy
(delivery_latitude, delivery_longitude), like they copy the address text.

Why NUMERIC(9,6) read as float?
- NUMERIC(9,6) stores 6 decimals exactly: about 11 cm on the ground, more than enough.
- `asdecimal=False` gives Python floats, so the API returns plain JSON numbers (17.4375).
  Money stays Decimal and is sent as text ("60.00") because cents must be exact; a pin is
  used for maths and drawing, where a float is the normal type.
"""

from sqlalchemy import CheckConstraint, Numeric

COORDINATE_DECIMALS = 6


def coordinate_type() -> Numeric:
    """The column type of one coordinate."""
    return Numeric(9, COORDINATE_DECIMALS, asdecimal=False)


def pin_checks(latitude: str, longitude: str) -> tuple[CheckConstraint, ...]:
    """Database rules for a pin: each value in range, and both set or both NULL
    (half a pin is meaningless). Names follow the naming convention, e.g.
    ck_addresses_latitude_range."""
    return (
        CheckConstraint(f"{latitude} BETWEEN -90 AND 90", name=f"{latitude}_range"),
        CheckConstraint(f"{longitude} BETWEEN -180 AND 180", name=f"{longitude}_range"),
        CheckConstraint(f"({latitude} IS NULL) = ({longitude} IS NULL)", name="map_pin_complete"),
    )
