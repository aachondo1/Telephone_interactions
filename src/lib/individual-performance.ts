import type { CallRecord } from './supabase';

/**
 * Traffic light states for executive performance
 * 🟢 Green: Meets or exceeds expectations
 * 🟡 Yellow: Needs attention but acceptable
 * 🔴 Red: Below expectations, needs coaching
 */
export enum TrafficLight {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}

/**
 * Individual metric calculation result with traffic light status
 */
export type MetricResult = {
  value: number;
  formatted: string;
  trafficLight: TrafficLight;
  interpretation: string;
  threshold?: {
    red: number;
    yellow: number;
    green: number;
  };
};

/**
 * Complete performance metrics for an executive
 * Organized by impact type: Efficacy, Availability, Productivity
 */
export type ExecutivePerformanceMetrics = {
  // Efficacy Metrics (Technical Quality)
  holdRate: number; // % of calls with hold > 0
  netAHT: number; // handle_time - 45 (ACW)
  fcr: number; // % calls without re-entry in 24h

  // Availability & Discipline Metrics
  individualBounceRate: number; // % first_alerted but not final_executive
  avgAlertTime: number; // seconds until answer
  acwAdherenceFactor: number; // (handle_time - duration) variance

  // Productivity Metrics
  erlangContribution: number; // % of queue's total duration
  realOccupancy: number; // (handle_time + alert_time) / shift_time

  // Supporting data
  totalAttendedCalls: number;
  totalAlerts: number;
  totalBounces: number;
  avgDurationSeconds: number;
  avgHandleTimeSeconds: number;
};

/**
 * Scorecard display format with traffic lights and interpretations
 */
export type ExecutiveScorecard = {
  executive: string;
  period: {
    start: string;
    end: string;
    dayCount: number;
  };

  // Efficacy Section
  efficacy: {
    holdRate: MetricResult;
    netAHT: MetricResult;
    fcr: MetricResult;
    overallScore: number; // 0-100 weighted average
  };

  // Availability Section
  availability: {
    bounceRate: MetricResult;
    avgAlertTime: MetricResult;
    acwAdherence: MetricResult;
    overallScore: number;
  };

  // Productivity Section
  productivity: {
    erlangContribution: MetricResult;
    realOccupancy: MetricResult;
    overallScore: number;
  };

  // Overall Assessment
  overallPerformance: {
    score: number; // 0-100
    trafficLight: TrafficLight;
    recommendation: string;
    coachingAreas: string[];
  };

  // Raw metrics for detailed analysis
  rawMetrics: ExecutivePerformanceMetrics;
};

/**
 * Thresholds for traffic light determination
 * Can be customized per organization
 */
const THRESHOLDS = {
  holdRate: {
    green: 20, // <= 20% in hold
    yellow: 35, // <= 35% acceptable
    red: 35, // > 35% needs coaching
  },
  netAHT: {
    green: -10, // <= 10% below queue average
    yellow: 15, // <= 15% above average
    red: 15, // > 15% above average
  },
  fcr: {
    red: 85, // < 85% resolved = bad
    yellow: 85, // 85-92% = acceptable
    green: 92, // >= 92% = good
  },
  bounceRate: {
    green: 5, // <= 5% = excellent
    yellow: 12, // <= 12% = acceptable
    red: 12, // > 12% = needs coaching
  },
  avgAlertTime: {
    green: 3, // <= 3 seconds = quick
    yellow: 6, // <= 6 seconds = acceptable
    red: 6, // > 6 seconds = slow response
  },
  realOccupancy: {
    green: 80, // >= 80% busy
    yellow: 60, // >= 60% busy
    red: 60, // < 60% = too much idle time
  },
};

/**
 * Calculate bounce rate for an individual executive
 * Bounce = was first alerted but NOT the one who answered
 * This is the KEY metric for detecting cherry-picking or distraction
 */
