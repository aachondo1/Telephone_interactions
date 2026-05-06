/**
 * Audit Flags
 *
 * Runtime detection of anomalies in agent connectivity
 * These are calculated on-the-fly (not persisted) for UI warnings
 */

import { STANDARD_BUSINESS_HOURS } from '../businessHours';

export interface AuditFlag {
  agentId: string;
  agentName: string;
  flagType: 'ghost_connection' | 'overtime_no_calls' | 'unusual_hours';
  severity: 'warning' | 'critical';
  message: string;
  excessMinutes?: number;
}

/**
 * Detect if agent has connection time > business hours + 30 minutes
 * without recorded calls (potential "left logged in" scenario)
 * @param agentId - Agent identifier
 * @param agentName - Agent name
 * @param dateStart - ISO date
 * @param dateEnd - ISO date
 * @param totalConnectedSeconds - Total time agent was connected
 * @param totalCallSeconds - Total time on calls
 * @returns AuditFlag if detected, null otherwise
 */
export function detectGhostConnection(
  agentId: string,
  agentName: string,
  dateStart: string,
  dateEnd: string,
  totalConnectedSeconds: number,
  totalCallSeconds: number
): AuditFlag | null {
  // Calculate expected business hours for the date range
  // For simplicity, use Mon-Thu (9.5 hours) + Fri (5.5 hours) per week as baseline
  const dayCount = Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24));
  const expectedBusinessSeconds = dayCount * 9 * 3600; // Rough estimate: 9 hours/day

  const excessSeconds = Math.max(0, totalConnectedSeconds - expectedBusinessSeconds);
  const excessMinutes = Math.round(excessSeconds / 60);

  // If connected > expected by more than 30 minutes AND minimal call time
  if (excessMinutes > 30 && totalCallSeconds < expectedBusinessSeconds * 0.1) {
    return {
      agentId,
      agentName,
      flagType: 'ghost_connection',
      severity: 'warning',
      message: `Conectado ${excessMinutes} minutos fuera de horario sin registros de llamadas. Posible conexión inactiva.`,
      excessMinutes,
    };
  }

  return null;
}

/**
 * Check if agent appears to be operating outside standard hours
 * (useful for detecting shift changes or unusual schedules)
 */
export function detectUnusualHours(
  agentId: string,
  agentName: string,
  reportedStartHour: number,
  reportedEndHour: number
): AuditFlag | null {
  const stdMon = STANDARD_BUSINESS_HOURS.monday;
  const stdFri = STANDARD_BUSINESS_HOURS.friday;

  const stdStartMinutes = stdMon.startHour * 60 + stdMon.startMinute;
  const stdEndMinutes = stdMon.endHour * 60 + stdMon.endMinute;

  const reportStartMinutes = reportedStartHour * 60;
  const reportEndMinutes = reportedEndHour * 60;

  const startDiff = Math.abs(reportStartMinutes - stdStartMinutes) / 60; // in hours
  const endDiff = Math.abs(reportEndMinutes - stdEndMinutes) / 60;

  if (startDiff > 2 || endDiff > 2) {
    return {
      agentId,
      agentName,
      flagType: 'unusual_hours',
      severity: 'warning',
      message: `Horario inusual detectado. Verificar si es cambio de turno o configuración diferente.`,
    };
  }

  return null;
}

/**
 * Generate audit flags for an agent
 * @param agentId
 * @param agentName
 * @param metrics - Agent occupancy metrics
 * @returns Array of AuditFlags (can be empty)
 */
export function generateAuditFlags(
  agentId: string,
  agentName: string,
  metrics: {
    dateStart: string;
    dateEnd: string;
    totalConnectedSeconds: number;
    totalCallSeconds: number;
  }
): AuditFlag[] {
  const flags: AuditFlag[] = [];

  const ghostFlag = detectGhostConnection(
    agentId,
    agentName,
    metrics.dateStart,
    metrics.dateEnd,
    metrics.totalConnectedSeconds,
    metrics.totalCallSeconds
  );

  if (ghostFlag) {
    flags.push(ghostFlag);
  }

  return flags;
}
