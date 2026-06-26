import { useState, useCallback, useRef } from 'react';
import {
  DutyStatus, SLOT_COUNT, STATUS_LABELS, STATUS_COLORS,
  STATUS_TAILWIND, SLOT_MINUTES,
} from '../types/hos';
import { formatMinutes } from '../utils/hosRules';

interface Props {
  slots: DutyStatus[];
  onChange: (slots: DutyStatus[]) => void;
  windowStart: number | null;
  windowEnd: number | null;
}

interface DragState {
  status: DutyStatus;
  startCell: number;
  currentCell: number;
}

const ROWS: DutyStatus[] = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'];

const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => {
  if (i === 0 || i === 24) return 'Mid';
  if (i === 12) return 'Noon';
  return i > 12 ? String(i - 12) : String(i);
});

function slotTotalHours(slots: DutyStatus[], status: DutyStatus): string {
  const count = slots.filter(s => s === status).length;
  return (count * SLOT_MINUTES / 60).toFixed(2);
}

export default function DutyGrid({ slots, onChange, windowStart, windowEnd }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const isMouseDown = useRef(false);

  const getEffectiveSlot = useCallback(
    (cellIndex: number): DutyStatus => {
      if (drag) {
        const lo = Math.min(drag.startCell, drag.currentCell);
        const hi = Math.max(drag.startCell, drag.currentCell);
        if (cellIndex >= lo && cellIndex <= hi) return drag.status;
      }
      return slots[cellIndex];
    },
    [drag, slots],
  );

  const handleMouseDown = useCallback((status: DutyStatus, cell: number) => {
    isMouseDown.current = true;
    setDrag({ status, startCell: cell, currentCell: cell });
  }, []);

  const handleMouseEnter = useCallback(
    (cell: number) => {
      if (!isMouseDown.current || !drag) return;
      setDrag(prev => (prev ? { ...prev, currentCell: cell } : null));
    },
    [drag],
  );

  const commitDrag = useCallback(() => {
    if (!drag) return;
    const lo = Math.min(drag.startCell, drag.currentCell);
    const hi = Math.max(drag.startCell, drag.currentCell);
    const next = [...slots];
    for (let i = lo; i <= hi; i++) next[i] = drag.status;
    onChange(next);
    setDrag(null);
    isMouseDown.current = false;
  }, [drag, slots, onChange]);

  const handleContextMenu = useCallback(
    (cell: number, e: React.MouseEvent) => {
      e.preventDefault();
      const next = [...slots];
      next[cell] = 'off_duty';
      onChange(next);
    },
    [slots, onChange],
  );

  // Window overlay: which cells are inside/outside the 14-hr window
  const windowStartCell = windowStart !== null ? Math.floor(windowStart / SLOT_MINUTES) : null;
  const windowEndCell = windowEnd !== null ? Math.ceil(windowEnd / SLOT_MINUTES) : null;

  return (
    <div
      className="overflow-x-auto"
      onMouseUp={commitDrag}
      onMouseLeave={commitDrag}
    >
      <div className="min-w-[900px]">
        {/* Hour labels */}
        <div className="flex ml-[180px] mr-[52px]">
          {HOUR_LABELS.slice(0, 24).map((label, h) => (
            <div
              key={h}
              className="text-[10px] text-gray-500 text-center border-l border-gray-300"
              style={{ width: `${100 / 24}%` }}
            >
              {label}
            </div>
          ))}
          <div className="text-[10px] text-gray-500 text-center">Mid</div>
        </div>

        {/* Grid rows */}
        {ROWS.map(rowStatus => (
          <div key={rowStatus} className="flex items-stretch border-b border-gray-300">
            {/* Row label */}
            <div
              className="w-[180px] flex-shrink-0 flex items-center px-2 py-1 text-xs font-medium text-gray-700 border-r border-gray-300 bg-gray-50"
            >
              <span
                className="inline-block w-3 h-3 rounded-sm mr-2 flex-shrink-0 border border-gray-300"
                style={{ backgroundColor: STATUS_COLORS[rowStatus] }}
              />
              {STATUS_LABELS[rowStatus]}
            </div>

            {/* Cells */}
            <div className="flex flex-1">
              {Array.from({ length: SLOT_COUNT }, (_, i) => {
                const effective = getEffectiveSlot(i);
                const isThisRow = effective === rowStatus;
                const hourBorder = i % 4 === 0 && i > 0;
                const isInWindow =
                  windowStartCell !== null &&
                  windowEndCell !== null &&
                  i >= windowStartCell &&
                  i < windowEndCell;
                const isOutsideWindow =
                  windowEndCell !== null && i >= windowEndCell;

                return (
                  <div
                    key={i}
                    title={`${formatMinutes(i * SLOT_MINUTES)} — ${STATUS_LABELS[rowStatus]}`}
                    className={[
                      'grid-cell flex-1',
                      isThisRow ? STATUS_TAILWIND[rowStatus] : 'bg-white',
                      hourBorder ? 'border-l border-gray-400' : 'border-l border-gray-100',
                      isOutsideWindow ? 'opacity-40' : '',
                      isInWindow && !isThisRow ? '' : '',
                    ].join(' ')}
                    onMouseDown={() => handleMouseDown(rowStatus, i)}
                    onMouseEnter={() => handleMouseEnter(i)}
                    onContextMenu={e => handleContextMenu(i, e)}
                  />
                );
              })}
            </div>

            {/* Total hours */}
            <div className="w-[52px] flex-shrink-0 flex items-center justify-center text-xs font-mono border-l border-gray-300 bg-gray-50">
              {slotTotalHours(
                drag
                  ? Array.from({ length: SLOT_COUNT }, (_, i) => getEffectiveSlot(i))
                  : slots,
                rowStatus,
              )}
            </div>
          </div>
        ))}

        {/* Total row */}
        <div className="flex border-b border-gray-300 bg-gray-50">
          <div className="w-[180px] flex-shrink-0 px-2 py-1 text-xs font-bold text-right border-r border-gray-300 text-gray-700">
            TOTAL HOURS
          </div>
          <div className="flex-1" />
          <div className="w-[52px] flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold border-l border-gray-300">
            24.00
          </div>
        </div>

        {/* Legend / instructions */}
        <div className="flex gap-4 mt-2 px-2 text-xs text-gray-400 flex-wrap">
          {ROWS.map(s => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              {STATUS_LABELS[s].replace(/^\d\. /, '')}
            </span>
          ))}
          <span className="ml-auto">Left-drag to draw · Right-click to clear</span>
        </div>
      </div>
    </div>
  );
}
