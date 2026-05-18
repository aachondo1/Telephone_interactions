import { describe, it, expect } from 'vitest';
import {
  formatDateRange,
  isInbound,
  isBusinessHours,
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from '../lib/filterUtils';
import { createMockCallRecord } from './fixtures/sampleCallData';

describe('filterUtils: formatDateRange', () => {
  it('debería formatear rango con inicio y fin distintos', () => {
    const result = formatDateRange('2026-05-01', '2026-05-31');
    expect(result).toContain('—');
    expect(result).toBeTruthy();
  });

  it('debería formatear fecha única cuando inicio y fin son iguales', () => {
    const result = formatDateRange('2026-05-01', '2026-05-01');
    expect(result).not.toContain('—');
    expect(result).toBeTruthy();
  });

  it('debería usar end cuando start es null', () => {
    const result = formatDateRange(null, '2026-05-15');
    expect(result).toBeTruthy();
    expect(result).not.toContain('—');
  });

  it('debería usar start cuando end es null', () => {
    const result = formatDateRange('2026-05-15', null);
    expect(result).toBeTruthy();
  });

  it('debería retornar string vacío cuando ambos son null', () => {
    expect(formatDateRange(null, null)).toBe('');
  });
});

describe('filterUtils: isInbound', () => {
  it('debería reconocer "inbound"', () => {
    expect(isInbound('inbound')).toBe(true);
  });

  it('debería reconocer "entrante" en español', () => {
    expect(isInbound('entrante')).toBe(true);
  });

  it('debería ser case-insensitive', () => {
    expect(isInbound('INBOUND')).toBe(true);
    expect(isInbound('Entrante')).toBe(true);
  });

  it('debería retornar false para outbound', () => {
    expect(isInbound('outbound')).toBe(false);
    expect(isInbound('saliente')).toBe(false);
  });

  it('debería retornar false para string vacío', () => {
    expect(isInbound('')).toBe(false);
  });
});

describe('filterUtils: isBusinessHours', () => {
  it('debería retornar true para lunes a jueves en horario 08:00-18:59', () => {
    // 2026-05-18 es lunes
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: 9 })).toBe(true);
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: 18 })).toBe(true);
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: 8 })).toBe(true);
  });

  it('debería retornar false para lunes fuera de horario', () => {
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: 7 })).toBe(false);
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: 19 })).toBe(false);
  });

  it('debería retornar true para viernes en horario 08:00-14:59', () => {
    // 2026-05-22 es viernes
    expect(isBusinessHours({ call_date: '2026-05-22', call_hour: 8 })).toBe(true);
    expect(isBusinessHours({ call_date: '2026-05-22', call_hour: 14 })).toBe(true);
  });

  it('debería retornar false para viernes después de las 15:00', () => {
    expect(isBusinessHours({ call_date: '2026-05-22', call_hour: 15 })).toBe(false);
  });

  it('debería retornar false para sábado', () => {
    // 2026-05-23 es sábado
    expect(isBusinessHours({ call_date: '2026-05-23', call_hour: 10 })).toBe(false);
  });

  it('debería retornar false para domingo', () => {
    // 2026-05-24 es domingo
    expect(isBusinessHours({ call_date: '2026-05-24', call_hour: 10 })).toBe(false);
  });

  it('debería retornar true cuando call_date es null (sin filtrar)', () => {
    expect(isBusinessHours({ call_date: null, call_hour: 10 })).toBe(true);
  });

  it('debería retornar true cuando call_hour es null (sin filtrar)', () => {
    expect(isBusinessHours({ call_date: '2026-05-18', call_hour: null })).toBe(true);
  });
});

describe('filterUtils: applyFilters', () => {
  const mondayRecord = createMockCallRecord({
    call_date: '2026-05-18', // lunes
    call_hour: 10,
    call_direction: 'inbound',
    queue: 'BiceHipotecaria - SAC',
    executive: 'Ana García',
    attended: true,
    abandon_type: null,
  });

  it('debería retornar todos los registros con filtros vacíos', () => {
    const result = applyFilters([mondayRecord], DEFAULT_FILTERS);
    expect(result).toHaveLength(1);
  });

  it('debería filtrar registros fuera de horario laboral', () => {
    const nightRecord = createMockCallRecord({ call_date: '2026-05-18', call_hour: 22 });
    const result = applyFilters([mondayRecord, nightRecord], DEFAULT_FILTERS);
    expect(result).toHaveLength(1);
    expect(result[0].call_hour).toBe(10);
  });

  it('debería filtrar por rango de fechas', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      dateStart: '2026-05-19',
      dateEnd: '2026-05-25',
    };
    const result = applyFilters([mondayRecord], filters);
    expect(result).toHaveLength(0);
  });

  it('debería incluir registros dentro del rango de fechas', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      dateStart: '2026-05-17',
      dateEnd: '2026-05-19',
    };
    const result = applyFilters([mondayRecord], filters);
    expect(result).toHaveLength(1);
  });

  it('debería filtrar por cola', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, queues: ['OtraQueue'] };
    const result = applyFilters([mondayRecord], filters);
    expect(result).toHaveLength(0);
  });

  it('debería incluir registros que coinciden con la cola', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, queues: ['BiceHipotecaria - SAC'] };
    const result = applyFilters([mondayRecord], filters);
    expect(result).toHaveLength(1);
  });

  it('debería filtrar por ejecutivo', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, executives: ['Otro Ejecutivo'] };
    const result = applyFilters([mondayRecord], filters);
    expect(result).toHaveLength(0);
  });

  it('debería filtrar por dirección inbound', () => {
    const outboundRecord = createMockCallRecord({
      call_date: '2026-05-18',
      call_hour: 10,
      call_direction: 'outbound',
    });
    const filters: FilterState = { ...DEFAULT_FILTERS, direction: ['inbound'] };
    const result = applyFilters([mondayRecord, outboundRecord], filters);
    expect(result).toHaveLength(1);
    expect(result[0].call_direction).toBe('inbound');
  });

  it('debería filtrar por estado atendido', () => {
    const unattendedRecord = createMockCallRecord({
      call_date: '2026-05-18',
      call_hour: 10,
      queue: 'BiceHipotecaria - SAC',
      attended: false,
    });
    const filters: FilterState = { ...DEFAULT_FILTERS, attendedStatus: ['attended'] };
    const result = applyFilters([mondayRecord, unattendedRecord], filters);
    expect(result).toHaveLength(1);
    expect(result[0].attended).toBe(true);
  });

  it('debería saltarse el filtro de fechas con skipDateFilter=true', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      dateStart: '2026-05-19',
      dateEnd: '2026-05-25',
    };
    const result = applyFilters([mondayRecord], filters, true);
    expect(result).toHaveLength(1);
  });

  it('debería filtrar por tipo de abandono', () => {
    const queueAbandon = createMockCallRecord({
      call_date: '2026-05-18',
      call_hour: 10,
      queue: 'BiceHipotecaria - SAC',
      attended: false,
      abandon_type: 'queue',
    });
    const filters: FilterState = { ...DEFAULT_FILTERS, attendedStatus: [], abandonType: ['ivr'] };
    const result = applyFilters([mondayRecord, queueAbandon], filters);
    expect(result).toHaveLength(0);
  });

  it('debería manejar array vacío de registros', () => {
    const result = applyFilters([], DEFAULT_FILTERS);
    expect(result).toHaveLength(0);
  });
});
