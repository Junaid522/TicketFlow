"""
HOS-compliant trip planner for property-carrying CMV drivers.

Regulations applied (49 CFR Part 395):
  - 11-hour driving limit per shift
  - 14-hour driving window per shift
  - 30-minute break after 8 cumulative hours of driving
  - 10-hour mandatory rest before next shift
  - 70-hour/8-day cycle limit
  - No adverse driving conditions
  - Fuel stops every 1,000 miles
  - 1 hour on-duty for pickup and dropoff
"""

from dataclasses import dataclass, field
from typing import Optional

# ── HOS constants ─────────────────────────────────────────────────────────────
MAX_DRIVING_SHIFT = 11.0       # hours driving per shift
MAX_WINDOW = 14.0              # hours from first on-duty to last on-duty per shift
BREAK_TRIGGER = 8.0            # cumulative driving hours before 30-min break required
BREAK_DURATION = 0.5           # 30 minutes
REST_DURATION = 10.0           # mandatory off-duty/sleeper rest between shifts
FUEL_INTERVAL = 1000.0         # miles between fuel stops
PICKUP_DURATION = 1.0          # 1 hour on-duty at pickup
DROPOFF_DURATION = 1.0         # 1 hour on-duty at dropoff
FUEL_STOP_DURATION = 0.5       # 30 min on-duty for fueling
CYCLE_LIMIT = 70.0             # 70-hr/8-day cycle

SLOTS_PER_DAY = 96             # 15-min slots
SLOT_MINUTES = 15

OFF_DUTY = "off_duty"
SLEEPER = "sleeper_berth"
DRIVING = "driving"
ON_DUTY = "on_duty_not_driving"


@dataclass
class Stop:
    type: str          # start | pickup | dropoff | fuel | rest | break
    location: str
    lat: float
    lng: float
    arrival_abs_min: int    # minutes from trip start
    departure_abs_min: int
    duration_hours: float
    miles_from_start: float

    def to_dict(self):
        def slot_of(abs_min):
            return (abs_min % (24 * 60)) // SLOT_MINUTES

        def day_of(abs_min):
            return abs_min // (24 * 60)

        return {
            "type": self.type,
            "location": self.location,
            "lat": self.lat,
            "lng": self.lng,
            "arrival_day": day_of(self.arrival_abs_min),
            "arrival_slot": slot_of(self.arrival_abs_min),
            "departure_day": day_of(self.departure_abs_min),
            "departure_slot": slot_of(self.departure_abs_min),
            "duration_hours": round(self.duration_hours, 2),
            "miles_from_start": round(self.miles_from_start, 1),
        }


@dataclass
class DayLog:
    date_offset: int
    slots: list = field(default_factory=lambda: [OFF_DUTY] * SLOTS_PER_DAY)
    total_miles: float = 0.0

    def to_dict(self):
        return {
            "date_offset": self.date_offset,
            "slots": self.slots,
            "total_miles": round(self.total_miles, 1),
        }


