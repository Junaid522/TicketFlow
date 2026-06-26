import type { TripPlan, TripFormValues } from '../types/trip';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function planTrip(form: TripFormValues): Promise<TripPlan> {
  const res = await fetch(`${BASE_URL}/api/plan-trip/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_location: form.currentLocation,
      pickup_location: form.pickupLocation,
      dropoff_location: form.dropoffLocation,
      current_cycle_hours: parseFloat(form.currentCycleHours) || 0,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Server error ${res.status}`);
  }
  return data as TripPlan;
}
