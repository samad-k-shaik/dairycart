"""Distance and arrival time (#112, ADR-018). Pure functions, no database.

Straight-line ("as the crow flies") distance with the Haversine formula, and an ETA from
an average city speed. Roads are longer than a straight line, so the ETA is an estimate;
road routing (OpenRouteService, GraphHopper, OSRM) is a possible later improvement.
"""

import math

EARTH_RADIUS_KM = 6371.0
# A delivery bike in Indian city traffic, including stops.
AVERAGE_SPEED_KMH = 20.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two points on Earth (treated as a sphere: accurate to well
    under 1 % at city distances)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def eta_minutes(distance_km: float, speed_kmh: float = AVERAGE_SPEED_KMH) -> int:
    """Whole minutes to cover `distance_km`, rounded UP, at least 1 (never "0 min away")."""
    return max(1, math.ceil(distance_km / speed_kmh * 60))
