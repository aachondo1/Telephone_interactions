import type { CallRecord } from '../supabase';
import {
  type QueueHealthMetric,
  type AbandonFunnelData,
  type TechnicalLeaksData,
  type QueueHealthInsight,
  type QueueWaitDistributionData,
  type AttendedWaitDistributionData,
  type OperationalKPIs,
} from './types';
import { formatDuration, isInbound, getUnifiedQueueBase, getUnifiedStates, SHORT_ABANDON_THRESHOLD } from './shared';

export function calculateQueueHealthMetrics(records: CallRecord[]): QueueHealthMetric[] {
  if (records.length === 0) return [];

  const dates = records
    .filter(r => r.call_date)
    .map(r => new Date(r.call_date + 'T00:00:00').getTime())
    .sort((a, b) => a - b);

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const daysInPeriod = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1);

  const hoursPerBusinessDay = 7.6;
  const hoursInPeriod = daysInPeriod * hoursPerBusinessDay;

  const SL_THRESHOLD_SECONDS = 20;

  const queueMap = new Map<string, CallRecord[]>();

  for (const r of records) {
    const queue = r.queue || 'Sin cola';
    if (!queueMap.has(queue)) queueMap.set(queue, []);
    queueMap.get(queue)!.push(r);
  }

  const metrics: QueueHealthMetric[] = [];

  for (const [queue, queueRecords] of queueMap) {
    const inboundCalls = queueRecords.filter(r => isInbound(r.call_direction));

    const queueBase = getUnifiedQueueBase(inboundCalls);
    const states = getUnifiedStates(queueBase);

    const attendedCalls = states.conversationReal.length;
    const realAbandonedCalls = states.notAssigned.length + states.assignedNoConversation.length;
    const totalValidCalls = attendedCalls + realAbandonedCalls;

    const answeredWithin20s = states.conversationReal.filter(r => {
      const queueTime = r.queue_time_seconds ?? 0;
      const alertTime = r.alert_time_seconds ?? 0;
      return (queueTime + alertTime) <= SL_THRESHOLD_SECONDS;
    }).length;

    const serviceLevelPercent = totalValidCalls > 0
      ? Math.round((answeredWithin20s / totalValidCalls) * 100)
      : 0;

    const abandonmentRatePercent = totalValidCalls > 0
      ? Math.round((realAbandonedCalls / totalValidCalls) * 100)
      : 0;

    const allWaitTimes = queueBase
      .map(r => (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0))
      .filter(t => t >= 0);

    const awtSeconds = allWaitTimes.length > 0
      ? Math.round(allWaitTimes.reduce((a, b) => a + b, 0) / allWaitTimes.length)
      : 0;

    const answeredWaitTimes = states.conversationReal
      .map(r => (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0))
      .filter(t => t >= 0);

    const asaSeconds = answeredWaitTimes.length > 0
      ? Math.round(answeredWaitTimes.reduce((a, b) => a + b, 0) / answeredWaitTimes.length)
      : 0;

    const abandonedWaitTimes = [
      ...states.notAssigned,
      ...states.assignedNoConversation,
    ]
      .map(r => (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0))
      .filter(t => t >= 0);

    const ataSeconds = abandonedWaitTimes.length > 0
      ? Math.round(abandonedWaitTimes.reduce((a, b) => a + b, 0) / abandonedWaitTimes.length)
      : 0;

    const handleTimes = states.conversationReal
      .filter(r => r.handle_time_seconds !== null && r.handle_time_seconds >= 0)
      .map(r => r.handle_time_seconds!);
    const totalHandleTime = handleTimes.reduce((a, b) => a + b, 0);
    const erlangC = Math.round((totalHandleTime / (3600 * hoursInPeriod)) * 10) / 10;

    const staffingEfficiency = (erlangC / 1.0) * 100;

    const slTrend: 'up' | 'down' | 'stable' = serviceLevelPercent >= 80
      ? 'up'
      : serviceLevelPercent >= 70
        ? 'stable'
        : 'down';

    metrics.push({
      queue,
      serviceLevelPercent,
      abandonmentRatePercent,
      awtSeconds,
      awtFormatted: formatDuration(awtSeconds),
      asaSeconds,
      asaFormatted: formatDuration(asaSeconds),
      ataSeconds,
      ataFormatted: formatDuration(ataSeconds),
      erlangC,
      staffingEfficiency,
      slTrend,
      totalCalls: totalValidCalls,
      attendedCalls,
      abandonedCalls: realAbandonedCalls,
      abandonInQueue: states.notAssigned.length,
      abandonInAlert: states.assignedNoConversation.length,
    });
  }

  return metrics.sort((a, b) => b.totalCalls - a.totalCalls);
}

