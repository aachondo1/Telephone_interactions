/**
 * Business Hours Configuration
 *
 * Define the operational window for agent connectivity.
 * This is used to filter out "ghost" connections that occur outside business hours.
 *
 * Future: This can be extended to support per-agent schedules via agentId mapping.
 */

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface BusinessHoursConfig {
  startHour: number;      // 0-23 (e.g., 8 for 08:00)
  startMinute: number;    // 0-59
  endHour: number;
  endMinute: number;
}

/**
 * Standard business hours for all agents (unless overridden per agent)
 * Monday-Thursday: 08:30 - 18:00
 * Friday: 08:30 - 14:00
 * Saturday-Sunday: Closed (0 hours)
 */
export const STANDARD_BUSINESS_HOURS: Record<DayOfWeek, BusinessHoursConfig> = {
  monday: {
    startHour: 8,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
  },
  tuesday: {
    startHour: 8,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
  },
  wednesday: {
    startHour: 8,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
  },
  thursday: {
    startHour: 8,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
  },
  friday: {
    startHour: 8,
    startMinute: 30,
    endHour: 14,
    endMinute: 0,
  },
  saturday: {
    startHour: 0,
    startMinute: 0,
    endHour: 0,
    endMinute: 0,
  },
  sunday: {
    startHour: 0,
    startMinute: 0,
    endHour: 0,
    endMinute: 0,
  },
};

/**
 * Get business hours for a specific day
 * @param date - JavaScript Date object
 * @returns BusinessHoursConfig for that day
 */
const DAY_INDEX_TO_KEY: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export function getBusinessHours(date: Date): BusinessHoursConfig {
  const dayOfWeek = DAY_INDEX_TO_KEY[date.getDay()];
  return STANDARD_BUSINESS_HOURS[dayOfWeek];
}

/**
 * Check if a time falls within business hours
 * @param date - JavaScript Date object
 * @returns true if the time is within operational window
 */
export function isWithinBusinessHours(date: Date): boolean {
  const hours = getBusinessHours(date);

  // If endHour === 0 && endMinute === 0, business is closed (e.g., weekends)
  if (hours.endHour === 0 && hours.endMinute === 0) {
    return false;
  }

  const timeInMinutes = date.getHours() * 60 + date.getMinutes();
  const startInMinutes = hours.startHour * 60 + hours.startMinute;
  const endInMinutes = hours.endHour * 60 + hours.endMinute;

  return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
}

/**
 * Truncate a time range to fit within business hours.
 * Handles multi-day ranges by accumulating overlap across each calendar day.
 * Returns the first overlapping segment, or null if completely outside business hours.
 * @param startTime - Start of the time range
 * @param endTime - End of the time range
 * @returns { start: Date, end: Date } or null if no overlap
 */
export function getBusinessHoursOverlap(
  startTime: Date,
  endTime: Date
): { start: Date; end: Date } | null {
  // Walk day by day and find the first overlapping window
  const cursor = new Date(startTime);
  cursor.setHours(0, 0, 0, 0); // start at beginning of the start day

  while (cursor <= endTime) {
    const hours = getBusinessHours(cursor);

    // Skip closed days (e.g., weekends)
    if (hours.endHour !== 0 || hours.endMinute !== 0) {
      const dayStart = new Date(cursor);
      dayStart.setHours(hours.startHour, hours.startMinute, 0, 0);

      const dayEnd = new Date(cursor);
      dayEnd.setHours(hours.endHour, hours.endMinute, 0, 0);

      // Check for overlap with the provided range
      if (endTime > dayStart && startTime < dayEnd) {
        const overlapStart = startTime > dayStart ? startTime : dayStart;
        const overlapEnd = endTime < dayEnd ? endTime : dayEnd;
        return { start: overlapStart, end: overlapEnd };
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

/**
 * Calculate the duration (in seconds) that falls within business hours
 * Useful for "hard cutting" time outside operational window
 * @param startTime - Start of the time range
 * @param endTime - End of the time range
 * @returns Seconds within business hours
 */
export function getBusinessHoursDuration(startTime: Date, endTime: Date): number {
  const overlap = getBusinessHoursOverlap(startTime, endTime);
  if (!overlap) return 0;

  return Math.max(0, (overlap.end.getTime() - overlap.start.getTime()) / 1000);
}
