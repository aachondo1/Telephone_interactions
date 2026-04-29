import React from 'react';
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
 * Individual metric display with traffic light
 */
function MetricCard({
  label,
  value,
  interpretation,
  trafficLight,
}: {
  label: string;
  value: string;
  interpretation: string;
  trafficLight: TrafficLight;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: TRAFFIC_LIGHT_COLORS[trafficLight],
            boxShadow: `0 0 8px ${TRAFFIC_LIGHT_COLORS[trafficLight]}`,
          }}
        />
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
        />
        <MetricCard
          label="AHT Neto (vs Promedio)"
          value={scorecard.efficacy.netAHT.formatted}
          interpretation={scorecard.efficacy.netAHT.interpretation}
          trafficLight={scorecard.efficacy.netAHT.trafficLight}
        />
        <MetricCard
          label="FCR Estimado"
          value={scorecard.efficacy.fcr.formatted}
          interpretation={scorecard.efficacy.fcr.interpretation}
          trafficLight={scorecard.efficacy.fcr.trafficLight}
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
        />
        <MetricCard
          label="Tiempo de Timbrado"
          value={scorecard.availability.avgAlertTime.formatted}
          interpretation={scorecard.availability.avgAlertTime.interpretation}
          trafficLight={scorecard.availability.avgAlertTime.trafficLight}
        />
        <MetricCard
          label="Adherencia ACW"
          value={scorecard.availability.acwAdherence.formatted}
          interpretation={scorecard.availability.acwAdherence.interpretation}
          trafficLight={scorecard.availability.acwAdherence.trafficLight}
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
        />
        <MetricCard
          label="Ocupación Real"
          value={scorecard.productivity.realOccupancy.formatted}
          interpretation={scorecard.productivity.realOccupancy.interpretation}
          trafficLight={scorecard.productivity.realOccupancy.trafficLight}
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
          <div
            key={scorecard.executive}
            className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow"
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
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border rounded-lg p-4 mt-6">
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
    </div>
  );
}
