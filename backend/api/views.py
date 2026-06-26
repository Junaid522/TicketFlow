from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .geo_utils import geocode, get_route
from .trip_planner import plan_trip


class PlanTripView(APIView):
    """
    POST /api/plan-trip/
    Body: {
        "current_location": "Chicago, IL",
        "pickup_location": "St. Louis, MO",
        "dropoff_location": "Dallas, TX",
        "current_cycle_hours": 20.0
    }
    """

    def post(self, request):
        data = request.data

        current_location = str(data.get("current_location", "")).strip()
        pickup_location = str(data.get("pickup_location", "")).strip()
        dropoff_location = str(data.get("dropoff_location", "")).strip()

        try:
            current_cycle_hours = float(data.get("current_cycle_hours", 0))
        except (TypeError, ValueError):
            return Response(
                {"error": "current_cycle_hours must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not current_location or not pickup_location or not dropoff_location:
            return Response(
                {"error": "current_location, pickup_location, and dropoff_location are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_cycle_hours < 0 or current_cycle_hours > 70:
            return Response(
                {"error": "current_cycle_hours must be between 0 and 70."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            current_geo = geocode(current_location)
            pickup_geo = geocode(pickup_location)
            dropoff_geo = geocode(dropoff_location)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Geocoding service error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            route = get_route([
                {"lat": current_geo["lat"], "lng": current_geo["lng"]},
                {"lat": pickup_geo["lat"],  "lng": pickup_geo["lng"]},
                {"lat": dropoff_geo["lat"], "lng": dropoff_geo["lng"]},
            ])
        except Exception as e:
            return Response(
                {"error": f"Routing service error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        current_loc = {"name": current_location, **current_geo}
        pickup_loc  = {"name": pickup_location,  **pickup_geo}
        dropoff_loc = {"name": dropoff_location, **dropoff_geo}

        result = plan_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            current_cycle_hours=current_cycle_hours,
            route=route,
        )

        return Response({
            "locations": {
                "current":  current_loc,
                "pickup":   pickup_loc,
                "dropoff":  dropoff_loc,
            },
            "route": {
                "geometry": route["geometry"],
                "distance_miles": round(route["distance_miles"], 1),
                "duration_hours": round(route["duration_hours"], 2),
            },
            **result,
        })
