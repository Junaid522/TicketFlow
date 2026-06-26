import time
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"
METERS_TO_MILES = 0.000621371
HEADERS = {"User-Agent": "TruckLogPlanner/1.0 shahzaib@techforce247.com"}


def geocode(address: str) -> dict:
    """
    Returns {'lat': float, 'lng': float, 'display_name': str}
    Raises ValueError if location not found.
    """
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": address, "format": "json", "limit": 1, "countrycodes": "us,ca,mx"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    results = resp.json()

    if not results:
        # Try without country restriction
        time.sleep(1)
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1},
            headers=HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise ValueError(f"Could not find location: '{address}'. Try a more specific address.")

    r = results[0]
    time.sleep(1.1)  # Nominatim rate limit: max 1 req/sec
    return {
        "lat": float(r["lat"]),
        "lng": float(r["lon"]),
        "display_name": r.get("display_name", address),
    }


def get_route(waypoints: list[dict]) -> dict:
    """
    waypoints: [{'lat': float, 'lng': float}, ...]  — 2 or 3 points
    Returns {
        'distance_miles': float,
        'duration_hours': float,
        'geometry': GeoJSON LineString,
        'legs': [{'distance_miles': float, 'duration_hours': float}, ...]
    }
    """
    coords = ";".join(f"{wp['lng']},{wp['lat']}" for wp in waypoints)
    url = f"{OSRM_URL}/{coords}"

    resp = requests.get(
        url,
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != "Ok":
        raise ValueError(f"Routing failed: {data.get('message', 'OSRM error')}")

    route = data["routes"][0]

    return {
        "distance_miles": route["distance"] * METERS_TO_MILES,
        "duration_hours": route["duration"] / 3600,
        "geometry": route["geometry"],
        "legs": [
            {
                "distance_miles": leg["distance"] * METERS_TO_MILES,
                "duration_hours": leg["duration"] / 3600,
            }
            for leg in route["legs"]
        ],
    }
