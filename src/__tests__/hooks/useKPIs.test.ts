import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKPIs } from '../../hooks/useKPIs';
import { SAMPLE_CALLS } from '../fixtures/sampleCallData';

const mockEmpty = {
  totalCalls: 0,
  avgDurationSeconds: 0,
  avgDurationFormatted: '00:00',
  completenessRate: 0,
  unattendedCount: 0,
  unattendedPercent: 0,
  maxDurationSeconds: 0,
  maxDurationFormatted: '00:00',
  minDurationSeconds: 0,
  minDurationFormatted: '00:00',
  avgQueueTimeSeconds: 0,
  avgQueueTimeFormatted: '00:00',
  avgHandleTimeSeconds: 0,
  avgHandleTimeFormatted: '00:00',
  avgAlertTimeSeconds: 0,
  avgHoldTimeSeconds: 0,
  maxQueueTimeSeconds: 0,
  maxQueueTimeFormatted: '00:00',
  maxHoldTimeSeconds: 0,
  maxHoldTimeFormatted: '00:00',
  executiveStats: [],
  queueStats: [],
  queuePerformanceHeatmap: { data: [], maxCount: 0 },
  queueUnattendedHeatmap: { data: [] },
  queueLoadVariability: { queues: [] },
  queueAttendanceEvolution: { weeklyPeriods: [], monthlyPeriods: [], queues: [] },
  weeklyAttentionHeatmap: { weeks: [], weekLabels: [], queues: [], data: [] },
  executiveOccupancy: { entries: [] },
  hourlyDemand: { points: [], peakErlangs: 0, weekdayCounts: { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 }, agentCountsByHour: {} },
  interventionMetrics: [],
  hourlyDistribution: [],
  dailyDistribution: [],
  dailyAttendedVsUnattended: [],
  directionStats: [],
  executiveDailyTalkTime: [],
  executiveHourlyTalkTime: [],
  executiveWeekdayTalkTime: [],
  topExecutivesByVolume: [],
  allExecutivesWithData: [],
  topCallers: [],
  serviceLevel: { overallSL: 0, points: [] },
  abandonStats: { totalUnattended: 0, abandonedInQueue: 0, abandonedInAlert: 0, abandonedInIVR: 0, reentries: 0 },
};

vi.mock('../../lib/kpi', () => ({
  getEmptyKPISummary: vi.fn(() => ({ ...mockEmpty })),
  calculateKPIs: vi.fn(async (records: unknown[]) => ({
    ...mockEmpty,
    totalCalls: records.length,
    queueStats: [],
    executiveStats: [],
  })),
}));

describe('useKPIs', () => {
  it('debería inicializar con KPIs vacíos', () => {
    const { result } = renderHook(() => useKPIs([]));

    expect(result.current.kpis).toBeDefined();
    expect(result.current.kpis.totalCalls).toBe(0);
  });

  it('debería calcular KPIs con registros válidos', async () => {
    const { result } = renderHook(() => useKPIs(SAMPLE_CALLS));

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBeGreaterThan(0);
    });
  });

  it('debería contar totalCalls correctamente', async () => {
    const { result } = renderHook(() => useKPIs(SAMPLE_CALLS));

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBe(SAMPLE_CALLS.length);
    });
  });

  it('debería retornar queueStats como array', async () => {
    const { result } = renderHook(() => useKPIs(SAMPLE_CALLS));

    await waitFor(() => {
      expect(Array.isArray(result.current.kpis.queueStats)).toBe(true);
    });
  });

  it('debería retornar executiveStats como array', async () => {
    const { result } = renderHook(() => useKPIs(SAMPLE_CALLS));

    await waitFor(() => {
      expect(Array.isArray(result.current.kpis.executiveStats)).toBe(true);
    });
  });

  it('debería recalcular KPIs cuando cambian los records', async () => {
    let records = SAMPLE_CALLS.slice(0, 2);
    const { result, rerender } = renderHook(() => useKPIs(records));

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBe(2);
    });

    records = SAMPLE_CALLS;
    rerender();

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBe(SAMPLE_CALLS.length);
    });
  });

  it('debería resetear a KPIs vacíos con array vacío', async () => {
    let records = SAMPLE_CALLS;
    const { result, rerender } = renderHook(() => useKPIs(records));

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBe(SAMPLE_CALLS.length);
    });

    records = [];
    rerender();

    await waitFor(() => {
      expect(result.current.kpis.totalCalls).toBe(0);
    });
  });
});