export function calculateIndividualBounceRate(
  records: CallRecord[],
  executive: string
): { bounceRate: number; totalBounces: number; totalAlerts: number } {
  let totalBounces = 0;
  let totalAlerts = 0;

  for (const record of records) {
    if (!record.alerted_users) continue;

    const alertedList = record.alerted_users
      .split(';')
      .map((u) => u.trim())
      .filter((u) => u !== '');

    // Check if this executive was in the alert list
    const wasAlerted = alertedList.some(
      (u) => u.toUpperCase() === executive.toUpperCase()
    );

    if (!wasAlerted) continue;

    totalAlerts++;

    // Check if this executive was the one who actually answered
    const wasFinal = record.executive.toUpperCase() === executive.toUpperCase();

    if (!wasFinal) {
      totalBounces++;
    }
  }

  const bounceRate =
    totalAlerts > 0 ? Math.round((totalBounces / totalAlerts) * 100) : 0;

  return { bounceRate, totalBounces, totalAlerts };
}

/**
 * Calculate hold rate: % of calls where hold_time > 0
 * High hold rate = lack of knowledge, needs training
 */
export function calculateHoldRate(
  records: CallRecord[],
  executive: string
): number {
  const filteredRecords = records.filter(
    (r) => r.executive.toUpperCase() === executive.toUpperCase() && r.attended
  );

  if (filteredRecords.length === 0) return 0;

  const callsWithHold = filteredRecords.filter((r) => r.hold_time_seconds > 0)
    .length;
  return Math.round((callsWithHold / filteredRecords.length) * 100);
}

/**
 * Calculate net AHT: handle_time - ACW (45s)
 * This is the "real" talk time + alert time
 * Compare against queue average to detect slow handlers
 */
export function calculateNetAHT(
  records: CallRecord[],
  executive: string,
  queueAverage?: number
): number {
  const filteredRecords = records.filter(
    (r) => r.executive.toUpperCase() === executive.toUpperCase() && r.attended
  );

  if (filteredRecords.length === 0) return 0;

  const totalNetAHT = filteredRecords.reduce(
    (sum, r) => sum + Math.max(0, r.handle_time_seconds - 45),
    0
  );
  const avgNetAHT = Math.round(totalNetAHT / filteredRecords.length);

  // Return variance from queue average if provided
  if (queueAverage) {
    return Math.round(((avgNetAHT - queueAverage) / queueAverage) * 100);
  }

  return avgNetAHT;
}

/**
 * Calculate First Contact Resolution (FCR) estimated
 * If a customer calls back to the same executive within 24h after being attended,
 * the original contact was likely not resolved
 */
export function calculateFCR(
  records: CallRecord[],
  executive: string
): number {
  const executiveRecords = records.filter(
    (r) => r.executive.toUpperCase() === executive.toUpperCase()
  );

  if (executiveRecords.length === 0) return 100;

  // Group by ANI to find repeat callers
  const callsByAni = new Map<string, CallRecord[]>();
  for (const record of executiveRecords) {
    if (!record.ani_hash) continue;
    if (!callsByAni.has(record.ani_hash)) {
      callsByAni.set(record.ani_hash, []);
    }
    callsByAni.get(record.ani_hash)!.push(record);
  }

  // Count resolved calls (no repeat within 24h)
  let resolvedCalls = 0;
  let totalUniqueCalls = 0;

  for (const [, callsForAni] of callsByAni.entries()) {
    // Sort by date/time
    const sorted = callsForAni.sort((a, b) => {
      const aTime = a.call_date && a.call_time ? new Date(`${a.call_date}T${a.call_time}`).getTime() : 0;
      const bTime = b.call_date && b.call_time ? new Date(`${b.call_date}T${b.call_time}`).getTime() : 0;
      return aTime - bTime;
    });

    // Check each call for repeat within 24h
    for (let i = 0; i < sorted.length; i++) {
      const call = sorted[i];
      if (!call.attended) continue;
      if (!call.call_date || !call.call_time) continue;

      totalUniqueCalls++;
      const callTime = new Date(`${call.call_date}T${call.call_time}`).getTime();

      // Check if there's a follow-up call within 24h
      let hasFollowUp = false;
      for (let j = i + 1; j < sorted.length; j++) {
        const nextCall = sorted[j];
        if (!nextCall.call_date || !nextCall.call_time) continue;

        const nextTime = new Date(
          `${nextCall.call_date}T${nextCall.call_time}`
        ).getTime();
        const diff = nextTime - callTime;
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff <= oneDay) {
          hasFollowUp = true;
          break;
        } else {
          break; // No need to check further
        }
      }

      if (!hasFollowUp) {
        resolvedCalls++;
      }
    }
  }

  if (totalUniqueCalls === 0) return 100;
  return Math.round((resolvedCalls / totalUniqueCalls) * 100);
}

