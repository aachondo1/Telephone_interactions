import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAgentCountsByHourAndDay, clearAgentCountCache } from '../lib/kpi/agent-connectivity';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

let _mockRows: unknown[] = [];
let _mockError: { message: string } | null = null;

function buildChain() {
  const chain: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: _mockRows, error: _mockError }).then(res),
    catch: (rej: (e: unknown) => unknown) =>
      Promise.resolve({ data: _mockRows, error: _mockError }).catch(rej),
    select: vi.fn(function () { return chain; }),
    in:     vi.fn(function () { return chain; }),
    gte:    vi.fn(function () { return chain; }),
    lte:    vi.fn(function () { return chain; }),
  };
  return chain;
}

beforeEach(() => {
  clearAgentCountCache();
  _mockRows = [];
  _mockError = null;
  vi.clearAllMocks();
  vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);
});

describe('getAgentCountsByHourAndDay', () => {
  it('debería retornar mapa vacío cuando no hay datos', async () => {
    const result = await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });
    expect(result.size).toBe(0);
  });

  it('debería contar agentes únicos por día de semana y hora', async () => {
    // 2026-05-18 es lunes
    _mockRows = [
      { date: '2026-05-18', hour: 9, agent_id: 'a1', status: 'Disponible' },
      { date: '2026-05-18', hour: 9, agent_id: 'a2', status: 'En la cola' },
      { date: '2026-05-18', hour: 10, agent_id: 'a1', status: 'Disponible' },
    ];
    vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);

    const result = await getAgentCountsByHourAndDay({ start: '2026-05-18', end: '2026-05-18' });

    expect(result.get('lun|9')).toBe(2);
    expect(result.get('lun|10')).toBe(1);
  });

  it('debería asignar día correcto: martes, miércoles, jueves, viernes', async () => {
    // 2026-05-19 mar, 2026-05-20 mie, 2026-05-21 jue, 2026-05-22 vie
    _mockRows = [
      { date: '2026-05-19', hour: 8, agent_id: 'a1', status: 'Disponible' },
      { date: '2026-05-20', hour: 8, agent_id: 'a1', status: 'Disponible' },
      { date: '2026-05-21', hour: 8, agent_id: 'a1', status: 'Disponible' },
      { date: '2026-05-22', hour: 8, agent_id: 'a1', status: 'Disponible' },
    ];
    vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);

    const result = await getAgentCountsByHourAndDay({ start: '2026-05-19', end: '2026-05-22' });

    expect(result.get('mar|8')).toBe(1);
    expect(result.get('mie|8')).toBe(1);
    expect(result.get('jue|8')).toBe(1);
    expect(result.get('vie|8')).toBe(1);
  });

  it('debería ignorar fines de semana', async () => {
    // 2026-05-16 sábado, 2026-05-17 domingo
    _mockRows = [
      { date: '2026-05-16', hour: 9, agent_id: 'a1', status: 'Disponible' },
      { date: '2026-05-17', hour: 9, agent_id: 'a1', status: 'Disponible' },
    ];
    vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);

    const result = await getAgentCountsByHourAndDay({ start: '2026-05-16', end: '2026-05-17' });

    expect(result.size).toBe(0);
  });

  it('debería cachear el resultado y no llamar a Supabase en la segunda llamada', async () => {
    const fromSpy = vi.mocked(supabase.from);

    await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });
    await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });

    expect(fromSpy).toHaveBeenCalledTimes(1);
  });

  it('debería llamar a Supabase para keys distintos (no hay cache compartido)', async () => {
    const fromSpy = vi.mocked(supabase.from);

    await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-15' });
    await getAgentCountsByHourAndDay({ start: '2026-05-16', end: '2026-05-31' });

    expect(fromSpy).toHaveBeenCalledTimes(2);
  });

  it('clearAgentCountCache debería forzar una nueva consulta', async () => {
    const fromSpy = vi.mocked(supabase.from);

    await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });
    clearAgentCountCache();
    vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);
    await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });

    expect(fromSpy).toHaveBeenCalledTimes(2);
  });

  it('debería manejar errores de Supabase y retornar mapa vacío', async () => {
    _mockError = { message: 'Network error' };
    vi.mocked(supabase.from).mockReturnValue(buildChain() as ReturnType<typeof supabase.from>);

    const result = await getAgentCountsByHourAndDay({ start: '2026-05-01', end: '2026-05-31' });

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('debería funcionar con dateRange null (sin filtro de fechas)', async () => {
    const result = await getAgentCountsByHourAndDay(null);
    expect(result).toBeInstanceOf(Map);
  });
});
