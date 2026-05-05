import type { CallRecord } from '../supabase';
import { DataQualityReport } from './types';

export function isCorruptedTechnicalCall(record: CallRecord): boolean {
  return (
    record.attended &&
    record.duration_seconds >= 1 &&
    record.duration_seconds <= 5 &&
    (!record.alert_time_seconds || record.alert_time_seconds === 0)
  );
}

export function getDataQualityReport(records: CallRecord[]): DataQualityReport {
  return {
    totalRecords: records.length,
    outboundCalls: records.filter(r =>
      r.call_direction?.toLowerCase().includes('saliente') ||
      r.call_direction?.toLowerCase().includes('outbound')
    ).length,
    inboundCalls: records.filter(r =>
      !r.call_direction?.toLowerCase().includes('saliente') &&
      !r.call_direction?.toLowerCase().includes('outbound')
    ).length,
    handleTimeCorrupted: records.filter(r =>
      r.attended &&
      r.handle_time_seconds > 0 &&
      r.handle_time_seconds < r.duration_seconds
    ).length,
    technicalCuts: records.filter(r => isCorruptedTechnicalCall(r)).length,
    unclassifiedAbandons: records.filter(r =>
      !r.attended && !r.abandon_type
    ).length,
    criticalIssues: {
      handleTimeCorrupted: records.filter(r =>
        r.attended && r.handle_time_seconds < r.duration_seconds && r.handle_time_seconds > 0
      ).length,
      technicalCutsAsAttended: records.filter(r => isCorruptedTechnicalCall(r)).length,
    },
  };
}
