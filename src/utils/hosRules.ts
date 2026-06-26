import {
  DutyStatus, DutyPeriod, HOSStatus, HOSViolation,
  LogEntry, ScheduleType, SLOT_MINUTES, RecapValues,
} from '../types/hos';

const DRIVING_LIMIT_MIN = 11 * 60;
const WINDOW_LIMIT_MIN = 14 * 60;
const BREAK_TRIGGER_MIN = 8 * 60;
const BREAK_MIN_DURATION = 30;
const SCHEDULE_LIMITS: Record<ScheduleType, { days: number; limitMin: number }> = {
  '60_7': { days: 7, limitMin: 60 * 60 },
  '70_8': { days: 8, limitMin: 70 * 60 },
};

export function slotsToPeriods(slots: DutyStatus[]): DutyPeriod[] {
  if (!slots.length) return [];
  const periods: DutyPeriod[] = [];
  let start = 0;
  for (let i = 1; i <= slots.length; i++) {
    if (i === slots.length || slots[i] !== slots[start]) {
      periods.push({ status: slots[start], start: start * SLOT_MINUTES, end: i * SLOT_MINUTES });
      start = i;
    }
  }
  return periods;
}

function sumMin(periods: DutyPeriod[], ...statuses: DutyStatus[]): number {
  return periods
    .filter(p => statuses.includes(p.status))
    .reduce((acc, p) => acc + (p.end - p.start), 0);
}

export function slotsOnDutyMinutes(slots: DutyStatus[]): number {
  return slots.filter(s => s === 'driving' || s === 'on_duty_not_driving').length * SLOT_MINUTES;
}

export function slotsDrivingMinutes(slots: DutyStatus[]): number {
  return slots.filter(s => s === 'driving').length * SLOT_MINUTES;
}

function computeBreak(slots: DutyStatus[]): {
  cumulativeDriving: number;
  breakNeeded: boolean;
  hasViolation: boolean;
} {
  let cumDriving = 0;          // minutes since last valid break
  let nonDrivingStreak = 0;    // consecutive non-driving minutes
  let hasViolation = false;

  for (const slot of slots) {
    if (slot === 'driving') {
      if (nonDrivingStreak >= BREAK_MIN_DURATION) {
        cumDriving = 0;         // valid break just ended, reset
        hasViolation = false;
      }
      nonDrivingStreak = 0;
      cumDriving += SLOT_MINUTES;
      if (cumDriving > BREAK_TRIGGER_MIN) {
        hasViolation = true;
      }
    } else {
      nonDrivingStreak += SLOT_MINUTES;
    }
  }

  // Ended in valid non-driving streak — break satisfied
  if (nonDrivingStreak >= BREAK_MIN_DURATION) {
    cumDriving = 0;
    hasViolation = false;
  }

  return {
    cumulativeDriving: cumDriving,
    breakNeeded: cumDriving >= BREAK_TRIGGER_MIN,
    hasViolation,
  };
}