class Simulator:
    """Time-forward HOS simulator. Advances through the trip in 15-min steps."""

    def __init__(self, current_cycle_hours: float):
        # Shift state — resets after each 10-hr rest
        self.driving_used: float = 0.0
        self.drive_since_break: float = 0.0
        self.shift_started: bool = False
        self.shift_start_min: int = 0   # wall-clock minute when shift began

        # Cycle state
        self.cycle_used: float = current_cycle_hours

        # Position / trip state
        self.abs_min: int = 0          # absolute minutes from trip start
        self.miles_driven: float = 0.0
        self.miles_since_fuel: float = 0.0

        # Output
        self.days: list[DayLog] = [DayLog(date_offset=0)]
        self.stops: list[Stop] = []

    @property
    def window_used(self) -> float:
        """14-hr window is wall-clock elapsed time since shift start (§395.3(a)(2))."""
        if not self.shift_started:
            return 0.0
        return (self.abs_min - self.shift_start_min) / 60.0

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _ensure_day(self, day: int):
        while len(self.days) <= day:
            self.days.append(DayLog(date_offset=len(self.days)))

    def _fill(self, start_min: int, end_min: int, status: str):
        """Fill slot range [start_min, end_min) with status."""
        start_slot = start_min // SLOT_MINUTES
        end_slot = (end_min + SLOT_MINUTES - 1) // SLOT_MINUTES
        for s in range(start_slot, end_slot):
            d = s // SLOTS_PER_DAY
            sl = s % SLOTS_PER_DAY
            self._ensure_day(d)
            self.days[d].slots[sl] = status

    def _advance(self, hours: float, status: str):
        start = self.abs_min
        minutes = round(hours * 60)
        end = start + minutes
        self._fill(start, end, status)
        self.abs_min = end

        on_duty = status in (DRIVING, ON_DUTY)
        if on_duty:
            self.cycle_used += hours
            if not self.shift_started:
                self.shift_start_min = start   # wall-clock start of this shift
                self.shift_started = True
        if status == DRIVING:
            self.driving_used += hours
            self.drive_since_break += hours

    # ── Public operations ─────────────────────────────────────────────────────

    def take_rest(self, location: str, lat: float, lng: float):
        arrival = self.abs_min
        self._advance(REST_DURATION, SLEEPER)
        self.driving_used = 0.0
        self.drive_since_break = 0.0
        self.shift_started = False
        self.shift_start_min = 0
        self.stops.append(Stop(
            type="rest",
            location=location,
            lat=lat, lng=lng,
            arrival_abs_min=arrival,
            departure_abs_min=self.abs_min,
            duration_hours=REST_DURATION,
            miles_from_start=self.miles_driven,
        ))

    def take_break(self, location: str, lat: float, lng: float):
        arrival = self.abs_min
        self._advance(BREAK_DURATION, SLEEPER)
        self.drive_since_break = 0.0
        self.stops.append(Stop(
            type="break",
            location=location,
            lat=lat, lng=lng,
            arrival_abs_min=arrival,
            departure_abs_min=self.abs_min,
            duration_hours=BREAK_DURATION,
            miles_from_start=self.miles_driven,
        ))

    def take_fuel(self, location: str, lat: float, lng: float):
        arrival = self.abs_min
        self._advance(FUEL_STOP_DURATION, ON_DUTY)
        self.miles_since_fuel = 0.0
        self.stops.append(Stop(
            type="fuel",
            location=location,
            lat=lat, lng=lng,
            arrival_abs_min=arrival,
            departure_abs_min=self.abs_min,
            duration_hours=FUEL_STOP_DURATION,
            miles_from_start=self.miles_driven,
        ))

    def on_duty_event(self, stop_type: str, location: str, lat: float, lng: float,
                      duration_hours: float):
        """Pickup, dropoff, or any fixed-duration on-duty stop."""
        # If window is almost full, rest first
        if self.shift_started and self.window_used + duration_hours > MAX_WINDOW:
            self.take_rest(f"Rest before {stop_type}", lat, lng)

        arrival = self.abs_min
        self._advance(duration_hours, ON_DUTY)
        self.stops.append(Stop(
            type=stop_type,
            location=location,
            lat=lat, lng=lng,
            arrival_abs_min=arrival,
            departure_abs_min=self.abs_min,
            duration_hours=duration_hours,
            miles_from_start=self.miles_driven,
        ))

    def drive_segment(
        self,
        total_miles: float, total_hours: float,
        from_name: str, to_name: str,
        from_lat: float, from_lng: float,
        to_lat: float, to_lng: float,
    ):
        """
        Drive from A→B, automatically inserting breaks, rests, and fuel stops
        as FMCSA HOS rules require.
        """
        if total_miles < 0.1 or total_hours < 0.01:
            return

        avg_speed = total_miles / total_hours   # mph

        miles_remaining = total_miles
        hours_remaining = total_hours

        def interp(pct):
            """Interpolate lat/lng along the route."""
            return (
                from_lat + (to_lat - from_lat) * pct,
                from_lng + (to_lng - from_lng) * pct,
            )

        def pos_name(miles_so_far):
            pct = miles_so_far / total_miles
            return f"{from_name} → {to_name} (~{int(self.miles_driven)} mi)"

        miles_done = 0.0
        guard = 0

        while miles_remaining > 0.1:
            guard += 1
            if guard > 500:
                break  # safety valve — should never hit

            # ── Check if full rest needed ─────────────────────────────────
            need_rest = (
                self.driving_used >= MAX_DRIVING_SHIFT or
                self.window_used >= MAX_WINDOW or
                self.cycle_used >= CYCLE_LIMIT
            )
            if need_rest:
                pct = miles_done / total_miles
                lat, lng = interp(pct)
                self.take_rest(pos_name(miles_done), lat, lng)
                continue

            # ── Check if break needed ─────────────────────────────────────
            if self.drive_since_break >= BREAK_TRIGGER:
                pct = miles_done / total_miles
                lat, lng = interp(pct)
                if self.window_used + BREAK_DURATION >= MAX_WINDOW:
                    self.take_rest(pos_name(miles_done), lat, lng)
                else:
                    self.take_break(pos_name(miles_done), lat, lng)
                continue

            # ── How many hours can we drive before a constraint fires? ────
            limit = min(
                MAX_DRIVING_SHIFT - self.driving_used,
                MAX_WINDOW - self.window_used,
                BREAK_TRIGGER - self.drive_since_break,
                CYCLE_LIMIT - self.cycle_used,
            )
            if limit <= 0.001:
                pct = miles_done / total_miles
                lat, lng = interp(pct)
                self.take_rest(pos_name(miles_done), lat, lng)
                continue

            # ── How far until the next fuel stop? ────────────────────────
            fuel_miles_avail = FUEL_INTERVAL - self.miles_since_fuel
            fuel_hours = fuel_miles_avail / avg_speed

            # Drive to whichever event comes first
            seg_hours = min(limit, fuel_hours, hours_remaining)
            seg_miles = seg_hours * avg_speed

            # Record miles on this day
            day_idx = self.abs_min // (24 * 60)
            self._ensure_day(day_idx)
            self.days[day_idx].total_miles += seg_miles

            self._advance(seg_hours, DRIVING)
            self.miles_driven += seg_miles
            self.miles_since_fuel += seg_miles
            miles_done += seg_miles
            miles_remaining -= seg_miles
            hours_remaining -= seg_hours

            # ── Fuel if needed ────────────────────────────────────────────
            if self.miles_since_fuel >= FUEL_INTERVAL - 0.5:
                pct = miles_done / total_miles
                lat, lng = interp(pct)
                loc = f"Fuel stop ({int(self.miles_driven)} mi)"
                if self.window_used + FUEL_STOP_DURATION > MAX_WINDOW:
                    self.take_rest(loc, lat, lng)
                else:
                    self.take_fuel(loc, lat, lng)