export function calculateAbandonFunnel(records: CallRecord[]): AbandonFunnelData {
  const ABANDON_MAX_IVR_TIME = 10;

  const inboundCalls = records.filter(r => isInbound(r.call_direction));
  const totalInbound = inboundCalls.length;

  const ivrMenuAbandons = inboundCalls.filter(r => {
    const escapedIVR = r.flow_exit !== true;
    const spentTimeInMenu = (r.ivr_time_seconds ?? 0) > ABANDON_MAX_IVR_TIME;
    return escapedIVR && spentTimeInMenu;
  }).length;

  const ivrErrors = inboundCalls.filter(r => {
    const escapedIVR = r.flow_exit !== true;
    const quickExit = (r.ivr_time_seconds ?? 0) <= ABANDON_MAX_IVR_TIME;
    return escapedIVR && quickExit;
  }).length;

  const shortAbandons = inboundCalls.filter(r =>
    r.flow_exit !== false &&
    (r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD)
  ).length;

  const validCallRecords = inboundCalls.filter(r =>
    r.flow_exit !== false &&
    (r.queue_time_seconds === null || r.queue_time_seconds >= SHORT_ABANDON_THRESHOLD)
  );
  const validCalls = validCallRecords.length;

  const queueBase = getUnifiedQueueBase(inboundCalls);
  const states = getUnifiedStates(queueBase);

  const reachedQueue = queueBase.length;
  const assigned = states.assigned.length;
  const conversationReal = states.conversationReal.length;

  const abandonInQueue = states.notAssigned.length;
  const abandonInAlert = states.assignedNoConversation.length;
  const totalAbandonments = abandonInQueue + abandonInAlert;

  const attendedCalls = conversationReal;
  const realAbandonedCalls = totalAbandonments;

  const attendedWaitTimes = states.conversationReal
    .map(r => (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0))
    .filter(t => t >= 0);

  const asaPerceptualSeconds = attendedWaitTimes.length > 0
    ? Math.round(attendedWaitTimes.reduce((a, b) => a + b, 0) / attendedWaitTimes.length)
    : 0;

  const abandonedWaitTimes = [
    ...states.notAssigned,
    ...states.assignedNoConversation,
  ]
    .map(r => (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0))
    .filter(t => t >= 0);

  const ataPerceptualSeconds = abandonedWaitTimes.length > 0
    ? Math.round(abandonedWaitTimes.reduce((a, b) => a + b, 0) / abandonedWaitTimes.length)
    : 0;

  const ivrRecords = inboundCalls.filter(r => r.flow_exit === false);
  const ivrWaitTimes = ivrRecords
    .map(r => r.ivr_time_seconds ?? 0)
    .filter(t => t >= 0);

  const avgIvrSeconds = ivrWaitTimes.length > 0
    ? Math.round(ivrWaitTimes.reduce((a, b) => a + b, 0) / ivrWaitTimes.length)
    : 0;

  const integrityExpected = totalInbound;
  const integrityActual = ivrMenuAbandons + ivrErrors + shortAbandons + attendedCalls + realAbandonedCalls;
  const integrityCheck = {
    expected: integrityExpected,
    actual: integrityActual,
    isValid: integrityExpected === integrityActual,
  };

  return {
    totalInbound,
    reachedQueue,
    assigned,
    conversationReal,
    abandonInQueue,
    abandonInAlert,
    totalAbandonments,
    ivrMenuAbandons,
    ivrErrors,
    shortAbandons,
    validCalls,
    attendedCalls,
    realAbandonedCalls,
    asaPerceptualSeconds,
    ataPerceptualSeconds,
    avgIvrSeconds,
    integrityCheck,
  };
}

export function calculateTechnicalLeaks(records: CallRecord[]): TechnicalLeaksData {
  const SHORT_ABANDON_THRESHOLD = 5;

  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  const ivrDrops = inboundCalls.filter(r => r.flow_exit === false).length;

  const shortAbandons = inboundCalls.filter(r =>
    r.flow_exit !== false &&
    !r.attended &&
    (r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD)
  ).length;

  const totalTechnicalLeaks = shortAbandons + ivrDrops;
  const percentOfInbound = inboundCalls.length > 0
    ? Math.round((totalTechnicalLeaks / inboundCalls.length) * 100)
    : 0;

  return { shortAbandons, ivrDrops, totalTechnicalLeaks, percentOfInbound };
}

