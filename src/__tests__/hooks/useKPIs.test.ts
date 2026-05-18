import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKPIs } from '../../hooks/useKPIs';
import { SAMPLE_CALLS } from '../fixtures/sampleCallData';

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
