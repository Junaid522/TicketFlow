import type { TripDayLog, TripStop, DutyStatus } from '../types/trip';

// ── Grid geometry ─────────────────────────────────────────────────────────────
const LABEL_W = 130;         // left label column
const HOURS_HEADER_H = 32;   // top time labels row
const ROW_H = 40;            // height of each duty-status row
const GRID_H = ROW_H * 4;    // total grid height
const HOUR_W = 30;           // pixels per hour (24h × 30 = 720px)
const GRID_W = HOUR_W * 24;  // 720
const SVG_W = LABEL_W + GRID_W + 60;  // +60 for totals
const SVG_H = HOURS_HEADER_H + GRID_H + 32;  // +24 bottom ticks +8 for total row

const STATUS_ROWS: Record<DutyStatus, number> = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty_not_driving: 3,
};

const STATUS_COLORS: Record<DutyStatus, string> = {
  off_duty: '#6b7280',
  sleeper_berth: '#3b82f6',
  driving: '#16a34a',
  on_duty_not_driving: '#f59e0b',
};

const STATUS_LABELS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty\n(Not Driving)'];

// Hour labels: Mid, 1, 2 … 11, N, 1, 2 … 11, Mid
const HOUR_LABELS = [
  'Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
  'N', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Mid',
];

function slotToX(slot: number): number {
  return LABEL_W + (slot / 4) * HOUR_W;
}

function rowToY(row: number): number {
  return HOURS_HEADER_H + row * ROW_H + ROW_H / 2;
}

// Build a continuous SVG path from 96 duty-status slots
function buildPath(slots: DutyStatus[]): string {
  if (!slots.length) return '';

  // Collapse into periods
  const periods: { status: DutyStatus; start: number; end: number }[] = [];
  let cur = { status: slots[0], start: 0, end: 1 };
  for (let i = 1; i < slots.length; i++) {
    if (slots[i] !== cur.status) {
      periods.push({ ...cur, end: i });
      cur = { status: slots[i], start: i, end: i + 1 };
    } else {
      cur.end = i + 1;
    }
  }
  periods.push(cur);

  let d = '';
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const x1 = slotToX(p.start);
    const x2 = slotToX(p.end);
    const y = rowToY(STATUS_ROWS[p.status]);

    if (i === 0) {
      d += `M ${x1} ${y}`;
    } else {
      // Vertical connector at x1 from previous y to current y
      d += ` L ${x1} ${y}`;
    }
    d += ` L ${x2} ${y}`;
  }
  return d;
}

function computeTotals(slots: DutyStatus[]): Record<DutyStatus, number> {
  const counts: Record<DutyStatus, number> = {
    off_duty: 0, sleeper_berth: 0, driving: 0, on_duty_not_driving: 0,
  };
  for (const s of slots) counts[s]++;
  const result = {} as Record<DutyStatus, number>;
  for (const k of Object.keys(counts) as DutyStatus[]) {
    result[k] = counts[k] * 15 / 60; // convert slots→hours
  }
  return result;
}

function fmtHrs(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : `${hrs}:00`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  dayLog: TripDayLog;
  dayNumber: number;       // 1-indexed display
  startDate?: string;      // ISO date of day 0 (optional, for header)
  stops: TripStop[];       // stops that occur on this day (for remarks)
  driverName?: string;
  truckNumber?: string;
  carrierName?: string;
}

