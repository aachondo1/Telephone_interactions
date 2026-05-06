// ============================================================================
// KPI Barrel File
// Re-exports everything so existing imports like `from '../lib/kpi'` keep working
// ============================================================================

// Types
export * from './types';

// Shared helpers
export { formatDuration, isInbound } from './shared';

// General / Llamadas
export {
  calculateKPIs,
  getEmptyKPISummary,
  calculateServiceLevelPerceptual,
  calculateServiceLevel,
  calculateAbandonStats,
  calculateRentryRate,
} from './general';

// Colas
export {
  calculateQueuePerformanceHeatmap,
  calculateQueueUnattendedHeatmap,
  calculateQueueLoadVariability,
  calculateQueueAttendanceEvolution,
  calculateWeeklyAttentionHeatmap,
  calculateTopCallers,
} from './colas';

// Salud de Colas
export {
  calculateQueueHealthMetrics,
  calculateAbandonFunnel,
  calculateTechnicalLeaks,
  generateQueueHealthInsights,
  calculateBounceRate,
  calculateMenuAbandonRate,
  calculateAlertSuccessRatio,
  calculateOperationalKPIs,
  calculateQueueWaitDistribution,
  calculateAttendedWaitDistribution,
} from './salud-colas';

// Ejecutivos
export { calculateExecutiveOccupancy, calculateAgentAuditFlags } from './ejecutivos';
export type { AgentAuditFlag } from './ejecutivos';

// Planificación
export {
  calculateHourlyDemand,
  calculateInterventionImpact,
} from './planificacion';

// Outbound / Gestión Proactiva
export {
  calculateOutboundKPIs,
  generateContactabilityHeatmap,
  calculateExecutiveOutboundStats,
  generateExecutiveScatterData,
} from './outbound';

// Calidad de Datos
export {
  isCorruptedTechnicalCall,
  getDataQualityReport,
} from './calidad';

// Occupancy Validation & Audit
export {
  validateOccupancyByBusinessHours,
  isLikelyGhostConnection,
} from './ocupancy-validator';

export {
  getDeadAvailabilityByDateRange,
  calculateDeadAvailabilityPerAgent,
  adjustOccupancyForDeadAvailability,
} from './dead-availability';

export {
  generateAuditFlags,
  detectGhostConnection,
  detectUnusualHours,
} from './audit-flags';
