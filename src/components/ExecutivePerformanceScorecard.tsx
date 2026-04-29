import React, { useState } from 'react';
import {
  TrafficLight,
  ExecutiveScorecard,
  generateExecutiveScorecard,
  generateTeamPerformanceReport,
} from '../lib/individual-performance';
import type { CallRecord } from '../lib/supabase';

/**
 * Color map for traffic lights
 */
const TRAFFIC_LIGHT_COLORS: Record<TrafficLight, string> = {
  [TrafficLight.GREEN]: '#10b981',
  [TrafficLight.YELLOW]: '#f59e0b',
  [TrafficLight.RED]: '#ef4444',
};

const TRAFFIC_LIGHT_BG: Record<TrafficLight, string> = {
  [TrafficLight.GREEN]: '#d1fae5',
  [TrafficLight.YELLOW]: '#fef3c7',
  [TrafficLight.RED]: '#fee2e2',
};

/**
 * Comprehensive metric descriptions with extended information
 */
const METRIC_DESCRIPTIONS: Record<string, {
  icon: string;
  shortDesc: string;
  type: 'efficacy' | 'availability' | 'productivity';
  fullName: string;
  whatMeasures: string;
  greenRange: string;
  yellowRange: string;
  redRange: string;
  example: string;
  impact: string;
  diagnostic: string;
}> = {
  holdRate: {
    icon: '📏',
    shortDesc: '% cliente en espera → Falta conocimiento',
    type: 'efficacy',
    fullName: 'Tasa de Hold (Hold Rate)',
    whatMeasures: 'Porcentaje de llamadas donde el ejecutivo puso al cliente en espera',
    greenRange: '🟢 ≤ 20%: Excelente conocimiento, responde sin consultar',
    yellowRange: '🟡 20-35%: Consulta ocasionalmente, es normal',
    redRange: '🔴 > 35%: No conoce las respuestas, necesita capacitación',
    example: 'Juan: 12% → Sabe responder. María: 45% → Pone clientes en espera constantemente',
    impact: 'Cliente en espera = cliente molesto. Alto hold degrada CSAT (satisfacción)',
    diagnostic: '¿Cuáles son los 3 temas que más consulta? ¿Necesita capacitación específica?',
  },
  netAHT: {
    icon: '⏱️',
    shortDesc: 'Velocidad vs equipo → Lento/eficiente',
    type: 'efficacy',
    fullName: 'AHT Neto (Net After-Handle Time)',
    whatMeasures: 'Tiempo de manejo (handle_time - 45s ACW) comparado con el promedio del equipo',
    greenRange: '🟢 -10% a +15%: Dentro del rango normal, eficiente',
    yellowRange: '🟡 +15% a +25%: Un poco más lento que el promedio',
    redRange: '🔴 > +25%: Muy lento, revisar si es complejidad o ineficiencia',
    example: 'Equipo: 5min AHT. Carlos: 6:30min (30% más lento) → Necesita coaching en agilidad',
    impact: 'Más lento = menos llamadas atendidas / más costo operativo',
    diagnostic: '¿Las llamadas son genuinamente complejas? ¿O está siendo ineficiente?',
  },
  fcr: {
    icon: '✅',
    shortDesc: 'Clientes resueltos 1ª vez → Calidad',
    type: 'efficacy',
    fullName: 'First Contact Resolution (FCR) Estimado',
    whatMeasures: '% de clientes únicos que NO vuelven a llamar en 24h después de hablar con este ejecutivo',
    greenRange: '🟢 ≥ 92%: Resuelve muy bien, clientes satisfechos',
    yellowRange: '🟡 85-92%: Buena resolución, aceptable',
    redRange: '🔴 < 85%: Muchos clientes vuelven a llamar',
    example: 'Roberto: 95% FCR → 95 de 100 clientes no vuelven. Laura: 82% FCR → 18 clientes que vuelven',
    impact: 'Bajo FCR = trabajo duplicado, cliente frustrado, costo adicional',
    diagnostic: '¿Las llamadas que resuelve son más simples? ¿Hay patrón de qué temas vuelven?',
  },
  bounceRate: {
    icon: '🔴',
    shortDesc: '% alertas ignoradas → Cherry-picking',
    type: 'availability',
    fullName: 'Individual Bounce Rate ⭐ LA MÁS IMPORTANTE',
    whatMeasures: '% de llamadas donde fue PRIMER ejecutivo alertado pero NO la atendió (otro la respondió)',
    greenRange: '🟢 ≤ 5%: Excelente disponibilidad, muy enfocado',
    yellowRange: '🟡 5-12%: Aceptable, pequeñas distracciones',
    redRange: '🔴 > 12%: Deja pasar llamadas frecuentemente (cherry-picking)',
    example: 'Diego: 5% bounce (responde 95/100 alertas) 🟢. Pepe: 20% bounce (responde 80/100) 🔴 Está ignorando',
    impact: 'Alto bounce = no está disponible / no está enfocado / cherry-picking',
    diagnostic: '¿Está en el escritorio cuando suena? ¿Elige ignorar las complejas? ¿Problemas técnicos?',
  },
  avgAlertTime: {
    icon: '📞',
    shortDesc: 'Segundos respuesta → Enfoque',
    type: 'availability',
    fullName: 'Tiempo de Timbrado Promedio (Alert Time)',
    whatMeasures: 'Promedio de segundos desde que suena la alerta hasta que el ejecutivo responde',
    greenRange: '🟢 ≤ 3s: Responde muy rápido, excelente',
    yellowRange: '🟡 3-6s: Normal, aceptable',
    redRange: '🔴 > 6s: Lento para responder, degrada SLA',
    example: 'Cristina: 2s respuesta 🟢 (muy rápida). Felipe: 8s respuesta 🔴 (muy lento, cliente molesto)',
    impact: 'Cada segundo cuenta en experiencia del cliente. Alto degrada SLA (acuerdo de nivel de servicio)',
    diagnostic: '¿Está enfocado cuando suena la alerta? ¿Problemas con headset/sistema?',
  },
  acwAdherence: {
    icon: '🔧',
    shortDesc: 'Consistencia wrap-up → Disciplina',
    type: 'availability',
    fullName: 'Factor de Adherencia ACW',
    whatMeasures: 'Qué tan consistente es el After-Call Work (wrap-up). Esperado: 45 segundos fijos',
    greenRange: '🟢 ≥ 90%: ACW muy consistente, disciplinado',
    yellowRange: '🟡 80-90%: Variación aceptable',
    redRange: '🔴 < 80%: Mucha variación, uso inconsistente',
    example: 'Gabriela: ACW variable (40s, 60s, 55s) 🔴. Roberto: ACW consistente (45s±3s) 🟢',
    impact: 'Bajo = falta de proceso / inconsistencia / ejecutivo no sigue procedimientos',
    diagnostic: '¿Está guardando notas en el sistema? ¿A veces olvida el wrap-up?',
  },
  erlangContribution: {
    icon: '📊',
    shortDesc: '% carga que lleva → Equitativo',
    type: 'productivity',
    fullName: 'Contribución al Erlang',
    whatMeasures: '% de la duración total de la cola que este ejecutivo maneja (equilibrio de carga)',
    greenRange: '🟢 ≈ Promedio: Carga equilibrada, equitativo',
    yellowRange: '🟡 ±5% del promedio: Pequeña variación, normal',
    redRange: '🔴 < promedio-15%: Baja carga, revisar disponibilidad',
    example: 'Cola 10 personas → promedio 10% cada uno. Julio: 9.5% 🟡. Arturo: 4% 🔴 (muy bajo)',
    impact: 'Bajo = posible inactividad / problemas de disponibilidad. No es indicador de calidad por sí solo',
    diagnostic: '¿Está disponible? ¿Por qué baja carga? Revisar junto con bounce rate',
  },
  realOccupancy: {
    icon: '⚙️',
    shortDesc: '% jornada ocupado → Productividad',
    type: 'productivity',
    fullName: 'Ocupación Real Individual',
    whatMeasures: '% de su jornada de 38 horas/semana que estuvo realmente ocupado con llamadas',
    greenRange: '🟢 ≥ 80%: Muy productivo, casi toda la jornada en llamadas',
    yellowRange: '🟡 60-80%: Normal, aceptable, hay tiempo para pausa',
    redRange: '🔴 < 60%: Mucho tiempo libre/ocioso, revisar si está en sistema',
    example: 'Roxana: 88% ocupada (1800min handle + 200min alert) 🟢. Ícaro: 31% ocupado 🔴',
    impact: 'Bajo = posible inactividad / problemas técnicos / no está realmente trabajando',
    diagnostic: '¿Está realmente conectado? ¿Problemas de sistema? ¿Tiempo de descanso excesivo?',
  },
};

