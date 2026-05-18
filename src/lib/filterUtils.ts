export type FilterState = {
  dateStart: string;
  dateEnd: string;
  dateRange: 'custom' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter';
  departments: string[];
  queues: string[];
  executives: string[];
  attendedStatus: ('attended' | 'unattended' | 'unassigned')[];
  direction: ('inbound' | 'outbound')[];
  abandonType: ('queue' | 'alert' | 'ivr')[];
};

export const DEFAULT_FILTERS: FilterState = {
  dateStart: '',
  dateEnd: '',
  dateRange: 'custom',
  departments: [],
  queues: [],
  executives: [],
  attendedStatus: [],
  direction: [],
  abandonType: [],
};

export function getDateRangeForRelative(range: FilterState['dateRange']): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (range) {
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastWeek': {
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    default:
      return { start: '', end: '' };
  }
}

export function getEffectiveDateRange(filters: FilterState): { start: string; end: string } {
  if (filters.dateRange === 'custom') {
    return { start: filters.dateStart, end: filters.dateEnd };
  }
  return getDateRangeForRelative(filters.dateRange);
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  if (start && end && start !== end) return `${fmt(start)} — ${fmt(end)}`;
  return fmt(start ?? end ?? '');
}

export function isInbound(direction: string): boolean {
  const d = (direction || '').toLowerCase();
  return d === 'inbound' || d === 'entrante';
}

export function isBusinessHours(r: { call_date?: string | null; call_hour?: number | null }): boolean {
  if (!r.call_date || r.call_hour === null || r.call_hour === undefined) return true;
  const day = new Date(r.call_date + 'T00:00:00').getDay();
  if (day === 0 || day === 6) return false;
  if (day >= 1 && day <= 4) return r.call_hour >= 8 && r.call_hour < 19;
  if (day === 5) return r.call_hour >= 8 && r.call_hour < 15;
  return false;
}

export function applyFilters<T extends {
  call_date?: string | null;
  call_hour?: number | null;
  queue?: string | null;
  attended?: boolean | null;
  executive?: string | null;
  call_direction?: string | null;
  abandon_type?: string | null;
}>(records: T[], filters: FilterState, skipDateFilter = false): T[] {
  const { start, end } = getEffectiveDateRange(filters);

  return records.filter(r => {
    if (!isBusinessHours(r)) return false;
    if (!skipDateFilter) {
      if (start && r.call_date && r.call_date < start) return false;
      if (end && r.call_date && r.call_date > end) return false;
    }

    if (filters.departments.length > 0) {
      const queueUpper = (r.queue || '').toUpperCase();
      const matchesDept = filters.departments.some(dept => {
        if (dept === 'BICEHIPOTECARIA') return queueUpper.includes('BICEHIPOTECARIA');
        if (dept === 'CASANUESTRA') return queueUpper.includes('CN');
        return false;
      });
      if (!matchesDept) return false;
    }

    if (filters.queues.length > 0 && !filters.queues.includes(r.queue ?? '')) return false;
    if (filters.executives.length > 0 && !filters.executives.includes(r.executive ?? '')) return false;

    if (filters.attendedStatus.length > 0) {
      const isUnassigned = !r.queue;
      const isAttended = r.attended && r.queue;
      const isUnattended = !r.attended && r.queue;

      let matchesAttendedFilter = false;
      if (filters.attendedStatus.includes('attended') && isAttended) matchesAttendedFilter = true;
      if (filters.attendedStatus.includes('unattended') && isUnattended) matchesAttendedFilter = true;
      if (filters.attendedStatus.includes('unassigned') && isUnassigned) matchesAttendedFilter = true;

      if (!matchesAttendedFilter) return false;
    }

    if (filters.direction.length > 0) {
      const dirMatch = filters.direction.some(d => {
        if (d === 'inbound') return isInbound(r.call_direction ?? '');
        if (d === 'outbound') return !isInbound(r.call_direction ?? '');
        return false;
      });
      if (!dirMatch) return false;
    }

    if (filters.abandonType.length > 0) {
      if (!r.abandon_type || !filters.abandonType.includes(r.abandon_type as 'queue' | 'alert' | 'ivr')) return false;
    }

    return true;
  });
}
