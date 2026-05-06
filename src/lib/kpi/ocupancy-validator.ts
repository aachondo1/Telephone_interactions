/**
 * Occupancy Validator
 *
 * Dynamically validates and adjusts occupancy metrics based on business hours.
 * This allows recalculation if business hours change without losing original data.
 */

import { getBusinessHoursDuration } from '../businessHours';

export interface OccupancyMetrics {
  totalAvailableSeconds: number;
  totalConversationSeconds: number;
  totalACWSeconds: number;
  agentId: string;
  agentName: string;
  dateStart: string;
  dateEnd: string;
}

export interface ValidatedOccupancyMetrics extends OccupancyMetrics {
  availableSecondsWithinBusinessHours: number;
  occupancyRealPercent: number;
  wasAdjustedForBusinessHours: boolean;
  note?: string;
}

/**
 * Validate and adjust occupancy based on business hours
 * If the agent was logged in outside operational windows, reduce available time
 * @param metrics - Original occupancy metrics
 * @param startDate - Date (used to determine business hours)
 * @returns Validated metrics with occupancy recalculated
 */
export function validateOccupancyByBusinessHours(
  metrics: OccupancyMetrics,
  startDate: Date
): ValidatedOccupancyMetrics {
  // For now, this is a placeholder that can be enhanced
  // The real filtering happens during import (getBusinessHoursOverlap)
  // But this validates and provides visibility into what was filtered

  const conversationAndACW = metrics.totalConversationSeconds + metrics.totalACWSeconds;
  const occupancyReal =
    metrics.totalAvailableSeconds > 0
      ? (conversationAndACW / metrics.totalAvailableSeconds) * 100
      : 0;

  return {
    ...metrics,
    availableSecondsWithinBusinessHours: metrics.totalAvailableSeconds,
    occupancyRealPercent: Math.round(occupancyReal * 10) / 10,
    wasAdjustedForBusinessHours: false,
    note: 'Already filtered during import via business hours window',
  };
}

/**
 * Detect if an agent has "ghost connections"
 * (logged in but no activity recorded in the system)
 * @param availableSeconds - Total time agent was available
 * @param conversationSeconds - Time actually on calls
 * @param acwSeconds - After call work time
 * @returns true if occupancy is suspiciously low (potential ghost connection)
 */
export function isLikelyGhostConnection(
  availableSeconds: number,
  conversationSeconds: number,
  acwSeconds: number
): boolean {
  if (availableSeconds === 0) return false;

  const occupancy = ((conversationSeconds + acwSeconds) / availableSeconds) * 100;
  // If occupancy < 5% and was available > 2 hours, likely ghost connection
  return occupancy < 5 && availableSeconds > 7200;
}