/**
 * Detailed tooltip component for metric descriptions
 */
function MetricTooltip({ metricKey, triggerElement = 'icon' }: { metricKey: string; triggerElement?: 'icon' | 'label' | 'both' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const desc = METRIC_DESCRIPTIONS[metricKey];

  if (!desc) return null;

  const getTrafficLightColor = (range: string): string => {
    if (range.includes('🟢')) return '#d1fae5';
    if (range.includes('🟡')) return '#fef3c7';
    if (range.includes('🔴')) return '#fee2e2';
    return '#f3f4f6';
  };

  return (
    <div className="relative inline-block">
      <button
        className="text-gray-400 hover:text-gray-600 cursor-help transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <span className="text-xs font-bold">ⓘ</span>
      </button>
      {showTooltip && (
        <div className="absolute z-50 w-96 p-4 bg-white rounded-lg border border-gray-300 shadow-xl bottom-full right-0 mb-2 text-gray-900">
          {/* Header */}
          <div className="mb-4 border-b border-gray-200 pb-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{desc.icon}</span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900">{desc.fullName}</h4>
                <p className="text-xs text-gray-600 mt-1 italic">{desc.shortDesc}</p>
              </div>
            </div>
          </div>

          {/* What it measures */}
          <div className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{desc.whatMeasures}</p>
          </div>

          {/* Thresholds */}
          <div className="space-y-2 mb-4">
            <div className="p-2 rounded border-l-4 border-green-500" style={{ backgroundColor: getTrafficLightColor(desc.greenRange) }}>
              <p className="text-sm font-medium text-green-900">{desc.greenRange}</p>
            </div>
            <div className="p-2 rounded border-l-4 border-yellow-500" style={{ backgroundColor: getTrafficLightColor(desc.yellowRange) }}>
              <p className="text-sm font-medium text-yellow-900">{desc.yellowRange}</p>
            </div>
            <div className="p-2 rounded border-l-4 border-red-500" style={{ backgroundColor: getTrafficLightColor(desc.redRange) }}>
              <p className="text-sm font-medium text-red-900">{desc.redRange}</p>
            </div>
          </div>

          {/* Example */}
          <div className="mb-4 bg-gray-50 p-3 rounded">
            <p className="text-xs font-semibold text-gray-700 mb-1">Ejemplo Real:</p>
            <p className="text-xs text-gray-600 italic">{desc.example}</p>
          </div>

          {/* Impact */}
          <div className="mb-4 bg-orange-50 p-3 rounded border-l-4 border-orange-400">
            <p className="text-xs font-semibold text-orange-900 mb-1">⚡ Por qué importa:</p>
            <p className="text-xs text-orange-800">{desc.impact}</p>
          </div>

          {/* Diagnostic */}
          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
            <p className="text-xs font-semibold text-blue-900 mb-1">❓ Si está bajo/mal:</p>
            <p className="text-xs text-blue-800">{desc.diagnostic}</p>
          </div>

          {/* Arrow pointer */}
          <div className="absolute top-0 right-4 w-3 h-3 bg-white rounded-sm transform rotate-45 -translate-y-1.5 border-t border-l border-gray-300"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual metric display with traffic light and description
 */
function MetricCard({
  label,
  value,
  interpretation,
  trafficLight,
  metricKey,
}: {
  label: string;
  value: string;
  interpretation: string;
  trafficLight: TrafficLight;
  metricKey: string;
}) {
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const desc = METRIC_DESCRIPTIONS[metricKey];

  return (
    <div
      className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow relative"
      onMouseEnter={() => setShowHoverTooltip(true)}
      onMouseLeave={() => setShowHoverTooltip(false)}
    >
      {/* Quick hover tooltip */}
      {showHoverTooltip && desc && (
        <div className="absolute -top-16 left-0 right-0 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap text-center z-40">
          Pasa el ratón o haz clic en ⓘ para detalles
          <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-gray-900 transform -translate-x-1/2 rotate-45"></div>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 cursor-help">
          {desc && <span className="text-lg">{desc.icon}</span>}
          <div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {desc && (
              <p className="text-xs text-gray-500 mt-0.5">{desc.shortDesc}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="w-4 h-4 rounded-full"
            style={{
              backgroundColor: TRAFFIC_LIGHT_COLORS[trafficLight],
              boxShadow: `0 0 8px ${TRAFFIC_LIGHT_COLORS[trafficLight]}`,
            }}
          />
          <MetricTooltip metricKey={metricKey} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <p className="text-xs text-gray-600 italic">{interpretation}</p>
    </div>
  );
}

/**
 * Section scorecard with traffic light
 */
function SectionCard({
  title,
  score,
  children,
}: {
  title: string;
  score: number;
  children: React.ReactNode;
}) {
  let trafficLight: TrafficLight;
  if (score >= 85) trafficLight = TrafficLight.GREEN;
  else if (score >= 70) trafficLight = TrafficLight.YELLOW;
  else trafficLight = TrafficLight.RED;

  return (
    <div className="border-2 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full"
            style={{
              backgroundColor: TRAFFIC_LIGHT_COLORS[trafficLight],
              boxShadow: `0 0 12px ${TRAFFIC_LIGHT_COLORS[trafficLight]}`,
            }}
          />
          <span className="text-2xl font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

/**
 * Executive Performance Scorecard Component
 */
export function ExecutivePerformanceScorecardComponent({
  records,
  executive,
  queue,
}: {
  records: CallRecord[];
  executive: string;
  queue?: string;
}) {
  const scorecard = generateExecutiveScorecard(records, executive, queue);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {scorecard.executive}
            </h1>
            <p className="text-sm text-gray-600">
              Período: {scorecard.period.start} a {scorecard.period.end} ({scorecard.period.dayCount} días)
            </p>
          </div>
          <div
            className="rounded-full w-24 h-24 flex items-center justify-center"
            style={{
              backgroundColor: TRAFFIC_LIGHT_BG[scorecard.overallPerformance.trafficLight],
              border: `3px solid ${TRAFFIC_LIGHT_COLORS[scorecard.overallPerformance.trafficLight]}`,
            }}
          >
            <span className="text-4xl font-bold text-gray-900">
              {scorecard.overallPerformance.score}
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4">
          {scorecard.overallPerformance.recommendation}
        </p>

        {scorecard.overallPerformance.coachingAreas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">
              Áreas para Coaching:
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {scorecard.overallPerformance.coachingAreas.map((area, idx) => (
                <li key={idx} className="text-sm text-red-800">
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 border rounded-lg p-4">
        <div>
          <p className="text-sm text-gray-600">Llamadas Atendidas</p>
          <p className="text-2xl font-bold text-gray-900">
            {scorecard.rawMetrics.totalAttendedCalls}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Duración Promedio</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(scorecard.rawMetrics.avgDurationSeconds / 60)}:{String(scorecard.rawMetrics.avgDurationSeconds % 60).padStart(2, '0')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Manejo Promedio</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(scorecard.rawMetrics.avgHandleTimeSeconds / 60)}:{String(scorecard.rawMetrics.avgHandleTimeSeconds % 60).padStart(2, '0')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Rebotes</p>
          <p className="text-2xl font-bold text-gray-900">
            {scorecard.rawMetrics.totalBounces}
          </p>
        </div>
      </div>

      {/* Efficacy Section */}
      <SectionCard title="📊 Eficacia (Calidad Técnica)" score={scorecard.efficacy.overallScore}>
        <MetricCard
          label="Tasa de Hold"
          value={scorecard.efficacy.holdRate.formatted}
          interpretation={scorecard.efficacy.holdRate.interpretation}
          trafficLight={scorecard.efficacy.holdRate.trafficLight}
          metricKey="holdRate"
        />
        <MetricCard
          label="AHT Neto (vs Promedio)"
          value={scorecard.efficacy.netAHT.formatted}
          interpretation={scorecard.efficacy.netAHT.interpretation}
          trafficLight={scorecard.efficacy.netAHT.trafficLight}
          metricKey="netAHT"
        />
        <MetricCard
          label="FCR Estimado"
          value={scorecard.efficacy.fcr.formatted}
          interpretation={scorecard.efficacy.fcr.interpretation}
          trafficLight={scorecard.efficacy.fcr.trafficLight}
          metricKey="fcr"
        />
      </SectionCard>

      {/* Availability Section */}
      <SectionCard
        title="⏰ Disponibilidad & Disciplina"
        score={scorecard.availability.overallScore}
      >
        <MetricCard
          label="Tasa de Rebote Individual"
          value={scorecard.availability.bounceRate.formatted}
          interpretation={scorecard.availability.bounceRate.interpretation}
          trafficLight={scorecard.availability.bounceRate.trafficLight}
          metricKey="bounceRate"
        />
        <MetricCard
          label="Tiempo de Timbrado"
          value={scorecard.availability.avgAlertTime.formatted}
          interpretation={scorecard.availability.avgAlertTime.interpretation}
          trafficLight={scorecard.availability.avgAlertTime.trafficLight}
          metricKey="avgAlertTime"
        />
        <MetricCard
          label="Adherencia ACW"
          value={scorecard.availability.acwAdherence.formatted}
          interpretation={scorecard.availability.acwAdherence.interpretation}
          trafficLight={scorecard.availability.acwAdherence.trafficLight}
          metricKey="acwAdherence"
        />
      </SectionCard>

      {/* Productivity Section */}
      <SectionCard
        title="🚀 Productividad (Aporte al Equipo)"
        score={scorecard.productivity.overallScore}
      >
        <MetricCard
          label="Contribución Erlang"
          value={scorecard.productivity.erlangContribution.formatted}
          interpretation={scorecard.productivity.erlangContribution.interpretation}
          trafficLight={scorecard.productivity.erlangContribution.trafficLight}
          metricKey="erlangContribution"
        />
        <MetricCard
          label="Ocupación Real"
          value={scorecard.productivity.realOccupancy.formatted}
          interpretation={scorecard.productivity.realOccupancy.interpretation}
          trafficLight={scorecard.productivity.realOccupancy.trafficLight}
          metricKey="realOccupancy"
        />
        <div /> {/* Empty cell for alignment */}
      </SectionCard>
    </div>
  );
}

/**
 * Team Performance Report Component - Shows all executives ranked
 */
export function TeamPerformanceReportComponent({
  records,
  queue,
}: {
  records: CallRecord[];
  queue?: string;
}) {
  const scorecards = generateTeamPerformanceReport(records, queue, 5);

  if (scorecards.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        No hay ejecutivos con suficientes llamadas para análisis.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Ranking de Performance - Equipo
        {queue && ` (${queue})`}
      </h2>

      <div className="space-y-3">
        {scorecards.map((scorecard, idx) => (
          <div key={scorecard.executive}>
            <div
              className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow cursor-pointer"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor:
                  TRAFFIC_LIGHT_COLORS[scorecard.overallPerformance.trafficLight],
              }}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Rank */}
                <div className="col-span-1 text-center">
                  <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                </div>

                {/* Name */}
                <div className="col-span-3">
                  <p className="font-semibold text-gray-900">
                    {scorecard.executive}
                  </p>
                  <p className="text-xs text-gray-600">
                    {scorecard.rawMetrics.totalAttendedCalls} llamadas
                  </p>
                </div>

                {/* Overall Score */}
                <div className="col-span-2 text-center">
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full"
                    style={{
                      backgroundColor: TRAFFIC_LIGHT_BG[scorecard.overallPerformance.trafficLight],
                      borderWidth: '2px',
                      borderColor:
                        TRAFFIC_LIGHT_COLORS[scorecard.overallPerformance.trafficLight],
                    }}
                  >
                    <span className="font-bold text-gray-900">
                      {scorecard.overallPerformance.score}
                    </span>
                  </div>
                </div>

                {/* Efficacy Score */}
                <div className="col-span-2 text-center">
                  <p className="text-xs text-gray-600 mb-1">Eficacia</p>
                  <p className="font-semibold text-gray-900">
                    {scorecard.efficacy.overallScore}
                  </p>
                </div>

                {/* Availability Score */}
                <div className="col-span-2 text-center">
                  <p className="text-xs text-gray-600 mb-1">Disponibilidad</p>
                  <p className="font-semibold text-gray-900">
                    {scorecard.availability.overallScore}
                  </p>
                </div>

                {/* Productivity Score */}
                <div className="col-span-2 text-center">
                  <p className="text-xs text-gray-600 mb-1">Productividad</p>
                  <p className="font-semibold text-gray-900">
                    {scorecard.productivity.overallScore}
                  </p>
                </div>
              </div>

              {/* Coaching areas if any */}
              {scorecard.overallPerformance.coachingAreas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-orange-700 font-medium">
                    ⚠️ {scorecard.overallPerformance.coachingAreas[0]}
                  </p>
                </div>
              )}
            </div>

            {/* Quick metric summary */}
            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
              <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                <span className="text-base">📏</span>
                <p className="font-semibold">{scorecard.efficacy.holdRate.formatted}</p>
                <p className="text-gray-600">Hold</p>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                <span className="text-base">🔴</span>
                <p className="font-semibold">{scorecard.availability.bounceRate.formatted}</p>
                <p className="text-gray-600">Bounce</p>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                <span className="text-base">✅</span>
                <p className="font-semibold">{scorecard.efficacy.fcr.formatted}</p>
                <p className="text-gray-600">FCR</p>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                <span className="text-base">📞</span>
                <p className="font-semibold">{scorecard.availability.avgAlertTime.formatted}</p>
                <p className="text-gray-600">Alert</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border rounded-lg p-6 mt-6 space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Interpretación de Semáforos:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-2 items-start">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: TRAFFIC_LIGHT_COLORS[TrafficLight.GREEN] }}
              />
              <div>
                <p className="font-semibold text-green-900">Verde (≥85)</p>
                <p className="text-xs text-green-700">Cumple/supera expectativas</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: TRAFFIC_LIGHT_COLORS[TrafficLight.YELLOW] }}
              />
              <div>
                <p className="font-semibold text-yellow-900">Amarillo (70-84)</p>
                <p className="text-xs text-yellow-700">Necesita mejora</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: TRAFFIC_LIGHT_COLORS[TrafficLight.RED] }}
              />
              <div>
                <p className="font-semibold text-red-900">Rojo (&lt;70)</p>
                <p className="text-xs text-red-700">Requiere coaching urgente</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Métricas Clave (Iconos):</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(METRIC_DESCRIPTIONS).map(([key, { icon, shortDesc }]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <span className="text-gray-700">{shortDesc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