export function generateQueueHealthInsights(
  metrics: QueueHealthMetric[],
  funnelData: AbandonFunnelData,
  records: CallRecord[]
): QueueHealthInsight[] {
  const insights: QueueHealthInsight[] = [];

  for (const metric of metrics) {
    if (metric.serviceLevelPercent < 80 && metric.abandonmentRatePercent > 10) {
      insights.push({
        type: 'staffing',
        severity: 'critical',
        queue: metric.queue,
        message: `Falta Personal: La cola ${metric.queue} está subdimensionada. Los clientes cuelgan por exceso de espera.`,
        metric: 'Service Level & Abandonment Rate',
        value: `SL: ${metric.serviceLevelPercent}%, Abandonos: ${metric.abandonmentRatePercent}%`,
        threshold: 'SL > 80%, Abandonos < 10%',
      });
    }
  }

  const totalAbandons = funnelData.totalAbandonments;
  // bounceAbandons is not tracked in AbandonFunnelData; skip this insight
  // (previously referenced a non-existent property that was always undefined)
  const bounceAbandons = 0;
  if (totalAbandons > 0 && bounceAbandons / totalAbandons > 0.05) {
    insights.push({
      type: 'availability',
      severity: 'warning',
      queue: 'General',
      message: `Abandonos tras Rebote Elevados: Los clientes están siendo devueltos frecuentemente antes de ser atendidos. Revisar estrategia de enrutamiento y disponibilidad de agentes.`,
      metric: 'Bounce Abandon Rate',
      value: `${Math.round((bounceAbandons / totalAbandons) * 100)}%`,
      threshold: '< 5%',
    });
  }

  const topCallers = new Map<string, number>();
  for (const r of records) {
    if (r.ani_hash) {
      topCallers.set(r.ani_hash, (topCallers.get(r.ani_hash) || 0) + 1);
    }
  }
  const reentryPercent = topCallers.size > 0
    ? Array.from(topCallers.values()).filter(count => count > 1).length / topCallers.size * 100
    : 0;

  if (reentryPercent > 15) {
    insights.push({
      type: 'quality',
      severity: 'warning',
      queue: 'General',
      message: `Revisar Calidad: Los clientes están volviendo a llamar mucho. Posible falta de resolución o agentes muy dependientes del Hold.`,
      metric: 'Re-entry %',
      value: `${Math.round(reentryPercent)}%`,
      threshold: '< 15%',
    });
  }

  return insights;
}

export function calculateBounceRate(records: CallRecord[]): number {
  const inboundCalls = records.filter(r => isInbound(r.call_direction));
  const attendedCalls = inboundCalls.filter(r => r.attended).length;

  if (attendedCalls === 0) return 0;

  const bouncedCalls = inboundCalls.filter(r => r.attended && r.alert_segments > 1).length;
  return Math.round((bouncedCalls / attendedCalls) * 100);
}

export function calculateMenuAbandonRate(records: CallRecord[]): number {
  const MENU_INTERACTION_THRESHOLD = 10;
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  if (inboundCalls.length === 0) return 0;

  const menuAbandons = inboundCalls.filter(r => {
    const escapedIVR = r.flow_exit !== true;
    const spentTimeInMenu = (r.ivr_time_seconds ?? 0) > MENU_INTERACTION_THRESHOLD;
    return escapedIVR && spentTimeInMenu;
  });

  const ivrExitsCount = inboundCalls.filter(r => r.flow_exit !== true).length;
  const withIvrTimeCount = inboundCalls.filter(r => (r.ivr_time_seconds ?? 0) > 0).length;

  console.log(`[MenuAbandonRate DEBUG]
    Total inbound: ${inboundCalls.length}
    Calls with flow_exit !== true: ${ivrExitsCount}
    Calls with ivr_time_seconds > 0: ${withIvrTimeCount}
    Menu abandons (flow_exit !== true AND ivr_time > 10s): ${menuAbandons.length}
  `);

  return Math.round((menuAbandons.length / inboundCalls.length) * 100);
}

export function calculateAlertSuccessRatio(records: CallRecord[]): number {
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  if (inboundCalls.length === 0) return 0;

  const alertedCalls = inboundCalls.filter(r => (r.alert_segments || 0) > 0);

  if (alertedCalls.length === 0) return 0;

  const noResponseCount = alertedCalls.filter(r => r.users_not_respond && r.users_not_respond.trim().length > 0).length;

  const successRatio = (1 - (noResponseCount / alertedCalls.length)) * 100;
  return Math.round(successRatio);
}

