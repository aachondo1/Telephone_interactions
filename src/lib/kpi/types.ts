// ============================================================================
// SERVICE LEVEL
// ============================================================================
export type ServiceLevelPoint = {
  hour: number;
  label: string;
  totalInQueue: number;
  answeredWithin20s: number;
  serviceLevel: number;
  avgQueueTime: number;
  medianQueueTime: number;
};

export type ServiceLevelData = {
  overallSL: number;
  points: ServiceLevelPoint[];
};

// ============================================================================
// ABANDONOS
// ============================================================================
export type AbandonStats = {
  totalUnattended: number;
  abandonedInQueue: number;
  abandonedInAlert: number;
  abandonedInIVR: number;
  reentries: number;
};

// ============================================================================
// EJECUTIVOS
// ============================================================================
export type ExecutiveStat = {
  executive: string;
  count: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  percentage: number;
  inboundCount: number;
  outboundCount: number;
  unattendedCount: number;
  unattendedPercent: number;
  completenessRate: number;
  avgHandleTimeSeconds: number;
  avgQueueTimeSeconds: number;
  avgAlertTimeSeconds: number;
  avgAlertSegments: number;
  bounceCount: number;
  bounceRate: number;
};

export type ExecutiveOccupancyEntry = {
  executive: string;
  avgOccupancyPct: number;
  weeklyTalkMinutes: number;
  weeklyAlertMinutes: number;
  weeklyAhtPMinutes: number;
  weeklyFreeMinutes: number;
  weeklyShiftMinutes: number;
  daysWithCalls: number;
  occupancyAlertFlag?: boolean;
};

export type ExecutiveOccupancyData = {
  entries: ExecutiveOccupancyEntry[];
};

export type ExecutiveDailyTalkTime = {
  date: string;
  [executive: string]: number | string;
};

export type ExecutiveHourlyTalkTime = {
  hour: number;
  label: string;
  [executive: string]: number | string;
};

export type ExecutiveWeekdayTalkTime = {
  day: number;
  label: string;
  [executive: string]: number | string;
};

// ============================================================================
// COLAS
// ============================================================================
export type QueueStat = {
  queue: string;
  count: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  percentage: number;
  inboundCount: number;
  outboundCount: number;
  unattendedCount: number;
  unattendedPercent: number;
  completenessRate: number;
  avgQueueTimeSeconds: number;
  avgHandleTimeSeconds: number;
  avgAlertTimeSeconds: number;
  avgAlertSegments: number;
  bounceRate: number;
  abandonQueueRate: number;
  abandonAlertRate: number;
};

export type QueueHeatmapCell = {
  hour: number;
  weekday: number;
  count: number;
};

export type QueueHeatmapRow = {
  queue: string;
  cells: QueueHeatmapCell[];
};

export type QueueHeatmapData = {
  data: QueueHeatmapRow[];
  maxCount: number;
};

export type QueueUnattendedCell = {
  hour: number;
  weekday: number;
  total: number;
  unattended: number;
  rate: number;
};

export type QueueUnattendedRow = {
  queue: string;
  cells: QueueUnattendedCell[];
};

export type QueueUnattendedHeatmapData = {
  data: QueueUnattendedRow[];
};

export type QueueHourlyStats = {
  hour: number;
  label: string;
  avg: number;
  min: number;
  max: number;
};

export type QueueVariabilityRow = {
  queue: string;
  totalCalls: number;
  hourlyStats: QueueHourlyStats[];
};

export type QueueVariabilityData = {
  queues: QueueVariabilityRow[];
};

export type AttendancePeriodPoint = {
  key: string;
  label: string;
  [queue: string]: number | string | null;
};

export type QueueAttendanceEvolutionData = {
  weeklyPeriods: AttendancePeriodPoint[];
  monthlyPeriods: AttendancePeriodPoint[];
  queues: string[];
};

export type WeeklyAttentionHeatmapData = {
  weeks: string[];
  weekLabels: string[];
  queues: string[];
  data: Array<{
    queue: string;
    cells: Array<{ weekKey: string; percentage: number | null }>;
  }>;
};

// ============================================================================
// PLANIFICACIÓN
// ============================================================================
export type HourlyDemandPoint = {
  hour: number;
  label: string;
  lun: number | null;
  mar: number | null;
  mie: number | null;
  jue: number | null;
  vie: number | null;
  lunAgents?: number | null;
  marAgents?: number | null;
  mieAgents?: number | null;
  jueAgents?: number | null;
  vieAgents?: number | null;
};

export type HourlyDemandData = {
  points: HourlyDemandPoint[];
  peakErlangs: number;
  weekdayCounts: { lun: number; mar: number; mie: number; jue: number; vie: number };
  agentCountsByHour?: { [key: string]: number | null };
};

export type InterventionMetrics = {
  queueName: string;
  callsWithAlert: number;
  callsWithoutAlert: number;
  avgAlertTimeSeconds: number;
  avgHandleTimeSeconds: number;
  alertTimeAsPercentageOfAHT: number;
  erlangsByAlerts: number;
  erlangsByHandle: number;
  erlangTotal: number;
};

// ============================================================================
// TOP CALLERS
// ============================================================================
export type TopCallerQueueEntry = {
  queue: string;
  count: number;
};

export type TopCallerExecutiveEntry = {
  executive: string;
  count: number;
};

