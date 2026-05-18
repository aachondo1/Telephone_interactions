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
