/**
 * Dead Availability Detection
 *
 * Identifies hours where an agent is in "Disponible" status
 * but there are zero incoming calls (IVR was closed or traffic was zero).
 *
 * This time should not count against the agent's occupancy KPI
 * because they couldn't receive calls regardless of availability.
 */

import { supabase } from '../supabase';

export interface DeadAvailabilityRecord {
  agentId: string;
  agentName: string;
  date: string;
  hour: number;
  availabilitySeconds: number;
  incomingCallCount: number;
  isDead: boolean;
}

/**
 * Get hours with zero incoming calls (dead availability)
 * @param dateStart - ISO date (YYYY-MM-DD)
 * @param dateEnd - ISO date (YYYY-MM-DD)
 * @returns Records with availability and incoming call counts
 */
export async function getDeadAvailabilityByDateRange(
  dateStart: string,
  dateEnd: string
): Promise<DeadAvailabilityRecord[]> {
  try {
    // Get availability data by hour and day
    const { data: availabilityData, error: availError } = await supabase
      .from('agent_connectivity_hourly')
      .select('agent_id, agent_name, date, hour, seconds_in_bucket, status')
      .eq('status', 'Disponible')
      .gte('date', dateStart)
      .lte('date', dateEnd);

    if (availError) throw availError;

    // Get incoming call counts by date/hour
    const { data: callData, error: callError } = await supabase
      .rpc('get_inbound_calls_by_hour', {
        date_start: dateStart,
        date_end: dateEnd,
      });

    if (callError && callError.code !== 'PGRST204') {
      // PGRST204 means no rows found, which is OK
      console.warn('[DeadAvailability] Warning querying inbound calls:', callError);
    }

    // Create a map of calls by date/hour
    const callsByDateHour = new Map<string, number>();
    (callData || []).forEach((record: any) => {
      const key = `${record.date}|${record.hour}`;
      callsByDateHour.set(key, record.count || 0);
    });

    // Cross-reference availability with calls
    const results: DeadAvailabilityRecord[] = [];
    (availabilityData || []).forEach((avail: any) => {
      const key = `${avail.date}|${avail.hour}`;
      const callCount = callsByDateHour.get(key) || 0;
      const isDead = callCount === 0 && avail.seconds_in_bucket > 0;

      results.push({
        agentId: avail.agent_id,
        agentName: avail.agent_name,
        date: avail.date,
        hour: avail.hour,
        availabilitySeconds: avail.seconds_in_bucket,
        incomingCallCount: callCount,
        isDead,
      });
    });

    return results;
  } catch (error) {
    console.error('[DeadAvailability] Error detecting dead availability:', error);
    return [];
  }
}

/**
 * Calculate total dead availability seconds per agent
 * @param deadRecords - Output from getDeadAvailabilityByDateRange
 * @returns Map of agentId -> total dead availability seconds
 */
export function calculateDeadAvailabilityPerAgent(
  deadRecords: DeadAvailabilityRecord[]
): Map<string, number> {
  const deadByAgent = new Map<string, number>();

  deadRecords.forEach((record) => {
    if (record.isDead) {
      const current = deadByAgent.get(record.agentId) || 0;
      deadByAgent.set(record.agentId, current + record.availabilitySeconds);
    }
  });

  return deadByAgent;
}

/**
 * Adjust occupancy by subtracting dead availability
 * @param occupancyPercent - Original occupancy
 * @param totalAvailableSeconds - Total time available
 * @param deadAvailabilitySeconds - Time that was dead (IVR closed)
 * @returns Adjusted occupancy percent
 */
export function adjustOccupancyForDeadAvailability(
  occupancyPercent: number,
  totalAvailableSeconds: number,
  deadAvailabilitySeconds: number
): number {
  if (totalAvailableSeconds <= deadAvailabilitySeconds) {
    return 0; // All time was dead, occupancy can't be calculated
  }

  const productiveAvailableSeconds = totalAvailableSeconds - deadAvailabilitySeconds;

  // Occupancy = (Conversation + ACW) / (Total Available - Dead Available)
  // Calculate the conversation+ACW time from original occupancy
  const conversationAndACWSeconds = (occupancyPercent / 100) * totalAvailableSeconds;

  const adjustedOccupancy = (conversationAndACWSeconds / productiveAvailableSeconds) * 100;

  return Math.round(adjustedOccupancy * 10) / 10;
}