# ── Public entry point ────────────────────────────────────────────────────────

def plan_trip(
    current_loc: dict,
    pickup_loc: dict,
    dropoff_loc: dict,
    current_cycle_hours: float,
    route: dict,
) -> dict:
    """
    Args:
        current_loc / pickup_loc / dropoff_loc: {'name', 'lat', 'lng'}
        current_cycle_hours: hours already used in the 70-hr/8-day cycle
        route: output of geo_utils.get_route() with 2 legs

    Returns serializable dict with stops, day_logs, and trip summary.
    """
    sim = Simulator(current_cycle_hours)

    leg1 = route["legs"][0]   # current → pickup
    leg2 = route["legs"][1]   # pickup  → dropoff

    # ── Start marker ─────────────────────────────────────────────────────────
    sim.stops.append(Stop(
        type="start",
        location=current_loc["name"],
        lat=current_loc["lat"], lng=current_loc["lng"],
        arrival_abs_min=0, departure_abs_min=0,
        duration_hours=0, miles_from_start=0,
    ))

    # ── Leg 1: current → pickup ───────────────────────────────────────────────
    sim.drive_segment(
        leg1["distance_miles"], leg1["duration_hours"],
        current_loc["name"], pickup_loc["name"],
        current_loc["lat"], current_loc["lng"],
        pickup_loc["lat"], pickup_loc["lng"],
    )

    # ── Pickup (1 hr on-duty) ─────────────────────────────────────────────────
    sim.on_duty_event("pickup", pickup_loc["name"],
                      pickup_loc["lat"], pickup_loc["lng"], PICKUP_DURATION)

    # ── Leg 2: pickup → dropoff ───────────────────────────────────────────────
    sim.drive_segment(
        leg2["distance_miles"], leg2["duration_hours"],
        pickup_loc["name"], dropoff_loc["name"],
        pickup_loc["lat"], pickup_loc["lng"],
        dropoff_loc["lat"], dropoff_loc["lng"],
    )

    # ── Dropoff (1 hr on-duty) ────────────────────────────────────────────────
    sim.on_duty_event("dropoff", dropoff_loc["name"],
                      dropoff_loc["lat"], dropoff_loc["lng"], DROPOFF_DURATION)

    return {
        "stops": [s.to_dict() for s in sim.stops],
        "day_logs": [d.to_dict() for d in sim.days],
        "summary": {
            "total_miles": round(sim.miles_driven, 1),
            "total_days": len(sim.days),
            "cycle_hours_used": round(sim.cycle_used, 2),
            "leg1_miles": round(leg1["distance_miles"], 1),
            "leg1_hours": round(leg1["duration_hours"], 2),
            "leg2_miles": round(leg2["distance_miles"], 1),
            "leg2_hours": round(leg2["duration_hours"], 2),
        },
    }