/**
 * Calculate average alert time: time from when call arrived until executive answered
 * Low values = responsive, High values = degrading SLA
 */
export function calculateAvgAlertTime(
  records: CallRecord[],
  executive: string
): number {
  const filteredRecords = records.filter(
    (r) =>
      r.executive.toUpperCase() === executive.toUpperCase() &&
      r.attended &&
      r.alert_time_seconds > 0
  );

  if (filteredRecords.length === 0) return 0;

  const totalAlertTime = filteredRecords.reduce((sum, r) => sum + r.alert_time_seconds, 0);
  return Math.round(totalAlertTime / filteredRecords.length);
}

/**
 * ACW Adherence Factor: validate that handle_time - duration is ~45 seconds
 * Deviation indicates irregular use of wrap-up or hold states
 */
export function calculateACWAdherence(
  records: CallRecord[],
  executive: string
): number {
  const filteredRecords = records.filter(
    (r) => r.executive.toUpperCase() === executive.toUpperCase() && r.attended
  );

  if (filteredRecords.length === 0) return 100;

  // Calculate ACW for each call
  const acwDifferences: number[] = [];
  for (const record of filteredRecords) {
    const calculatedACW = Math.max(
      0,
      record.handle_time_seconds - record.duration_seconds
    );
    acwDifferences.push(Math.abs(calculatedACW - 45));
  }

  // Standard deviation from ideal 45s
  const avgDiff = acwDifferences.reduce((a, b) => a + b, 0) / acwDifferences.length;
  const variancePercent = Math.round((avgDiff / 45) * 100);

  // Return adherence score (100 = perfect, lower = worse)
  return Math.max(0, 100 - variancePercent);
}

/**
 * Erlang Contribution: % of queue's total duration this executive handles
 * Shows workload balance in the team
 */
export function calculateErlangContribution(
  records: CallRecord[],
  executive: string,
  queue?: string
): number {
  let queueRecords = records;
  if (queue) {
    queueRecords = records.filter((r) => r.queue === queue);
  }

  const totalQueueDuration = queueRecords.reduce((sum, r) => sum + r.duration_seconds, 0);
  if (totalQueueDuration === 0) return 0;

  const executiveDuration = queueRecords
    .filter((r) => r.executive.toUpperCase() === executive.toUpperCase())
    .reduce((sum, r) => sum + r.duration_seconds, 0);

  return Math.round((executiveDuration / totalQueueDuration) * 100);
}

/**
 * Real Occupancy: (handle_time + alert_time) / shift_time
 * How much of the day was the executive actually busy with calls + alerts
 */
export function calculateRealOccupancy(
  records: CallRecord[],
  executive: string,
  shiftMinutes: number = 2280 // 38 hours per week
): number {
  const filteredRecords = records.filter(
    (r) =>
      r.executive.toUpperCase() === executive.toUpperCase() &&
      r.call_date &&
      r.call_time
  );

  if (filteredRecords.length === 0) return 0;

  // Count unique days
  const uniqueDays = new Set(filteredRecords.map((r) => r.call_date)).size;
  if (uniqueDays === 0) return 0;

  // Sum handle + alert time
  const totalBusySeconds = filteredRecords.reduce(
    (sum, r) => sum + r.handle_time_seconds + r.alert_time_seconds,
    0
  );
  const totalBusyMinutes = totalBusySeconds / 60;

  // Assume 5-day work week, scale to weekly
  const weeklyBusyMinutes = (totalBusyMinutes / uniqueDays) * 5;

  return Math.round((weeklyBusyMinutes / shiftMinutes) * 100);
}

/**
 * Determine traffic light based on metric value and thresholds
 */
