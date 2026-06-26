export type DutyStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
export type ScheduleType = '60_7' | '70_8';

export const SLOT_COUNT = 96;   // 24 hours × 4 (15-min intervals)
export const SLOT_MINUTES = 15;

export const STATUS_LABELS: Record<DutyStatus, string> = {
  off_duty: '1. Off Duty',
  sleeper_berth: '2. Sleeper Berth',
  driving: '3. Driving',
  on_duty_not_driving: '4. On Duty (Not Driving)',
};

export const STATUS_COLORS: Record<DutyStatus, string> = {
  off_duty: '#e5e7eb',
  sleeper_berth: '#93c5fd',
  driving: '#4ade80',
  on_duty_not_driving: '#fcd34d',
};

export const STATUS_TAILWIND: Record<DutyStatus, string> = {
  off_duty: 'bg-gray-200',
  sleeper_berth: 'bg-blue-300',
  driving: 'bg-green-400',
  on_duty_not_driving: 'bg-yellow-300',
};

export interface DutyPeriod {
  status: DutyStatus;
  start: number; // minutes from midnight [0, 1425]
  end: number;   // minutes from midnight [15, 1440]
}

export interface RemarkEntry {
  id: string;
  slotIndex: number;
  location: string;
}

export interface LogEntry {
  date: string;
  slots: DutyStatus[];
  remarks: RemarkEntry[];
  totalMilesDriving: number;
  truckNumber: string;
  trailerNumber: string;
  carrierName: string;
  mainOfficeAddress: string;
  coDriver: string;
  shippingDocuments: string;
  adverseConditions: boolean;
  driverName: string;
}

export interface HOSViolation {
  type: 'driving_limit' | 'window_limit' | 'break_required' | 'weekly_limit';
  message: string;
}

export interface HOSStatus {
  drivingHoursUsed: number;
  drivingHoursRemaining: number;
  windowStart: number | null;
  windowEnd: number | null;
  windowHoursUsed: number;
  windowHoursRemaining: number;
  onDutyHoursToday: number;
  weeklyHoursUsed: number;
  weeklyHoursRemaining: number;
  cumulativeDrivingSinceBreak: number;
  breakNeeded: boolean;
  violations: HOSViolation[];
}

export interface RecapValues {
  a: number;   // on-duty hours today
  b: number;   // rolling total (all days in window including today)
  aStar: number; // oldest day hours (drops off tomorrow)
  c: number;   // hours available tomorrow
}