export function computeHOS(
  currentLog: LogEntry,
  previousLogs: LogEntry[],
  schedule: ScheduleType,
): HOSStatus {
  const periods = slotsToPeriods(currentLog.slots);
  const { days, limitMin } = SCHEDULE_LIMITS[schedule];
  const adverse = currentLog.adverseConditions;
  const drivingLimit = DRIVING_LIMIT_MIN + (adverse ? 120 : 0);
  const windowLimit = WINDOW_LIMIT_MIN + (adverse ? 120 : 0);

  // Driving hours today
  const drivingMin = sumMin(periods, 'driving');
  const drivingHoursUsed = drivingMin / 60;
  const drivingHoursRemaining = Math.max(0, (drivingLimit - drivingMin) / 60);

  // 14-hour window
  const firstActive = periods.find(
    p => p.status === 'driving' || p.status === 'on_duty_not_driving',
  );
  const windowStart = firstActive?.start ?? null;
  const windowEnd = windowStart !== null ? windowStart + windowLimit : null;
  const windowHoursUsed = windowStart !== null
    ? Math.min((1440 - windowStart), windowLimit) / 60
    : 0;
  const windowHoursRemaining = windowEnd !== null
    ? Math.max(0, (windowEnd - 1440) / 60)
    : windowLimit / 60;

  // On-duty hours today
  const onDutyMin = sumMin(periods, 'driving', 'on_duty_not_driving');
  const onDutyHoursToday = onDutyMin / 60;

  // Weekly hours (rolling window)
  const relevantPrev = previousLogs.slice(-(days - 1));
  const prevMin = relevantPrev.reduce((acc, l) => acc + slotsOnDutyMinutes(l.slots), 0);
  const weeklyMin = prevMin + onDutyMin;
  const weeklyHoursUsed = weeklyMin / 60;
  const weeklyHoursRemaining = Math.max(0, (limitMin - weeklyMin) / 60);

  // Break status
  const { cumulativeDriving, breakNeeded, hasViolation: breakViolation } = computeBreak(currentLog.slots);

  // Violations
  const violations: HOSViolation[] = [];

  if (drivingMin > drivingLimit) {
    const over = ((drivingMin - drivingLimit) / 60).toFixed(1);
    violations.push({
      type: 'driving_limit',
      message: `Exceeded ${drivingLimit / 60}-hr driving limit by ${over}h`,
    });
  }

  if (windowEnd !== null && windowEnd < 1440) {
    const drivingAfter = periods.find(p => p.status === 'driving' && p.start >= windowEnd);
    if (drivingAfter) {
      violations.push({
        type: 'window_limit',
        message: `Driving after ${windowLimit / 60}-hr window closed`,
      });
    }
  }

  if (breakViolation) {
    violations.push({
      type: 'break_required',
      message: '30-min break required after 8 cumulative driving hours',
    });
  }

  if (weeklyMin > limitMin) {
    const over = ((weeklyMin - limitMin) / 60).toFixed(1);
    violations.push({
      type: 'weekly_limit',
      message: `Exceeded ${limitMin / 60}-hr/${days}-day limit by ${over}h`,
    });
  }

  return {
    drivingHoursUsed,
    drivingHoursRemaining: Math.min(drivingHoursRemaining, Math.max(0, windowHoursRemaining)),
    windowStart,
    windowEnd,
    windowHoursUsed,
    windowHoursRemaining: Math.max(0, windowHoursRemaining),
    onDutyHoursToday,
    weeklyHoursUsed,
    weeklyHoursRemaining,
    cumulativeDrivingSinceBreak: cumulativeDriving / 60,
    breakNeeded,
    violations,
  };
}

export function computeRecap(
  currentLog: LogEntry,
  previousLogs: LogEntry[],
  schedule: ScheduleType,
): RecapValues {
  const { days, limitMin } = SCHEDULE_LIMITS[schedule];
  const a = slotsOnDutyMinutes(currentLog.slots) / 60;

  const window = previousLogs.slice(-(days - 1));
  const prevTotal = window.reduce((acc, l) => acc + slotsOnDutyMinutes(l.slots), 0);
  const b = prevTotal / 60 + a;

  // A* = oldest day that drops off tomorrow
  const oldest = previousLogs.slice(-(days - 1))[0];
  const aStar = oldest ? slotsOnDutyMinutes(oldest.slots) / 60 : 0;

  // C = available tomorrow (B minus A* = tomorrow's running total; limit - that = available)
  const c = Math.max(0, limitMin / 60 - (b - aStar));

  return { a, b, aStar, c };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatHours(hours: number): string {
  return hours.toFixed(1);
}

export function detectStatusChanges(slots: DutyStatus[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < slots.length; i++) {
    if (slots[i] !== slots[i - 1]) changes.push(i);
  }
  return changes;
}