export function determineTrafficLight(
  metricName: string,
  value: number,
  thresholds?: { red: number; yellow: number; green: number }
): TrafficLight {
  const threshold = thresholds || (THRESHOLDS as any)[metricName];

  if (!threshold) {
    return value > 50 ? TrafficLight.GREEN : TrafficLight.RED;
  }

  // Handle different logic for different metrics
  if (['holdRate', 'bounceRate', 'avgAlertTime'].includes(metricName)) {
    // Lower is better
    if (value <= threshold.green) return TrafficLight.GREEN;
    if (value <= threshold.yellow) return TrafficLight.YELLOW;
    return TrafficLight.RED;
  }

  if (['fcr', 'realOccupancy', 'erlangContribution'].includes(metricName)) {
    // Higher is better
    if (value >= threshold.green) return TrafficLight.GREEN;
    if (value >= threshold.yellow) return TrafficLight.YELLOW;
    return TrafficLight.RED;
  }

  // netAHT can be positive or negative (variance from average)
  if (metricName === 'netAHT') {
    if (value >= -10 && value <= threshold.yellow) return TrafficLight.YELLOW;
    if (value > threshold.yellow) return TrafficLight.RED;
    return TrafficLight.GREEN;
  }

  return TrafficLight.YELLOW;
}

/**
 * Format metric value for display
 */
export function formatMetricValue(
  metricName: string,
  value: number
): string {
  if (['holdRate', 'bounceRate', 'fcr', 'erlangContribution', 'realOccupancy'].includes(metricName)) {
    return `${value}%`;
  }

  if (metricName === 'netAHT') {
    return `${value > 0 ? '+' : ''}${value}%`;
  }

  if (metricName === 'avgAlertTime') {
    return `${value}s`;
  }

  if (metricName === 'acwAdherence') {
    return `${value}%`;
  }

  return String(value);
}

/**
 * Get interpretation text for a metric
 */
export function getMetricInterpretation(
  metricName: string,
  trafficLight: TrafficLight,
  value: number
): string {
  const interpretations: Record<string, Record<TrafficLight, string>> = {
    holdRate: {
      [TrafficLight.GREEN]: 'Excelente conocimiento, mínimas consultas',
      [TrafficLight.YELLOW]: 'Consulta ocasionalmente, revisar temas recurrentes',
      [TrafficLight.RED]: 'Falta capacitación urgente, no conoce soluciones',
    },
    bounceRate: {
      [TrafficLight.GREEN]: 'Excelente disponibilidad y enfoque',
      [TrafficLight.YELLOW]: 'Aceptable, pero con algunas distracciones',
      [TrafficLight.RED]: 'Deja pasar llamadas frecuentemente (cherry-picking)',
    },
    avgAlertTime: {
      [TrafficLight.GREEN]: 'Responde muy rápido, excelente',
      [TrafficLight.YELLOW]: 'Respuesta normal, aceptable',
      [TrafficLight.RED]: 'Tarda demasiado, degrada SLA',
    },
    fcr: {
      [TrafficLight.GREEN]: 'Resuelve bien, clientes satisfechos',
      [TrafficLight.YELLOW]: 'Resolución aceptable, revisar patrones',
      [TrafficLight.RED]: 'Muchos clientes que vuelven a llamar',
    },
    netAHT: {
      [TrafficLight.GREEN]: 'Eficiente, tiempos controlados',
      [TrafficLight.YELLOW]: 'Dentro del promedio del equipo',
      [TrafficLight.RED]: 'Llamadas muy largas, revisar proceso',
    },
    erlangContribution: {
      [TrafficLight.GREEN]: 'Buena participación en carga de trabajo',
      [TrafficLight.YELLOW]: 'Participación aceptable',
      [TrafficLight.RED]: 'Baja participación, revisar disponibilidad',
    },
    realOccupancy: {
      [TrafficLight.GREEN]: 'Alta ocupación, totalmente dedicado',
      [TrafficLight.YELLOW]: 'Ocupación normal',
      [TrafficLight.RED]: 'Baja ocupación, mucho tiempo ocioso',
    },
    acwAdherence: {
      [TrafficLight.GREEN]: 'ACW adherencia perfecta',
      [TrafficLight.YELLOW]: 'ACW dentro de margen aceptable',
      [TrafficLight.RED]: 'ACW irregular, uso inconsistente de estados',
    },
  };

  return (
    interpretations[metricName]?.[trafficLight] ||
    `Valor: ${value}, Estado: ${trafficLight}`
  );
}

/**
 * Calculate all performance metrics for an executive
 */
