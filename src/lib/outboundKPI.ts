import type { CallRecord } from './supabase';

export type OutboundKPI = {
  effectiveContactRate: number;
  ahtOutbound: {
    conversation: number;
    acw: number;
    total: number;
  };
  occupancyImpact: number;
  totalOutboundAttempts: number;
  validContacts: number;
  debugStats?: {
    totalSalientes: number;
    withValidExecutive: number;
    withConversation: number;
    withSistemaExit: number;
  };
};

export type ContactabilityHeatmapCell = {
  hour: number;
  queue: string;
  contactabilityPercent: number;
  attempts: number;
  validContacts: number;
};

export type ContactabilityHeatmapRow = {
  queue: string;
  cells: ContactabilityHeatmapCell[];
};

export type ContactabilityHeatmapData = {
  data: ContactabilityHeatmapRow[];
  maxContactability: number;
};

export type ExecutiveOutboundStat = {
  executive: string;
  queue: string;
  attempts: number;
  validContacts: number;
  contactRate: number;
  avgConversation: number;
  avgACW: number;
  avgAHT: number;
};

export type ExecutiveScatterPoint = {
  executive: string;
  queue: string;
  attempts: number;
  validConversationSeconds: number;
  radius: number;
};

export type ExecutiveScatterData = {
  points: ExecutiveScatterPoint[];
  maxAttempts: number;
  maxConversation: number;
};

const OUTBOUND_CONTACT_THRESHOLD_SECONDS = 10;

function isOutboundCall(record: CallRecord): boolean {
  return record.call_direction?.toLowerCase() === 'saliente';
}

function isValidOutboundContact(record: CallRecord): boolean {
  if (!isOutboundCall(record)) return false;

  const conversationSeconds = record.conversation_total_seconds || 0;
  const disconnectionType = record.exit_reason || record.abandon_type || '';

  return (
    conversationSeconds > OUTBOUND_CONTACT_THRESHOLD_SECONDS &&
    disconnectionType.toLowerCase() !== 'sistema' &&
    disconnectionType.toLowerCase() !== 'system'
  );
}

export function calculateOutboundKPIs(records: CallRecord[]): OutboundKPI {
  const outboundRecords = records.filter(isOutboundCall);
  const validContacts = outboundRecords.filter(isValidOutboundContact);

  // Debug stats para entender filtros
  const withValidExecutive = outboundRecords.filter(r =>
    r.executive &&
    r.executive !== 'SIN ATENDER' &&
    r.executive !== 'Sin asignar' &&
    r.executive !== 'DESCONOCIDO'
  ).length;

  const withConversation = outboundRecords.filter(r => (r.conversation_total_seconds || 0) > 0).length;

  const withSistemaExit = outboundRecords.filter(r =>
    (r.exit_reason || '').toLowerCase() === 'sistema'
  ).length;

  if (outboundRecords.length === 0) {
    return {
      effectiveContactRate: 0,
      ahtOutbound: { conversation: 0, acw: 0, total: 0 },
      occupancyImpact: 0,
      totalOutboundAttempts: 0,
      validContacts: 0,
      debugStats: {
        totalSalientes: 0,
        withValidExecutive: 0,
        withConversation: 0,
        withSistemaExit: 0,
      },
    };
  }

  const effectiveContactRate = validContacts.length / outboundRecords.length;

  const totalConversationSeconds = outboundRecords.reduce(
    (sum, r) => sum + (r.conversation_total_seconds || 0),
    0
  );
  const totalACWSeconds = outboundRecords.reduce(
    (sum, r) => sum + (r.acw_seconds || 0),
    0
  );

  const ahtConversation = outboundRecords.length > 0
    ? totalConversationSeconds / outboundRecords.length
    : 0;
  const ahtACW = outboundRecords.length > 0
    ? totalACWSeconds / outboundRecords.length
    : 0;

  const totalOutboundSeconds = outboundRecords.reduce(
    (sum, r) => sum + (r.handle_time_seconds || 0),
    0
  );
  const allRecordsTotalSeconds = records.reduce(
    (sum, r) => sum + (r.handle_time_seconds || 0),
    0
  );

  const occupancyImpact =
    allRecordsTotalSeconds > 0 ? totalOutboundSeconds / allRecordsTotalSeconds : 0;

  return {
    effectiveContactRate,
    ahtOutbound: {
      conversation: ahtConversation,
      acw: ahtACW,
      total: ahtConversation + ahtACW,
    },
    occupancyImpact,
    totalOutboundAttempts: outboundRecords.length,
    validContacts: validContacts.length,
    debugStats: {
      totalSalientes: outboundRecords.length,
      withValidExecutive,
      withConversation,
      withSistemaExit,
    },
  };
}