export default function ELDLogSheet({
  dayLog, dayNumber, startDate, stops, driverName = '', truckNumber = '', carrierName = '',
}: Props) {
  const totals = computeTotals(dayLog.slots);
  const path = buildPath(dayLog.slots);

  // Compute date string for this day
  let dateStr = `Day ${dayNumber}`;
  if (startDate) {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + dayLog.date_offset);
    dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Day's stops for remarks
  const dayStops = stops.filter(s => s.arrival_day === dayLog.date_offset);

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-gray-400">
      {/* ── Form Header ─────────────────────────────────────────────────── */}
      <div className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide">Driver's Daily Log</div>
          <div className="text-[10px] opacity-80">Original — FMCSA 49 CFR §395.8 · Property Carrier</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold">{dateStr}</div>
          <div className="text-[10px] opacity-80">Day {dayNumber} of {/* filled by parent */} trip</div>
        </div>
      </div>

      {/* ── Info row ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 grid grid-cols-3 gap-2 border-b border-gray-200 text-xs bg-gray-50">
        {[
          ['Driver', driverName || '—'],
          ['Truck #', truckNumber || '—'],
          ['Carrier', carrierName || '—'],
          ['Miles Today', dayLog.total_miles > 0 ? `${dayLog.total_miles.toFixed(0)} mi` : '0 mi'],
          ['70-hr/8-day', 'Property Carrier'],
          ['No Adverse Cond.', 'No exceptions'],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="font-medium text-gray-800">{val}</span>
          </div>
        ))}
      </div>

      {/* ── SVG Grid ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ fontFamily: 'sans-serif', display: 'block', minWidth: SVG_W }}
        >
          {/* ── Background fills for each row ──────────────────────────── */}
          {[0, 1, 2, 3].map(r => (
            <rect
              key={r}
              x={LABEL_W}
              y={HOURS_HEADER_H + r * ROW_H}
              width={GRID_W}
              height={ROW_H}
              fill={r % 2 === 0 ? '#f9fafb' : '#ffffff'}
            />
          ))}

          {/* ── Status labels (left) ────────────────────────────────────── */}
          {STATUS_LABELS.map((label, r) => {
            const y = HOURS_HEADER_H + r * ROW_H;
            const lines = label.split('\n');
            return (
              <g key={r}>
                <rect x={0} y={y} width={LABEL_W - 2} height={ROW_H} fill="#f3f4f6" />
                <rect
                  x={2} y={y + 4} width={10} height={ROW_H - 8}
                  fill={STATUS_COLORS[Object.keys(STATUS_ROWS)[r] as DutyStatus]}
                  rx={2}
                />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={18}
                    y={y + ROW_H / 2 + (lines.length === 1 ? 4 : li === 0 ? -1 : 11)}
                    fontSize={10}
                    fontWeight="600"
                    fill="#374151"
                  >
                    {line}
                  </text>
                ))}
                <line x1={0} y1={y + ROW_H} x2={LABEL_W - 2} y2={y + ROW_H} stroke="#d1d5db" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* ── Hour labels (top) ───────────────────────────────────────── */}
          {HOUR_LABELS.map((label, h) => {
            const x = LABEL_W + h * HOUR_W;
            return (
              <text
                key={h}
                x={x}
                y={HOURS_HEADER_H - 6}
                fontSize={h === 0 || h === 12 || h === 24 ? 9 : 10}
                fontWeight={h === 0 || h === 12 || h === 24 ? '700' : '400'}
                fill={h === 12 ? '#dc2626' : '#374151'}
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}

          {/* ── Vertical grid lines ─────────────────────────────────────── */}
          {Array.from({ length: 25 }).map((_, h) => {
            const x = LABEL_W + h * HOUR_W;
            const isMajor = h === 0 || h === 6 || h === 12 || h === 18 || h === 24;
            return (
              <line
                key={h}
                x1={x} y1={HOURS_HEADER_H}
                x2={x} y2={HOURS_HEADER_H + GRID_H}
                stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
                strokeWidth={isMajor ? 1 : 0.5}
              />
            );
          })}

          {/* ── 15-min subdivision ticks (bottom of grid) ───────────────── */}
          {Array.from({ length: 96 }).map((_, slot) => {
            const x = slotToX(slot);
            const isHour = slot % 4 === 0;
            return (
              <line
                key={slot}
                x1={x} y1={HOURS_HEADER_H + GRID_H}
                x2={x} y2={HOURS_HEADER_H + GRID_H + (isHour ? 12 : 6)}
                stroke="#9ca3af"
                strokeWidth={isHour ? 1 : 0.5}
              />
            );
          })}
          {/* Last tick */}
          <line
            x1={LABEL_W + GRID_W} y1={HOURS_HEADER_H + GRID_H}
            x2={LABEL_W + GRID_W} y2={HOURS_HEADER_H + GRID_H + 12}
            stroke="#9ca3af" strokeWidth={1}
          />

          {/* ── Horizontal row dividers ──────────────────────────────────── */}
          {[0, 1, 2, 3, 4].map(r => (
            <line
              key={r}
              x1={LABEL_W} y1={HOURS_HEADER_H + r * ROW_H}
              x2={LABEL_W + GRID_W} y2={HOURS_HEADER_H + r * ROW_H}
              stroke="#9ca3af" strokeWidth={r === 0 || r === 4 ? 1.5 : 0.5}
            />
          ))}

          {/* ── The actual duty-status path ──────────────────────────────── */}
          <path
            d={path}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Colored status shading (filled bands) ───────────────────── */}
          {(() => {
            // Build periods and draw filled bands
            const periods: { status: DutyStatus; start: number; end: number }[] = [];
            let cur = { status: dayLog.slots[0] as DutyStatus, start: 0, end: 1 };
            for (let i = 1; i < dayLog.slots.length; i++) {
              if (dayLog.slots[i] !== cur.status) {
                periods.push({ ...cur, end: i });
                cur = { status: dayLog.slots[i] as DutyStatus, start: i, end: i + 1 };
              } else {
                cur.end = i + 1;
              }
            }
            periods.push(cur);

            return periods.map((p, i) => {
              const row = STATUS_ROWS[p.status];
              const x = slotToX(p.start);
              const w = slotToX(p.end) - x;
              return (
                <rect
                  key={i}
                  x={x}
                  y={HOURS_HEADER_H + row * ROW_H + 2}
                  width={w}
                  height={ROW_H - 4}
                  fill={STATUS_COLORS[p.status]}
                  opacity={0.18}
                  rx={1}
                />
              );
            });
          })()}

          {/* ── Totals column ────────────────────────────────────────────── */}
          <rect
            x={LABEL_W + GRID_W}
            y={HOURS_HEADER_H}
            width={55}
            height={GRID_H}
            fill="#f9fafb"
          />
          <text x={LABEL_W + GRID_W + 28} y={HOURS_HEADER_H - 6} fontSize={9} fill="#6b7280" textAnchor="middle" fontWeight="600">
            TOTAL
          </text>
          {(Object.keys(STATUS_ROWS) as DutyStatus[]).map((status, r) => {
            const hrs = totals[status];
            const y = HOURS_HEADER_H + r * ROW_H;
            return (
              <g key={status}>
                <line x1={LABEL_W + GRID_W} y1={y} x2={LABEL_W + GRID_W + 55} y2={y} stroke="#d1d5db" strokeWidth={0.5} />
                <text
                  x={LABEL_W + GRID_W + 28}
                  y={y + ROW_H / 2 + 4}
                  fontSize={11}
                  fontWeight="700"
                  fill={hrs > 0 ? STATUS_COLORS[status] : '#9ca3af'}
                  textAnchor="middle"
                >
                  {fmtHrs(hrs)}
                </text>
              </g>
            );
          })}

          {/* ── Total = 24hr line (FMCSA §395.8 requirement) ────────────── */}
          {(() => {
            const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
            const y = HOURS_HEADER_H + GRID_H;
            return (
              <g>
                <line x1={LABEL_W + GRID_W} y1={y} x2={LABEL_W + GRID_W + 55} y2={y} stroke="#374151" strokeWidth={1} />
                <text
                  x={LABEL_W + GRID_W + 28}
                  y={y + 14}
                  fontSize={9}
                  fontWeight="700"
                  fill={Math.abs(grandTotal - 24) < 0.1 ? '#16a34a' : '#dc2626'}
                  textAnchor="middle"
                >
                  ={fmtHrs(grandTotal)}
                </text>
              </g>
            );
          })()}

          {/* Outer border */}
          <rect
            x={LABEL_W}
            y={HOURS_HEADER_H}
            width={GRID_W + 55}
            height={GRID_H}
            fill="none"
            stroke="#374151"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* ── Remarks / Stops for this day ─────────────────────────────────── */}
      {dayStops.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Remarks / Duty Change Locations
          </div>
          <div className="space-y-1">
            {dayStops.map((stop, i) => {
              const slotTime = (slot: number) => {
                const totalMin = slot * 15;
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
              };
              const typeLabel: Record<string, string> = {
                start: 'Trip Start', pickup: 'Pickup', dropoff: 'Dropoff',
                fuel: 'Fuel Stop', rest: '10hr Rest', break: '30min Break',
              };
              return (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="font-mono text-gray-500 flex-shrink-0 w-16">
                    {slotTime(stop.arrival_slot)}
                  </span>
                  <span className="font-semibold text-gray-700 flex-shrink-0 w-24">
                    {typeLabel[stop.type] ?? stop.type}
                  </span>
                  <span className="text-gray-600 truncate">{stop.location}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Summary footer ───────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 flex gap-6 flex-wrap text-xs text-gray-600">
        {(Object.keys(STATUS_ROWS) as DutyStatus[]).map(s => (
          totals[s] > 0 ? (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              <span className="capitalize">{s.replace(/_/g, ' ')}: </span>
              <span className="font-semibold text-gray-800">{fmtHrs(totals[s])}</span>
            </span>
          ) : null
        ))}
        <span className="ml-auto text-gray-400">
          Total: {fmtHrs(Object.values(totals).reduce((a, b) => a + b, 0))} hrs
        </span>
      </div>
    </div>
  );
}
