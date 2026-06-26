export type DutyStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';

export type StopType = 'start' | 'pickup' | 'dropoff' | 'fuel' | 'rest' | 'break';

export interface TripStop {
  type: StopType;
  location: string;
  lat: number;
  lng: number;
  arrival_day: number;
  arrival_slot: number;
  departure_day: number;
  departure_slot: number;
  duration_hours: number;
  miles_from_start: number;
}

export interface TripDayLog {
  date_offset: number;
  slots: DutyStatus[];
  total_miles: number;
}

export interface TripSummary {
  total_miles: number;
  total_days: number;
  cycle_hours_used: number;
  leg1_miles: number;
  leg1_hours: number;
  leg2_miles: number;
  leg2_hours: number;
}

export interface LocationInfo {
  name: string;
  lat: number;
  lng: number;
  display_name: string;
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteInfo {
  geometry: GeoLineString;
  distance_miles: number;
  duration_hours: number;
}

export interface TripPlan {
  locations: {
    current: LocationInfo;
    pickup: LocationInfo;
    dropoff: LocationInfo;
  };
  route: RouteInfo;
  stops: TripStop[];
  day_logs: TripDayLog[];
  summary: TripSummary;
}

export interface TripFormValues {
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
  currentCycleHours: string;
}
