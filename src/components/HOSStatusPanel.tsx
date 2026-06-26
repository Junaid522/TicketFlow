import { HOSStatus, HOSViolation } from '../types/hos';
import { formatMinutes } from '../utils/hosRules';

interface Props {
  status: HOSStatus;
}

interface GaugeProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  warnAt?: number;
  dangerAt?: number;
}

function Gauge({ label, used, limit, unit = 'hrs', warnAt, dangerAt }: GaugeProps) {
  const pct = Math.min(100, (used / limit) * 100);
  const remaining = Math.max(0, limit - used);
  const isWarn = warnAt !== undefined && pct >= warnAt;
  const isDanger = dangerAt !== undefined && pct >= dangerAt;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarn
    ? 'bg-yellow-500'
    : 'bg-green-500';

  const textColor = isDanger ? 'text-red-700' : isWarn ? 'text-yellow-700' : 'text-green-700';

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>
          {remaining.toFixed(1)} {unit} left
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
        <span>{used.toFixed(1)} used</span>
        <span>{limit} {unit} limit</span>
      </div>
    </div>
  );
}

const VIOLATION_ICONS: Record<HOSViolation['type'], string> = {
  driving_limit: '🚛',
  window_limit: '⏱️',
  break_required: '☕',
  weekly_limit: '📅',
};

export default function HOSStatusPanel({ status }: Props) {
  const {
    drivingHoursUsed,
    drivingHoursRemaining,
    windowStart,
    windowEnd,
    windowHoursUsed,
    windowHoursRemaining,
    weeklyHoursUsed,
    weeklyHoursRemaining,
    onDutyHoursToday,
    cumulativeDrivingSinceBreak,
    breakNeeded,
    violations,
  } = status;

  const weeklyLimit = weeklyHoursUsed + weeklyHoursRemaining;

  return (
    <div className="flex flex-col gap-4">
      {/* Violations */}
      {violations.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-lg p-3">
          <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
            HOS Violations
          </h4>
          <ul className="space-y-1.5">
            {violations.map((v, i) => (
              <li key={i} className="flex gap-2 text-xs text-red-700">
                <span>{VIOLATION_ICONS[v.type]}</span>
                <span>{v.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Break Warning */}
      {breakNeeded && violations.every(v => v.type !== 'break_required') && (
        <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-yellow-800">
            ☕ 30-minute break required before driving
          </p>
          <p className="text-[10px] text-yellow-600 mt-1">
            {cumulativeDrivingSinceBreak.toFixed(1)}h cumulative driving since last break
          </p>
        </div>
      )}

      {/* HOS Gauges */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
          Hours Remaining Today
        </h4>

        <Gauge
          label="Driving (11-hr limit)"
          used={drivingHoursUsed}
          limit={11}
          warnAt={72}
          dangerAt={91}
        />
        <Gauge
          label="Driving Window (14-hr)"
          used={windowHoursUsed}
          limit={14}
          warnAt={71}
          dangerAt={93}
        />
        <Gauge
          label={`Weekly (${weeklyLimit >= 65 ? '70-hr/8-day' : '60-hr/7-day'})`}
          used={weeklyHoursUsed}
          limit={weeklyLimit}
          warnAt={80}
          dangerAt={93}
        />

        {/* Break progress */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-medium text-gray-600">Break Countdown (8-hr trigger)</span>
            <span className={`text-xs font-mono ${breakNeeded ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
              {breakNeeded ? 'BREAK NEEDED' : `${cumulativeDrivingSinceBreak.toFixed(1)} / 8 hrs`}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                breakNeeded ? 'bg-red-500' : cumulativeDrivingSinceBreak >= 7 ? 'bg-yellow-500' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(100, (cumulativeDrivingSinceBreak / 8) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Window info */}
      {windowStart !== null && (
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Driving Window
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Window opened</span>
              <span className="font-mono">{formatMinutes(windowStart)}</span>
            </div>
            {windowEnd !== null && (
              <div className="flex justify-between">
                <span>Window closes</span>
                <span className={`font-mono font-semibold ${windowHoursRemaining <= 1 ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatMinutes(Math.min(windowEnd, 1440))}
                  {windowEnd > 1440 ? ' (+next day)' : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Remaining in window</span>
              <span className="font-mono font-semibold text-blue-700">
                {windowHoursRemaining.toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today summary */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
          Today's Summary
        </h4>
        <div className="space-y-1 text-xs">
          {[
            ['Driving time', `${drivingHoursUsed.toFixed(1)} hrs`],
            ['On-duty (total)', `${onDutyHoursToday.toFixed(1)} hrs`],
            ['Available to drive', `${drivingHoursRemaining.toFixed(1)} hrs`],
            ['Weekly used', `${weeklyHoursUsed.toFixed(1)} hrs`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-gray-600">
              <span>{label}</span>
              <span className="font-mono font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
