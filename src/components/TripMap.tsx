import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TripPlan, TripStop } from '../types/trip';

// Fix Leaflet default icon broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STOP_COLORS: Record<string, string> = {
  start:   '#1d4ed8',
  pickup:  '#16a34a',
  dropoff: '#dc2626',
  fuel:    '#d97706',
  rest:    '#7c3aed',
  break:   '#0891b2',
};

const STOP_LABELS: Record<string, string> = {
  start:   'Start',
  pickup:  'Pickup',
  dropoff: 'Dropoff',
  fuel:    'Fuel',
  rest:    '10hr Rest',
  break:   '30min Break',
};

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color};
        color:white;
        font-size:10px;
        font-weight:700;
        padding:3px 6px;
        border-radius:4px;
        white-space:nowrap;
        box-shadow:0 1px 4px rgba(0,0,0,0.3);
        font-family:sans-serif;
      ">${label}</div>`,
    iconAnchor: [0, 0],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Props {
  plan: TripPlan;
}

export default function TripMap({ plan }: Props) {
  const coords: [number, number][] = plan.route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng],
  );

  const allPoints: [number, number][] = [
    ...coords,
    ...plan.stops.map(s => [s.lat, s.lng] as [number, number]),
  ];

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Route Map</h3>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>
            <span className="font-semibold text-gray-800">{plan.route.distance_miles.toLocaleString()}</span> mi
          </span>
          <span>
            <span className="font-semibold text-gray-800">{formatDuration(plan.route.duration_hours)}</span> drive time
          </span>
          <span>
            <span className="font-semibold text-gray-800">{plan.summary.total_days}</span> day{plan.summary.total_days !== 1 ? 's' : ''} trip
          </span>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={allPoints} />

        {/* Route polyline */}
        <Polyline positions={coords} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }} />

        {/* Stop markers */}
        {plan.stops.map((stop: TripStop, i: number) => {
          const color = STOP_COLORS[stop.type] ?? '#6b7280';
          const label = STOP_LABELS[stop.type] ?? stop.type;
          return (
            <Marker
              key={i}
              position={[stop.lat, stop.lng]}
              icon={makeIcon(color, label)}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold mb-1" style={{ color }}>{label}</div>
                  <div className="text-gray-700">{stop.location}</div>
                  {stop.duration_hours > 0 && (
                    <div className="text-gray-500 mt-1">
                      Duration: {formatDuration(stop.duration_hours)}
                    </div>
                  )}
                  <div className="text-gray-500">
                    At mile: {stop.miles_from_start.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(STOP_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: STOP_COLORS[type] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
