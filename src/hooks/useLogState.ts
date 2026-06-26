import { useState, useEffect, useMemo, useCallback } from 'react';
import { LogEntry, DutyStatus, SLOT_COUNT, ScheduleType, RemarkEntry } from '../types/hos';
import { detectStatusChanges } from '../utils/hosRules';

const STORAGE_KEY = 'hos-log-data-v1';

export function createEmptyLog(date: string): LogEntry {
  return {
    date,
    slots: Array<DutyStatus>(SLOT_COUNT).fill('off_duty'),
    remarks: [],
    totalMilesDriving: 0,
    truckNumber: '',
    trailerNumber: '',
    carrierName: '',
    mainOfficeAddress: '',
    coDriver: '',
    shippingDocuments: '',
    adverseConditions: false,
    driverName: '',
  };
}

function syncRemarks(log: LogEntry): LogEntry {
  const changes = detectStatusChanges(log.slots);
  const existingMap = new Map(log.remarks.map(r => [r.slotIndex, r]));

  // Keep remarks that still correspond to status changes; add new ones
  const remarks: RemarkEntry[] = changes.map(idx => {
    if (existingMap.has(idx)) return existingMap.get(idx)!;
    return { id: `${idx}-${Date.now()}-${Math.random()}`, slotIndex: idx, location: '' };
  });

  // Always include slot 0 (start of day)
  if (!existingMap.has(0)) {
    remarks.unshift({ id: `0-start`, slotIndex: 0, location: '' });
  } else {
    if (!remarks.find(r => r.slotIndex === 0)) {
      remarks.unshift(existingMap.get(0)!);
    }
  }

  return { ...log, remarks: remarks.sort((a, b) => a.slotIndex - b.slotIndex) };
}

function loadFromStorage(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LogEntry[];
  } catch {
    // ignore
  }
  return [];
}

export function useLogState() {
  const [logs, setLogs] = useState<LogEntry[]>(loadFromStorage);
  const [currentDate, setCurrentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  );
  const [schedule, setSchedule] = useState<ScheduleType>('70_8');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const currentLog = useMemo<LogEntry>(() => {
    return logs.find(l => l.date === currentDate) ?? createEmptyLog(currentDate);
  }, [logs, currentDate]);

  const previousLogs = useMemo<LogEntry[]>(() => {
    return logs
      .filter(l => l.date < currentDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, currentDate]);

  const updateLog = useCallback(
    (updates: Partial<LogEntry>) => {
      setLogs(prev => {
        const idx = prev.findIndex(l => l.date === currentDate);
        let updated = { ...currentLog, ...updates };
        if ('slots' in updates) updated = syncRemarks(updated);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    [currentDate, currentLog],
  );

  const navigateDate = useCallback(
    (days: number) => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + days);
      setCurrentDate(d.toISOString().split('T')[0]);
    },
    [currentDate],
  );

  const allLogsForWeekly = useMemo<LogEntry[]>(() => {
    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  return {
    currentLog,
    previousLogs,
    schedule,
    setSchedule,
    updateLog,
    currentDate,
    setCurrentDate,
    navigateDate,
    allLogsForWeekly,
  };
}
