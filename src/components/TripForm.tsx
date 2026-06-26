import { useState } from 'react';
import type { TripFormValues } from '../types/trip';

interface Props {
  onSubmit: (values: TripFormValues) => void;
  loading: boolean;
  error: string | null;
}

const EXAMPLES = [
  { label: 'Chicago → Dallas', current: 'Chicago, IL', pickup: 'St. Louis, MO', dropoff: 'Dallas, TX', cycle: '20' },
  { label: 'LA → Denver', current: 'Los Angeles, CA', pickup: 'Las Vegas, NV', dropoff: 'Denver, CO', cycle: '0' },
  { label: 'NYC → Atlanta', current: 'New York, NY', pickup: 'Philadelphia, PA', dropoff: 'Atlanta, GA', cycle: '35' },
];

export default function TripForm({ onSubmit, loading, error }: Props) {
  const [form, setForm] = useState<TripFormValues>({
    currentLocation: '',
    pickupLocation: '',
    dropoffLocation: '',
    currentCycleHours: '0',
  });

  const set = (key: keyof TripFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setForm({
      currentLocation: ex.current,
      pickupLocation: ex.pickup,
      dropoffLocation: ex.dropoff,
      currentCycleHours: ex.cycle,
    });
  };

  const cycleHours = parseFloat(form.currentCycleHours) || 0;
  const cycleRemaining = Math.max(0, 70 - cycleHours);

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          HOS
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Trip Planner</h2>
          <p className="text-xs text-gray-500">Auto-generates HOS-compliant ELD logs for your route</p>
        </div>
      </div>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs text-gray-400 self-center">Quick load:</span>
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            type="button"
            onClick={() => loadExample(ex)}
            className="text-xs px-2.5 py-1 border border-blue-300 text-blue-700 rounded-full hover:bg-blue-50 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Locations grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Current Location
            </label>
            <input
              type="text"
              value={form.currentLocation}
              onChange={set('currentLocation')}
              placeholder="e.g. Chicago, IL"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Pickup Location
            </label>
            <input
              type="text"
              value={form.pickupLocation}
              onChange={set('pickupLocation')}
              placeholder="e.g. St. Louis, MO"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Dropoff Location
            </label>
            <input
              type="text"
              value={form.dropoffLocation}
              onChange={set('dropoffLocation')}
              placeholder="e.g. Dallas, TX"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
            />
          </div>
        </div>

        {/* Cycle hours */}
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Current Cycle Used (Hrs)
            </label>
            <input
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={form.currentCycleHours}
              onChange={set('currentCycleHours')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          {/* Cycle bar */}
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{cycleHours.toFixed(1)} hrs used</span>
              <span className={cycleRemaining < 10 ? 'text-red-600 font-semibold' : ''}>
                {cycleRemaining.toFixed(1)} hrs remaining
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  cycleHours >= 65 ? 'bg-red-500' : cycleHours >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (cycleHours / 70) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">70-hr / 8-day cycle</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
            <span className="font-semibold">Error: </span>{error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Planning route (geocoding + routing)...
            </>
          ) : (
            'Plan Trip & Generate ELD Logs'
          )}
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          Uses OpenStreetMap (Nominatim) for geocoding and OSRM for routing — no API key required
        </p>
      </form>
    </div>
  );
}
