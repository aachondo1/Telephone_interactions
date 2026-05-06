import type { FilterState } from '../components/FilterBar';

/**
 * Given the current FilterState, returns the date range for the previous period
 * (same duration, shifted backward). Returns null if no valid date range is defined.
 */
export function getPreviousPeriodRange(
  filters: FilterState,
): { start: string; end: string } | null {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // For relative ranges, compute the previous equivalent
  switch (filters.dateRange) {
    case 'thisMonth': {
      // Previous period = last full month
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'lastMonth': {
      // Previous period = the month before lastMonth
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisWeek': {
      // Previous period = last full week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'lastWeek': {
      // Previous period = the week before lastWeek
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // lastWeek ends at today - (today.getDay() + 1)
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      // Week before lastWeek
      const end = new Date(lastWeekEnd);
      end.setDate(lastWeekEnd.getDate() - 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisQuarter': {
      // Previous period = last full quarter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'lastQuarter': {
      // Previous period = the quarter before lastQuarter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 2) * 3, 1);
      const end = new Date(today.getFullYear(), (quarter - 1) * 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'custom': {
      // For custom ranges, shift backward by the same duration
      if (!filters.dateStart || !filters.dateEnd) return null;

      const start = new Date(filters.dateStart + 'T00:00:00');
      const end = new Date(filters.dateEnd + 'T00:00:00');

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const durationMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      // Add 1 day to durationMs because we want same number of days
      const prevStart = new Date(prevEnd.getTime() - durationMs);

      return { start: formatDate(prevStart), end: formatDate(prevEnd) };
    }
    default:
      return null;
  }
}

/**
 * Given a FilterState, returns a new FilterState with the previous period's dates.
 * Returns null if no previous period can be determined.
 */
export function getPreviousFilters(
  filters: FilterState,
): FilterState | null {
  const prevRange = getPreviousPeriodRange(filters);
  if (!prevRange) return null;

  return {
    ...filters,
    dateRange: 'custom',
    dateStart: prevRange.start,
    dateEnd: prevRange.end,
  };
}

/**
 * Calculates the percentage change between current and previous values.
 * Returns undefined if previous is 0 or nullish.
 */
export function calcChangePercent(
  current: number,
  previous: number | undefined | null,
): number | undefined {
  if (previous === undefined || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}
