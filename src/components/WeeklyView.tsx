import { LogEntry, ScheduleType, STATUS_COLORS } from '../types/hos';
import { slotsOnDutyMinutes, slotsDrivingMinutes } from '../utils/hosRules';

interface Props {
  allLogs: LogEntry[];
  currentDate: string;
  schedule: ScheduleType;
  onSelectDate: (date: string) => void;
}

const SCHEDULE_CONFIG = {
  '60_7': { days: 7, limit: 60 },
  '70_8': { days: 8, limit: 70 },
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

function buildWindow(allLogs: LogEntry[], currentDate: string, days: number): LogEntry[] {
  // Build a window of `days` entries ending at currentDate
  const result: LogEntry[] = [];
  const cur = new Date(currentDate + 'T00:00:00');
  const map = new Map(allLogs.map(l => [l.date, l]));

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cur);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    result.push(map.get(iso) ?? {
      date: iso,
      slots: Array(96).fill('off_duty'),
      remarks: [], totalMilesDriving: 0, truckNumber: '', trailerNumber: '',
      carrierName: '', mainOfficeAddress: '', coDriver: '', shippingDocuments: '',
      adverseConditions: false, driverName: '',
    });
  }
  return result;
}

export default function WeeklyView({ allLogs, currentDate, schedule, onSelectDate }: Props) {
  const { days, limit } = SCHEDULE_CONFIG[schedule];
  const window = buildWindow(allLogs, currentDate, days);
  const totalOnDuty = window.reduce((acc, l) => acc + slotsOnDutyMinutes(l.slots), 0) / 60;

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
          {days}-Day Rolling Window
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            Total on-duty:{' '}
            <span className={`font-bold font-mono ${totalOnDuty > limit ? 'text-red-600' : 'text-gray-800'}`}>
              {totalOnDuty.toFixed(1)} / {limit} hrs
            </span>
          </span>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${totalOnDuty >= limit ? 'bg-red-500' : totalOnDuty >= limit * 0.85 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (totalOnDuty / limit) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
        {window.map(log => {
          const onDutyHrs = slotsOnDutyMinutes(log.slots) / 60;
          const drivingHrs = slotsDrivingMinutes(log.slots) / 60;
          const isToday = log.date === currentDate;
          const barPct = Math.min(100, (onDutyHrs / 14) * 100); // scale to max daily 14hr

          return (
            <button
              key={log.date}
              onClick={() => onSelectDate(log.date)}
              className={`rounded-lg border p-2 text-left transition-all hover:border-blue-400 ${
                isToday
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-semibold text-gray-600 mb-1">
                {formatDate(log.date)}
                {isToday && <span className="ml-1 text-blue-600">(today)</span>}
              </div>

              {/* Mini duty bar */}
              <div className="h-4 bg-gray-100 rounded-sm overflow-hidden flex mb-1">
                {log.slots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: STATUS_COLORS[slot] }}
                  />
                ))}
              </div>

              <div className="text-[10px] text-gray-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Driving</span>
                  <span className="font-mono">{drivingHrs.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span>On-duty</span>
                  <span className={`font-mono ${onDutyHrs > 14 ? 'text-red-600 font-bold' : ''}`}>
                    {onDutyHrs.toFixed(1)}h
                  </span>
                </div>
              </div>

              {/* On-duty bar */}
              <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${onDutyHrs > 14 ? 'bg-red-500' : 'bg-blue-400'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
