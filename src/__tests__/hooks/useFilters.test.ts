import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../../hooks/useFilters';
import { createMockCallRecord } from '../fixtures/sampleCallData';
import type { AgentStatusRecord } from '../../lib/supabase';

const mondayRecord = createMockCallRecord({
  call_date: '2026-05-18', // lunes
  call_hour: 10,
  call_direction: 'inbound',
  queue: 'BiceHipotecaria - SAC',
  executive: 'Ana García',
  attended: true,
});

const emptyAgentRecords: AgentStatusRecord[] = [];

describe('useFilters', () => {
  it('debería inicializar con filtros vacíos', () => {
    const { result } = renderHook(() => useFilters([mondayRecord], emptyAgentRecords));

    expect(result.current.filters.queues).toEqual([]);
    expect(result.current.filters.executives).toEqual([]);
    expect(result.current.filters.dateStart).toBe('');
  });

  it('debería retornar todos los registros en horario laboral con filtros vacíos', () => {
    const { result } = renderHook(() => useFilters([mondayRecord], emptyAgentRecords));

    expect(result.current.filteredRecords).toHaveLength(1);
    expect(result.current.baseFilteredRecords).toHaveLength(1);
  });

  it('debería excluir registros fuera de horario laboral', () => {
    const nightRecord = createMockCallRecord({ call_date: '2026-05-18', call_hour: 22 });
    const { result } = renderHook(() => useFilters([mondayRecord, nightRecord], emptyAgentRecords));

    expect(result.current.filteredRecords).toHaveLength(1);
  });

  it('debería actualizar filteredRecords al cambiar filtros', () => {
    const { result } = renderHook(() => useFilters([mondayRecord], emptyAgentRecords));

    act(() => {
      result.current.setFilters(prev => ({
        ...prev,
        queues: ['OtraQueue'],
      }));
    });

    expect(result.current.filteredRecords).toHaveLength(0);
  });

  it('baseFilteredRecords NO debería filtrar por fecha', () => {
    const { result } = renderHook(() => useFilters([mondayRecord], emptyAgentRecords));

    act(() => {
      result.current.setFilters(prev => ({
        ...prev,
        dateStart: '2026-05-19',
        dateEnd: '2026-05-25',
      }));
    });

    // filteredRecords excluye por fecha
    expect(result.current.filteredRecords).toHaveLength(0);
    // baseFilteredRecords ignora el filtro de fecha
    expect(result.current.baseFilteredRecords).toHaveLength(1);
  });

  it('debería filtrar agentStatusRecords por ejecutivo', () => {
    const agentRecord: AgentStatusRecord = {
      id: 'a1',
      upload_id: 'u1',
      agent_name: 'Ana García',
      date_range_start: '2026-05-01',
      date_range_end: '2026-05-31',
      in_queue_seconds: 100,
      off_queue_seconds: 50,
      total_seconds: 150,
      occupancy_percent: 0.5,
      acw_seconds: 10,
      in_queue_formatted: '01:40',
      off_queue_formatted: '00:50',
      total_formatted: '02:30',
    };

    const { result } = renderHook(() => useFilters([mondayRecord], [agentRecord]));

    act(() => {
      result.current.setFilters(prev => ({
        ...prev,
        executives: ['Otro Ejecutivo'],
      }));
    });

    expect(result.current.filteredAgentStatusRecords).toHaveLength(0);
  });

  it('debería retornar todos agentStatusRecords con filtros vacíos', () => {
    const agentRecord: AgentStatusRecord = {
      id: 'a1',
      upload_id: 'u1',
      agent_name: 'Ana García',
      date_range_start: '2026-05-01',
      date_range_end: '2026-05-31',
      in_queue_seconds: 100,
      off_queue_seconds: 50,
      total_seconds: 150,
      occupancy_percent: 0.5,
      acw_seconds: 10,
      in_queue_formatted: '01:40',
      off_queue_formatted: '00:50',
      total_formatted: '02:30',
    };

    const { result } = renderHook(() => useFilters([mondayRecord], [agentRecord]));

    expect(result.current.filteredAgentStatusRecords).toHaveLength(1);
  });

  it('debería manejar array vacío de records', () => {
    const { result } = renderHook(() => useFilters([], emptyAgentRecords));

    expect(result.current.filteredRecords).toHaveLength(0);
    expect(result.current.baseFilteredRecords).toHaveLength(0);
    expect(result.current.filteredAgentStatusRecords).toHaveLength(0);
  });
});
