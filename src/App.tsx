import { useState } from 'react';
import TripForm from './components/TripForm';
import TripMap from './components/TripMap';
import ELDLogSheet from './components/ELDLogSheet';
import { planTrip } from './api/tripApi';
import type { TripPlan, TripFormValues } from './types/trip';

// Leaflet CSS
import 'leaflet/dist/leaflet.css';

const STOP_TYPE_COLORS: Record<string, string> = {
  start: 'bg-blue-700', pickup: 'bg-green-600', dropoff: 'bg-red-600',
  fuel: 'bg-amber-500', rest: 'bg-violet-600', break: 'bg-cyan-600',
};

const STOP_TYPE_LABELS: Record<string, string> = {
  start: 'Start', pickup: 'Pickup', dropoff: 'Dropoff',
  fuel: 'Fuel', rest: '10hr Rest', break: '30min Break',
};

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function App() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  async function handlePlan(form: TripFormValues) {
    setLoading(true);
    setError(null);
    setPlan(null);
    setActiveDay(0);
    try {
      const result = await planTrip(form);
      setPlan(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-blue-800 text-xs font-black">
            ELD
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">HOS Trip Planner</div>
            <div className="text-[10px] text-blue-200">
              FMCSA 49 CFR Part 395 · 70hr/8day · Property Carrier · Auto ELD Generation
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs text-blue-200">
            <span>OpenStreetMap + OSRM</span>
            <span className="text-blue-400">|</span>
            <span>Free · No API Key</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Trip Form ────────────────────────────────────────────────── */}
        <TripForm onSubmit={handlePlan} loading={loading} error={error} />

        {/* ── Results ──────────────────────────────────────────────────── */}
        {plan && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Distance', value: `${plan.route.distance_miles.toLocaleString()} mi`, sub: 'full route' },
                { label: 'Drive Time', value: formatHours(plan.route.duration_hours), sub: 'road time only' },
                { label: 'Trip Duration', value: `${plan.summary.total_days} day${plan.summary.total_days !== 1 ? 's' : ''}`, sub: 'incl. rest stops' },
                { label: 'Cycle Used', value: `${plan.summary.cycle_hours_used.toFixed(1)} / 70 hrs`, sub: '70-hr/8-day rule' },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                  <div className="text-lg font-bold text-gray-900">{c.value}</div>
                  <div className="text-[10px] text-gray-400">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Map */}
            <TripMap plan={plan} />

            {/* Stops timeline */}
            <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Trip Stops Timeline</h3>
              <div className="flex flex-wrap gap-2">
                {plan.stops.map((stop, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${STOP_TYPE_COLORS[stop.type] ?? 'bg-gray-400'}`}
                    />
                    <span className="font-semibold text-gray-700">
                      {STOP_TYPE_LABELS[stop.type] ?? stop.type}
                    </span>
                    {stop.duration_hours > 0 && (
                      <span className="text-gray-500">({formatHours(stop.duration_hours)})</span>
                    )}
                    <span className="text-gray-400">
                      {stop.miles_from_start > 0 ? `· ${Math.round(stop.miles_from_start)} mi` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Leg summary */}
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-500 mb-0.5">Leg 1: {plan.locations.current.name} → {plan.locations.pickup.name}</div>
                  <div className="font-semibold text-gray-800">
                    {plan.summary.leg1_miles.toLocaleString()} mi · {formatHours(plan.summary.leg1_hours)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-500 mb-0.5">Leg 2: {plan.locations.pickup.name} → {plan.locations.dropoff.name}</div>
                  <div className="font-semibold text-gray-800">
                    {plan.summary.leg2_miles.toLocaleString()} mi · {formatHours(plan.summary.leg2_hours)}
                  </div>
                </div>
              </div>
            </div>

            {/* ELD Log Sheets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">
                  ELD Daily Log Sheets
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({plan.day_logs.length} sheet{plan.day_logs.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                {/* Day tabs */}
                {plan.day_logs.length > 1 && (
                  <div className="flex gap-1">
                    {plan.day_logs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveDay(i)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          activeDay === i
                            ? 'bg-blue-700 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'
                        }`}
                      >
                        Day {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveDay(-1)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        activeDay === -1
                          ? 'bg-gray-800 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}
              </div>

              {/* Render selected sheet(s) */}
              {(activeDay === -1 ? plan.day_logs : [plan.day_logs[activeDay]]).map((dayLog, idx) => {
                const dayNum = activeDay === -1 ? idx + 1 : activeDay + 1;
                return (
                  <ELDLogSheet
                    key={dayLog.date_offset}
                    dayLog={dayLog}
                    dayNumber={dayNum}
                    stops={plan.stops}
                    driverName="Driver"
                    carrierName="Carrier"
                  />
                );
              })}

              <p className="text-[10px] text-gray-400 text-center pb-2">
                ORIGINAL — Submit to carrier within 13 days · DUPLICATE — Driver retains for 8 days ·
                Logs auto-generated per FMCSA 49 CFR §395.8 · 70-hr/8-day cycle · No adverse driving conditions
              </p>
            </div>
          </>
        )}

        {/* Empty state */}
        {!plan && !loading && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🚛</div>
            <div className="text-sm font-semibold text-gray-700 mb-1">
              Enter your trip details above to get started
            </div>
            <div className="text-xs text-gray-400">
              The planner will compute the optimal HOS-compliant route, mandatory rest stops,
              fuel stops, and auto-generate all required ELD log sheets.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