export type TopCallerEntry = {
  aniHash: string;
  aniMasked: string;
  callCount: number;
  attendedCount: number;
  unattendedCount: number;
  queues: TopCallerQueueEntry[];
  executives: TopCallerExecutiveEntry[];
};

// ============================================================================
// DISTRIBUCIONES
// ============================================================================
export type HourBucket = {
  hour: number;
  label: string;
  count: number;
};

export type DailyBucket = {
  date: string;
  count: number;
};

export type DailyAttendanceBucket = {
  date: string;
  attended: number;
  unattended: number;
  total: number;
};

export type DirectionStat = {
  direction: string;
  count: number;
  percentage: number;
};

// ============================================================================
// SALUD DE COLAS
// ============================================================================
export type QueueHealthMetric = {
  queue: string;
  serviceLevelPercent: number;
  abandonmentRatePercent: number;
  awtSeconds: number;
  awtFormatted: string;
  asaSeconds: number;
  asaFormatted: string;
  ataSeconds: number;
  ataFormatted: string;
  erlangC: number;
  staffingEfficiency: number;
  slTrend: 'up' | 'down' | 'stable';
  totalCalls: number;
  attendedCalls: number;
  abandonedCalls: number;
  abandonInQueue: number;
  abandonInAlert: number;
};

export type AbandonFunnelData = {
  totalInbound: number;
  reachedQueue: number;
  assigned: number;
  conversationReal: number;
  abandonInQueue: number;
  abandonInAlert: number;
  totalAbandonments: number;
  ivrMenuAbandons: number;
  ivrErrors: number;
  shortAbandons: number;
  validCalls: number;
  attendedCalls: number;
  realAbandonedCalls: number;
  asaPerceptualSeconds: number;
  ataPerceptualSeconds: number;
  avgIvrSeconds: number;
  integrityCheck: {
    expected: number;
    actual: number;
    isValid: boolean;
  };
};

export type TechnicalLeaksData = {
  shortAbandons: number;
  ivrDrops: number;
  totalTechnicalLeaks: number;
  percentOfInbound: number;
};

export type QueueHealthInsight = {
  type: 'staffing' | 'availability' | 'quality';
  severity: 'critical' | 'warning' | 'info';
  queue: string;
  hour?: number;
  message: string;
  metric: string;
  value: number | string;
  threshold: number | string;
};

export type QueueWaitDistributionData = {
  buckets: Array<{ label: string; count: number; percentage: number }>;
  slPercent: number;
  midPercent: number;
  longPercent: number;
  totalValidCalls: number;
};

export type AttendedWaitDistributionData = {
  buckets: Array<{ label: string; count: number; percentage: number; color: string }>;
  averageWaitTime: number;
  totalAttendedCalls: number;
  slZone: number;
  midZone: number;
  warningZone: number;
  criticalZone: number;
};

export type OperationalKPIs = {
  bounceRatePercent: number;
  menuAbandonRatePercent: number;
  alertSuccessRatio: number;
};

// ============================================================================
// OUTBOUND
// ============================================================================
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

// ============================================================================
// CALIDAD DE DATOS
// ============================================================================
export interface DataQualityReport {
  totalRecords: number;
  outboundCalls: number;
  inboundCalls: number;
  handleTimeCorrupted: number;
  technicalCuts: number;
  unclassifiedAbandons: number;
  criticalIssues: {
    handleTimeCorrupted: number;
    technicalCutsAsAttended: number;
  };
}

// ============================================================================
// RESUMEN GENERAL
// ============================================================================
export type KPISummary = {
  totalCalls: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  completenessRate: number;
  unattendedCount: number;
  unattendedPercent: number;
  maxDurationSeconds: number;
  maxDurationFormatted: string;
  minDurationSeconds: number;
  minDurationFormatted: string;
  avgQueueTimeSeconds: number;
  avgQueueTimeFormatted: string;
  avgHandleTimeSeconds: number;
  avgHandleTimeFormatted: string;
  avgAlertTimeSeconds: number;
  avgHoldTimeSeconds: number;
  maxQueueTimeSeconds: number;
  maxQueueTimeFormatted: string;
  maxHoldTimeSeconds: number;
  maxHoldTimeFormatted: string;
  executiveStats: ExecutiveStat[];
  queueStats: QueueStat[];
  queuePerformanceHeatmap: QueueHeatmapData;
  queueUnattendedHeatmap: QueueUnattendedHeatmapData;
  queueLoadVariability: QueueVariabilityData;
  queueAttendanceEvolution: QueueAttendanceEvolutionData;
  weeklyAttentionHeatmap: WeeklyAttentionHeatmapData;
  executiveOccupancy: ExecutiveOccupancyData;
  hourlyDemand: HourlyDemandData;
  interventionMetrics: InterventionMetrics[];
  hourlyDistribution: HourBucket[];
  dailyDistribution: DailyBucket[];
  dailyAttendedVsUnattended: DailyAttendanceBucket[];
  directionStats: DirectionStat[];
  executiveDailyTalkTime: ExecutiveDailyTalkTime[];
  executiveHourlyTalkTime: ExecutiveHourlyTalkTime[];
  executiveWeekdayTalkTime: ExecutiveWeekdayTalkTime[];
  topExecutivesByVolume: string[];
  allExecutivesWithData: string[];
  topCallers: TopCallerEntry[];
  serviceLevel: ServiceLevelData;
  abandonStats: AbandonStats;
};