export function generateContactabilityHeatmap(
  records: CallRecord[]
): ContactabilityHeatmapData {
  const outboundRecords = records.filter(isOutboundCall);

  if (outboundRecords.length === 0) {
    return { data: [], maxContactability: 0 };
  }

  const queueMap = new Map<string, Map<number, { attempts: number; valid: number }>>();

  for (const record of outboundRecords) {
    const queue = record.queue || 'Sin asignar';
    const hour = record.call_hour ?? -1;

    if (hour < 0 || hour > 23) continue;

    if (!queueMap.has(queue)) {
      queueMap.set(queue, new Map());
    }

    const hourMap = queueMap.get(queue)!;
    if (!hourMap.has(hour)) {
      hourMap.set(hour, { attempts: 0, valid: 0 });
    }

    const stats = hourMap.get(hour)!;
    stats.attempts += 1;
    if (isValidOutboundContact(record)) {
      stats.valid += 1;
    }
  }

  const queueStats: Array<[string, number]> = Array.from(queueMap.entries())
    .map(([queue, hourMap]) => {
      const total = Array.from(hourMap.values()).reduce(
        (sum, stats) => sum + stats.attempts,
        0
      );
      return [queue, total] as [string, number];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let maxContactability = 0;
  const data: ContactabilityHeatmapRow[] = queueStats.map(([queue]) => {
    const hourMap = queueMap.get(queue)!;
    const cells: ContactabilityHeatmapCell[] = [];

    for (let hour = 8; hour <= 18; hour++) {
      const stats = hourMap.get(hour) ?? { attempts: 0, valid: 0 };
      const contactabilityPercent =
        stats.attempts > 0 ? stats.valid / stats.attempts : 0;

      cells.push({
        hour,
        queue,
        contactabilityPercent,
        attempts: stats.attempts,
        validContacts: stats.valid,
      });

      maxContactability = Math.max(maxContactability, contactabilityPercent);
    }

    return { queue, cells };
  });

  return { data, maxContactability };
}

export function calculateExecutiveOutboundStats(
  records: CallRecord[]
): ExecutiveOutboundStat[] {
  const outboundRecords = records.filter(isOutboundCall);

  if (outboundRecords.length === 0) {
    return [];
  }

  const executiveMap = new Map<
    string,
    {
      attempts: number;
      valid: number;
      totalConversation: number;
      totalACW: number;
    }
  >();

  for (const record of outboundRecords) {
    const executive = record.executive || 'Sin asignar';

    // Skip unattended/placeholder executives for outbound
    if (executive === 'SIN ATENDER' || executive === 'Sin asignar' || executive === 'DESCONOCIDO') {
      continue;
    }

    const isValid = isValidOutboundContact(record);

    if (!executiveMap.has(executive)) {
      executiveMap.set(executive, {
        attempts: 0,
        valid: 0,
        totalConversation: 0,
        totalACW: 0,
      });
    }

    const stats = executiveMap.get(executive)!;
    stats.attempts += 1;
    if (isValid) {
      stats.valid += 1;
      stats.totalConversation += record.conversation_total_seconds || 0;
      stats.totalACW += record.acw_seconds || 0;
    }
  }

  const result: ExecutiveOutboundStat[] = [];

  for (const [executive, stats] of executiveMap.entries()) {
    const contactRate = stats.attempts > 0 ? stats.valid / stats.attempts : 0;
    const avgConversation = stats.valid > 0 ? stats.totalConversation / stats.valid : 0;
    const avgACW = stats.valid > 0 ? stats.totalACW / stats.valid : 0;

    result.push({
      executive,
      queue: '', // No longer grouping by queue
      attempts: stats.attempts,
      validContacts: stats.valid,
      contactRate,
      avgConversation,
      avgACW,
      avgAHT: avgConversation + avgACW,
    });
  }

  return result.sort((a, b) => b.attempts - a.attempts);
}

export function generateExecutiveScatterData(
  records: CallRecord[]
): ExecutiveScatterData {
  const stats = calculateExecutiveOutboundStats(records);

  if (stats.length === 0) {
    return { points: [], maxAttempts: 0, maxConversation: 0 };
  }

  let maxAttempts = 0;
  let maxConversation = 0;

  const points: ExecutiveScatterPoint[] = stats.map(stat => {
    maxAttempts = Math.max(maxAttempts, stat.attempts);
    maxConversation = Math.max(
      maxConversation,
      stat.validContacts * stat.avgConversation
    );

    return {
      executive: stat.executive,
      queue: stat.queue,
      attempts: stat.attempts,
      validConversationSeconds: stat.validContacts * stat.avgConversation,
      radius: Math.sqrt(stat.validContacts) * 2,
    };
  });

  return { points, maxAttempts, maxConversation };
}