export function calculateExecutiveMetrics(
  records: CallRecord[],
  executive: string,
  queue?: string,
  queueAvgAHT?: number
): ExecutivePerformanceMetrics {
  let filteredRecords = records.filter(
    (r) => r.executive.toUpperCase() === executive.toUpperCase()
  );

  if (queue) {
    filteredRecords = filteredRecords.filter((r) => r.queue === queue);
  }

  const attendedRecords = filteredRecords.filter((r) => r.attended);

  return {
    holdRate: calculateHoldRate(filteredRecords, executive),
    netAHT: calculateNetAHT(
      filteredRecords,
      executive,
      queueAvgAHT
    ),
    fcr: calculateFCR(filteredRecords, executive),
    individualBounceRate: calculateIndividualBounceRate(
      filteredRecords,
      executive
    ).bounceRate,
    avgAlertTime: calculateAvgAlertTime(filteredRecords, executive),
    acwAdherenceFactor: calculateACWAdherence(filteredRecords, executive),
    erlangContribution: calculateErlangContribution(
      filteredRecords,
      executive,
      queue
    ),
    realOccupancy: calculateRealOccupancy(filteredRecords, executive),
    totalAttendedCalls: attendedRecords.length,
    totalAlerts: filteredRecords.filter((r) => r.alert_time_seconds > 0).length,
    totalBounces: calculateIndividualBounceRate(
      filteredRecords,
      executive
    ).totalBounces,
    avgDurationSeconds:
      attendedRecords.length > 0
        ? Math.round(
            attendedRecords.reduce((sum, r) => sum + r.duration_seconds, 0) /
              attendedRecords.length
          )
        : 0,
    avgHandleTimeSeconds:
      attendedRecords.length > 0
        ? Math.round(
            attendedRecords.reduce((sum, r) => sum + r.handle_time_seconds, 0) /
              attendedRecords.length
          )
        : 0,
  };
}

/**
 * Generate executive performance scorecard with traffic lights
 */
export function generateExecutiveScorecard(
  records: CallRecord[],
  executive: string,
  queue?: string,
  queueAvgAHT?: number
): ExecutiveScorecard {
  const metrics = calculateExecutiveMetrics(
    records,
    executive,
    queue,
    queueAvgAHT
  );

  // Get date range
  const dates = records
    .map((r) => r.call_date)
    .filter((d): d is string => d !== null)
    .sort();
  const startDate = dates[0] || 'N/A';
  const endDate = dates[dates.length - 1] || 'N/A';
  const dayCount = new Set(dates).size;

  // Helper to create metric result
  const createMetricResult = (
    metricName: string,
    value: number,
    thresholds?: { red: number; yellow: number; green: number }
  ): MetricResult => {
    const trafficLight = determineTrafficLight(metricName, value, thresholds);
    return {
      value,
      formatted: formatMetricValue(metricName, value),
      trafficLight,
      interpretation: getMetricInterpretation(metricName, trafficLight, value),
      threshold: thresholds || (THRESHOLDS as any)[metricName],
    };
  };

  // Efficacy Section
  const efficacyMetrics = {
    holdRate: createMetricResult('holdRate', metrics.holdRate),
    netAHT: createMetricResult('netAHT', metrics.netAHT),
    fcr: createMetricResult('fcr', metrics.fcr),
  };
  const efficacyScore = Math.round(
    (100 - efficacyMetrics.holdRate.value) * 0.3 +
      (100 - Math.abs(efficacyMetrics.netAHT.value)) * 0.3 +
      efficacyMetrics.fcr.value * 0.4
  );

  // Availability Section
  const availabilityMetrics = {
    bounceRate: createMetricResult('bounceRate', metrics.individualBounceRate),
    avgAlertTime: createMetricResult('avgAlertTime', metrics.avgAlertTime),
    acwAdherence: createMetricResult('acwAdherence', metrics.acwAdherenceFactor),
  };
  const availabilityScore = Math.round(
    (100 - availabilityMetrics.bounceRate.value) * 0.4 +
      (100 - Math.min(availabilityMetrics.avgAlertTime.value * 10, 100)) * 0.3 +
      availabilityMetrics.acwAdherence.value * 0.3
  );

  // Productivity Section
  const productivityMetrics = {
    erlangContribution: createMetricResult('erlangContribution', metrics.erlangContribution),
    realOccupancy: createMetricResult('realOccupancy', metrics.realOccupancy),
  };
  const productivityScore = Math.round(
    productivityMetrics.erlangContribution.value * 0.3 +
      productivityMetrics.realOccupancy.value * 0.7
  );

  // Overall performance
  const overallScore = Math.round(
    efficacyScore * 0.4 + availabilityScore * 0.35 + productivityScore * 0.25
  );

  // Determine overall traffic light
  let overallTrafficLight = TrafficLight.GREEN;
  if (overallScore < 70) overallTrafficLight = TrafficLight.RED;
  else if (overallScore < 85) overallTrafficLight = TrafficLight.YELLOW;

  // Coaching areas
  const coachingAreas: string[] = [];
  if (efficacyMetrics.holdRate.trafficLight === TrafficLight.RED) {
    coachingAreas.push('Capacitación técnica: mejorar conocimiento de soluciones');
  }
  if (availabilityMetrics.bounceRate.trafficLight === TrafficLight.RED) {
    coachingAreas.push('Disponibilidad: reducir cherry-picking y distracciones');
  }
  if (efficacyMetrics.fcr.trafficLight === TrafficLight.RED) {
    coachingAreas.push('Resolución primera llamada: verificar procesos de troubleshooting');
  }
  if (availabilityMetrics.avgAlertTime.trafficLight === TrafficLight.RED) {
    coachingAreas.push('Responsividad: mejorar tiempo de respuesta a alertas');
  }
  if (productivityMetrics.erlangContribution.trafficLight === TrafficLight.RED) {
    coachingAreas.push('Carga de trabajo: revisar distribución en el equipo');
  }

  const recommendation = getPerformanceRecommendation(
    overallScore,
    coachingAreas
  );

  return {
    executive,
    period: {
      start: startDate,
      end: endDate,
      dayCount,
    },
    efficacy: {
      holdRate: efficacyMetrics.holdRate,
      netAHT: efficacyMetrics.netAHT,
      fcr: efficacyMetrics.fcr,
      overallScore: efficacyScore,
    },
    availability: {
      bounceRate: availabilityMetrics.bounceRate,
      avgAlertTime: availabilityMetrics.avgAlertTime,
      acwAdherence: availabilityMetrics.acwAdherence,
      overallScore: availabilityScore,
    },
    productivity: {
      erlangContribution: productivityMetrics.erlangContribution,
      realOccupancy: productivityMetrics.realOccupancy,
      overallScore: productivityScore,
    },
    overallPerformance: {
      score: overallScore,
      trafficLight: overallTrafficLight,
      recommendation,
      coachingAreas,
    },
    rawMetrics: metrics,
  };
}

