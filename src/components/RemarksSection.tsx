import { LogEntry, RemarkEntry, SLOT_MINUTES, STATUS_LABELS, STATUS_COLORS } from '../types/hos';
import { formatMinutes } from '../utils/hosRules';

interface Props {
  log: LogEntry;
  onChange: (updates: Partial<LogEntry>) => void;
}

function updateRemark(remarks: RemarkEntry[], id: string, location: string): RemarkEntry[] {
  return remarks.map(r => (r.id === id ? { ...r, location } : r));
}

export default function RemarksSection({ log, onChange }: Props) {
  const { remarks, slots } = log;

  if (remarks.length === 0) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Remarks</h3>
        <p className="text-xs text-gray-400 italic">
          Draw duty periods on the grid above — location entries will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">
        Remarks — Enter city/town/state where duty status changed
      </h3>

      <div className="space-y-2">
        {remarks.map(remark => {
          const status = slots[remark.slotIndex];
          const timeMin = remark.slotIndex * SLOT_MINUTES;
          return (
            <div key={remark.id} className="flex items-center gap-3">
              <div className="flex-shrink-0 flex items-center gap-2 w-56">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <span className="text-xs font-mono text-gray-500 w-16">{formatMinutes(timeMin)}</span>
                <span className="text-xs text-gray-600 truncate">{STATUS_LABELS[status].replace(/^\d\. /, '')}</span>
              </div>
              <input
                type="text"
                value={remark.location}
                onChange={e =>
                  onChange({ remarks: updateRemark(remarks, remark.id, e.target.value) })
                }
                placeholder="City, State"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-gray-400">
        Per 49 CFR §395.8 — record city, town, or village and state abbreviation at each duty status change.
        For non-municipality locations, record highway number and nearest milepost or intersecting highway.
      </p>
    </div>
  );
}
