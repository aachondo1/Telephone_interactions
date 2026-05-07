import type { CallRecord } from '../supabase';

/**
 * Identifica la cohorte de "Infractores Crónicos": agentes que fueron alertados
 * en llamadas inbound pero NO las respondieron, con 50+ incidencias perdidas en
 * los últimos 30 días.
 *
 * @param allRecords - Todos los registros de llamadas (sin filtrar)
 * @returns Array de nombres de agentes con >= 50 alarmas perdidas
 */
export function identifyChronicOffenders(allRecords: CallRecord[]): string[] {
  if (!allRecords.length) return [];

  // Obtener rango de 30 días desde fecha máxima
  const callDates = allRecords
    .map(r => r.call_date)
    .filter(Boolean) as string[];
  if (!callDates.length) return [];

  const maxDate = callDates.reduce((a, b) => (a > b ? a : b));
  const cutoff30d = new Date(new Date(maxDate + 'T12:00:00').getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Filtrar a inbound en últimos 30 días
  const inbound30d = allRecords.filter(
    r =>
      r.call_date &&
      r.call_date >= cutoff30d &&
      ['inbound', 'entrante'].includes((r.call_direction || '').toLowerCase())
  );

  // Contar alarmas perdidas por agente
  const lostAlarmCount = new Map<string, number>();

  for (const record of inbound30d) {
    if (!record.alerted_users) continue;

    // Parsear alerted_users (puede ser "name1; name2" o "name1, name2")
    const alertedList = record.alerted_users
      .split(/[,;]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    // Executive es quien respondió (si es que alguien respondió)
    const respondent = record.attended && record.executive ? record.executive.trim() : '';

    // Contar alarmas perdidas: alerta pero no respondida
    for (const agent of alertedList) {
      const agentNorm = agent.toLowerCase().trim();
      const respondentNorm = respondent.toLowerCase().trim();

      if (agentNorm && agentNorm !== respondentNorm) {
        lostAlarmCount.set(agentNorm, (lostAlarmCount.get(agentNorm) || 0) + 1);
      }
    }
  }

  // Retornar agentes con >= 50 alarmas perdidas
  return Array.from(lostAlarmCount.entries())
    .filter(([, count]) => count >= 50)
    .map(([name]) => name);
}