/**
 * Get performance recommendation based on score and coaching areas
 */
function getPerformanceRecommendation(
  score: number,
  coachingAreas: string[]
): string {
  if (score >= 90) {
    return 'Excelente desempeño. Considerar como referente del equipo.';
  }
  if (score >= 80) {
    return 'Buen desempeño. Mantener y reforzar áreas en desarrollo.';
  }
  if (score >= 70) {
    return `Desempeño aceptable con áreas de mejora. Enfoque en: ${coachingAreas.slice(0, 2).join(', ')}`;
  }
  return `Desempeño por debajo de lo esperado. Plan de coaching urgente recomendado.`;
}

/**
 * Generate scorecards for all executives in a dataset
 */
export function generateTeamPerformanceReport(
  records: CallRecord[],
  queue?: string,
  minCallsThreshold: number = 5
): ExecutiveScorecard[] {
  // Get all unique executives with sufficient calls
  const executiveCallCounts = new Map<string, number>();
  for (const record of records) {
    if (record.executive === 'SIN ATENDER') continue;
    executiveCallCounts.set(
      record.executive,
      (executiveCallCounts.get(record.executive) || 0) + 1
    );
  }

  // Filter by minimum calls threshold
  const qualifiedExecutives = Array.from(executiveCallCounts.entries())
    .filter(([_, count]) => count >= minCallsThreshold)
    .map(([exec, _]) => exec)
    .sort();

  // Calculate queue average AHT if queue provided
  let queueAvgAHT: number | undefined;
  if (queue) {
    const queueRecords = records.filter((r) => r.queue === queue);
    const totalAHT = queueRecords.reduce((sum, r) => sum + r.handle_time_seconds - 45, 0);
    queueAvgAHT = Math.round(totalAHT / (queueRecords.length || 1));
  }

  // Generate scorecards
  return qualifiedExecutives
    .map((exec) => generateExecutiveScorecard(records, exec, queue, queueAvgAHT))
    .sort((a, b) => b.overallPerformance.score - a.overallPerformance.score);
}
