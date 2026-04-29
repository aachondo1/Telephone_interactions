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
 * Metric descriptions with icons for quick reference
 */
const METRIC_DESCRIPTIONS: Record<string, { icon: string; shortDesc: string; type: 'efficacy' | 'availability' | 'productivity' }> = {
  holdRate: {
    icon: '📏',
    shortDesc: '% cliente en espera → Falta conocimiento',
    type: 'efficacy',
  },
  netAHT: {
    icon: '⏱️',
    shortDesc: 'Velocidad vs equipo → Lento/eficiente',
    type: 'efficacy',
  },
  fcr: {
    icon: '✅',
    shortDesc: 'Clientes resueltos 1ª vez → Calidad',
    type: 'efficacy',
  },
  bounceRate: {
    icon: '🔴',
    shortDesc: '% alertas ignoradas → Cherry-picking',
    type: 'availability',
  },
  avgAlertTime: {
    icon: '📞',
    shortDesc: 'Segundos respuesta → Enfoque',
    type: 'availability',
  },
  acwAdherence: {
    icon: '🔧',
    shortDesc: 'Consistencia wrap-up → Disciplina',
    type: 'availability',
  },
  erlangContribution: {
    icon: '📊',
    shortDesc: '% carga que lleva → Equitativo',
    type: 'productivity',
  },
  realOccupancy: {
    icon: '⚙️',
    shortDesc: '% jornada ocupado → Productividad',
    type: 'productivity',
  },
};

/**
 * Tooltip component for metric descriptions
 */
function MetricTooltip({ metricKey }: { metricKey: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const desc = METRIC_DESCRIPTIONS[metricKey];

  if (!desc) return null;

  return (
    <div className="relative inline-block">
      <button
        className="text-gray-400 hover:text-gray-600 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <span className="text-xs font-bold">ⓘ</span>
      </button>
      {showTooltip && (
        <div className="absolute z-50 w-48 p-2 text-xs text-white bg-gray-800 rounded-lg bottom-full left-0 mb-2 whitespace-normal">
          <div className="flex items-start gap-2">
            <span className="text-lg">{desc.icon}</span>
            <span>{desc.shortDesc}</span>
          </div>
          <div className="absolute bottom-0 left-4 w-2 h-2 bg-gray-800 transform rotate-45 translate-y-1"></div>
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
  const desc = METRIC_DESCRIPTIONS[metricKey];

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
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
