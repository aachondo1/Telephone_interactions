import type { CallRecord } from '../supabase';

// ============================================================================
// GLOBAL BUSINESS RULES
// ============================================================================
export const MIN_QUEUE_TIME_TO_COUNT = 1;
export const SHORT_ABANDON_THRESHOLD = 10;

// ============================================================================
// FORMATTING
// ============================================================================
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isInbound(direction: string): boolean {
  const d = (direction || '').toLowerCase();
  return d === 'inbound' || d === 'entrante';
}

// ============================================================================
// UNIFIED OPERATIONAL STATES
// ============================================================================
export function getUnifiedQueueBase(records: CallRecord[]): CallRecord[] {
  return records.filter(r => {
    const isInboundDir = (r.call_direction || '').toLowerCase() === 'inbound' ||
                         (r.call_direction || '').toLowerCase() === 'entrante';
    const reachedQueue = r.flow_exit !== false;
    const enoughQueueTime = (r.queue_time_seconds ?? 0) >= MIN_QUEUE_TIME_TO_COUNT;
    return isInboundDir && reachedQueue && enoughQueueTime;
  });
}

export function getUnifiedStates(queueBase: CallRecord[]) {
  return {
    notAssigned: queueBase.filter(r =>
      (r.alert_time_seconds ?? 0) === 0 &&
      (r.conversation_total_seconds ?? 0) === 0 &&
      (r.queue_time_seconds ?? 0) >= SHORT_ABANDON_THRESHOLD
    ),
    assignedNoConversation: queueBase.filter(r =>
      (r.alert_time_seconds ?? 0) > 0 &&
      (r.conversation_total_seconds ?? 0) === 0 &&
      (r.queue_time_seconds ?? 0) >= SHORT_ABANDON_THRESHOLD
    ),
    conversationReal: queueBase.filter(r =>
      (r.conversation_total_seconds ?? 0) > 0
    ),
    assigned: queueBase.filter(r => (r.alert_time_seconds ?? 0) > 0),
  };
}

// ============================================================================
// TIME HELPERS
// ============================================================================
export function timeStringToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function countWorkingDaysInRange(
  startDate: string,
  endDate: string
): { mondayToThursday: number; fridays: number } {
  let mondayToThursday = 0;
  let fridays = 0;

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      mondayToThursday++;
    } else if (dayOfWeek === 5) {
      fridays++;
    }
  }

  return { mondayToThursday, fridays };
}

export function calculateErlangsDivisor(startDate: string, endDate: string): number {
  const { mondayToThursday, fridays } = countWorkingDaysInRange(startDate, endDate);
  const totalWorkingHours = mondayToThursday * 8 + fridays * 6;
  return Math.max(1, totalWorkingHours * 3600);
}

// ============================================================================
// DATE HELPERS
// ============================================================================
export const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function weekLabel(mondayKey: string): string {
  const d = new Date(mondayKey + 'T00:00:00');
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[parseInt(month) - 1]} ${year}`;
}

// ============================================================================
// PHONE HELPERS
// ============================================================================
export function isMobileNumber(aniMasked: string): boolean {
  return aniMasked.startsWith('+569');
}
