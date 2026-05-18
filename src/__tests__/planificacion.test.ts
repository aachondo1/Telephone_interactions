import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateHourlyDemand, clearDemandCache } from '../lib/kpi/planificacion';
import { createMockCallRecord } from './fixtures/sampleCallData';

vi.mock('../lib/kpi/agent-connectivity', () => ({
  getAgentCountsByHourAndDay: vi.fn().mockResolvedValue(new Map()),
  clearAgentCountCache: vi.fn(),
}));

import { getAgentCountsByHourAndDay } from '../lib/kpi/agent-connectivity';

beforeEach(() => {
  clearDemandCache();
  vi.mocked(getAgentCountsByHourAndDay).mockResolvedValue(new Map());
});

describe('calculateHourlyDemand', () => {
  it('debería retornar estructura vacía para array vacío', async () => {
    const result = await calculateHourlyDemand([]);

    expect(result.points).toEqual([]);
    expect(result.peakErlangs).toBe(0);
    expect(result.weekdayCounts).toEqual({ lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 });
  });

  it('debería retornar puntos vacíos cuando no hay llamadas atendidas', async () => {
    const records = [
      createMockCallRecord({ attended: false, call_date: '2026-05-18', call_hour: 9 }),
    ];

    const result = await calculateHourlyDemand(records);

    expect(result.peakErlangs).toBe(0);
    expect(result.points.every(p => p.lun === null)).toBe(true);
  });

  it('debería calcular Erlangs correctamente para una llamada en lunes', async () => {
    // 2026-05-18 es lunes; 1 lunes en el rango → dayCount = 1
    // handle_time = 360, duration = 300, max(360, 300+45)=360, alert=0 → AHT = 360s
    // erlangs = 360 / (3600 * 1) = 0.1
    const records = [
      createMockCallRecord({
        attended: true,
        call_date: '2026-05-18',
        call_hour: 9,
        handle_time_seconds: 360,
        duration_seconds: 300,
        alert_time_seconds: 0,
      }),
    ];

    const result = await calculateHourlyDemand(records);
    const point9 = result.points.find(p => p.hour === 9);

    expect(point9).toBeDefined();
    expect(point9!.lun).toBe(0.1);
    expect(result.peakErlangs).toBe(0.1);
  });

  it('debería acumular AHT de múltiples llamadas en la misma hora', async () => {
    // 2 llamadas atendidas el mismo lunes hora 9, cada una 360s → total 720s
    // erlangs = 720 / 3600 = 0.2
    const records = [
      createMockCallRecord({
        attended: true, call_date: '2026-05-18', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
      createMockCallRecord({
        attended: true, call_date: '2026-05-18', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
    ];

    const result = await calculateHourlyDemand(records);
    const point9 = result.points.find(p => p.hour === 9);

    expect(point9!.lun).toBe(0.2);
  });

  it('debería generar 11 puntos horarios (horas 8-18)', async () => {
    const records = [
      createMockCallRecord({
        attended: true, call_date: '2026-05-18', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
    ];

    const result = await calculateHourlyDemand(records);

    expect(result.points).toHaveLength(11);
    expect(result.points[0].hour).toBe(8);
    expect(result.points[10].hour).toBe(18);
  });

  it('debería cachear el resultado y no recalcular en la segunda llamada', async () => {
    const records = [
      createMockCallRecord({
        attended: true, call_date: '2026-05-18', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
    ];

    await calculateHourlyDemand(records);
    await calculateHourlyDemand(records);

    // getAgentCountsByHourAndDay sólo se llama una vez (segunda es cache hit)
    expect(getAgentCountsByHourAndDay).toHaveBeenCalledTimes(1);
  });

  it('clearDemandCache debería forzar recálculo en la siguiente llamada', async () => {
    const records = [
      createMockCallRecord({
        attended: true, call_date: '2026-05-18', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
    ];

    await calculateHourlyDemand(records);
    clearDemandCache();
    await calculateHourlyDemand(records);

    expect(getAgentCountsByHourAndDay).toHaveBeenCalledTimes(2);
  });

  it('debería ignorar registros de fin de semana', async () => {
    // 2026-05-16 sábado, 2026-05-17 domingo
    const records = [
      createMockCallRecord({
        attended: true, call_date: '2026-05-16', call_hour: 9,
        handle_time_seconds: 360, duration_seconds: 300, alert_time_seconds: 0,
      }),
    ];

    const result = await calculateHourlyDemand(records);

    expect(result.peakErlangs).toBe(0);
    expect(result.weekdayCounts).toEqual({ lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 });
  });
});