export function calculateOperationalKPIs(records: CallRecord[]): OperationalKPIs {
  return {
    bounceRatePercent: calculateBounceRate(records),
    menuAbandonRatePercent: calculateMenuAbandonRate(records),
    alertSuccessRatio: calculateAlertSuccessRatio(records),
  };
}

export function calculateQueueWaitDistribution(records: CallRecord[]): QueueWaitDistributionData {
  const SHORT_ABANDON_THRESHOLD = 5;
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  const validCallRecords = inboundCalls.filter(r =>
    r.flow_exit !== false &&
    (r.queue_time_seconds === null || r.queue_time_seconds >= SHORT_ABANDON_THRESHOLD)
  );

  const realAbandonedCalls = validCallRecords.filter(r => !r.attended);

  const buckets = [
    { label: '<10s', min: 0, max: 10 },
    { label: '10-20s', min: 10, max: 20 },
    { label: '20-30s', min: 20, max: 30 },
    { label: '30-60s', min: 30, max: 60 },
    { label: '60-120s', min: 60, max: 120 },
    { label: '120-300s', min: 120, max: 300 },
    { label: '300-600s', min: 300, max: 600 },
    { label: '>600s', min: 600, max: Infinity },
  ];

  const bucketData = buckets.map(b => {
    const count = realAbandonedCalls.filter(r => {
      const perceptualWait = (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0);
      return perceptualWait >= b.min && perceptualWait < b.max;
    }).length;
    return {
      label: b.label,
      count,
      percentage: realAbandonedCalls.length > 0 ? Math.round((count / realAbandonedCalls.length) * 100) : 0,
    };
  });

  const slCount = realAbandonedCalls.filter(r =>
    (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0) <= 20
  ).length;
  const midCount = realAbandonedCalls.filter(r => {
    const perceptualWait = (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0);
    return perceptualWait > 20 && perceptualWait <= 60;
  }).length;
  const longCount = realAbandonedCalls.filter(r =>
    (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0) > 60
  ).length;

  return {
    buckets: bucketData,
    slPercent: realAbandonedCalls.length > 0 ? Math.round((slCount / realAbandonedCalls.length) * 100) : 0,
    midPercent: realAbandonedCalls.length > 0 ? Math.round((midCount / realAbandonedCalls.length) * 100) : 0,
    longPercent: realAbandonedCalls.length > 0 ? Math.round((longCount / realAbandonedCalls.length) * 100) : 0,
    totalValidCalls: realAbandonedCalls.length,
  };
}

export function calculateAttendedWaitDistribution(records: CallRecord[]): AttendedWaitDistributionData {
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  const attendedCalls = inboundCalls.filter(r =>
    r.attended && (r.conversation_total_seconds ?? 0) > 0
  );

  const buckets = [
    { label: '0-20s', min: 0, max: 20, color: '#84BD00' },
    { label: '21-40s', min: 20, max: 40, color: '#9ac924' },
    { label: '41-60s', min: 40, max: 60, color: '#fbbf24' },
    { label: '1-2m', min: 60, max: 120, color: '#f59e0b' },
    { label: '2-5m', min: 120, max: 300, color: '#f87171' },
    { label: '5-10m', min: 300, max: 600, color: '#ef4444' },
    { label: '+10m', min: 600, max: Infinity, color: '#dc2626' },
  ];

  const bucketData = buckets.map(b => {
    const count = attendedCalls.filter(r => {
      const queueTime = r.queue_time_seconds ?? 0;
      return queueTime >= b.min && queueTime < b.max;
    }).length;
    return {
      label: b.label,
      count,
      percentage: attendedCalls.length > 0 ? Math.round((count / attendedCalls.length) * 100) : 0,
      color: b.color,
    };
  });

  const totalWaitTime = attendedCalls.reduce((sum, r) => sum + (r.queue_time_seconds ?? 0), 0);
  const averageWaitTime = attendedCalls.length > 0 ? Math.round(totalWaitTime / attendedCalls.length) : 0;

  const slZone = attendedCalls.filter(r => (r.queue_time_seconds ?? 0) <= 20).length;
  const midZone = attendedCalls.filter(r => {
    const qt = r.queue_time_seconds ?? 0;
    return qt > 20 && qt <= 40;
  }).length;
  const warningZone = attendedCalls.filter(r => {
    const qt = r.queue_time_seconds ?? 0;
    return qt > 40 && qt <= 120;
  }).length;
  const criticalZone = attendedCalls.filter(r => (r.queue_time_seconds ?? 0) > 120).length;

  return {
    buckets: bucketData,
    averageWaitTime,
    totalAttendedCalls: attendedCalls.length,
    slZone,
    midZone,
    warningZone,
    criticalZone,
  };
}
