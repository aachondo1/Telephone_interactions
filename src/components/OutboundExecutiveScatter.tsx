import { useState } from 'react';
import type { ExecutiveScatterData } from '../lib/kpi';

type Props = {
  data: ExecutiveScatterData;
};

const QUEUE_COLORS: Record<string, string> = {
  'Mora Ordinaria': '#003a70',
  'Cobranza Judicial': '#00abc8',
  'Sin cola': '#9ca3af',
};

function getQueueColor(queue: string): string {
  return QUEUE_COLORS[queue] || '#6b7280';
}

export function OutboundExecutiveScatter({ data }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  if (data.points.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-500 text-center py-12">
          No hay datos de ejecutivos en salientes
        </p>
      </div>
    );
  }

  const padding = 60;
  const width = 800;
  const height = 500;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const scaleX = (attempts: number) =>
    padding + (attempts / data.maxAttempts) * graphWidth;
  const scaleY = (conversation: number) =>
    height -
    padding -
    (conversation / Math.max(data.maxConversation, 1)) * graphHeight;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Productividad Ejecutivo (Salientes)
        </h3>
        <p className="text-xs text-slate-600">
          Eje X: Intentos salientes | Eje Y: Minutos conversación efectiva | Tamaño: Contactos válidos
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="mx-auto border border-slate-100 rounded bg-slate-50">
          {/* Grid background */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect x={padding} y={0} width={graphWidth} height={height} fill="url(#grid)" />

          {/* Axes */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#6b7280"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#6b7280"
            strokeWidth="2"
          />

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const x = padding + ratio * graphWidth;
            const value = Math.round(ratio * data.maxAttempts);
            return (
              <g key={`x-${ratio}`}>
                <line
                  x1={x}
                  y1={height - padding + 5}
                  x2={x}
                  y2={height - padding - 5}
                  stroke="#6b7280"
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-slate-600"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - padding - ratio * graphHeight;
            const value = Math.round(ratio * data.maxConversation / 60);
            return (
              <g key={`y-${ratio}`}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding + 5}
                  y2={y}
                  stroke="#6b7280"
                />
                <text
                  x={padding - 15}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-slate-600"
                >
                  {value}m
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-700"
          >
            Intentos Salientes
          </text>
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-700"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Minutos Conversación
          </text>

          {/* Data points */}
          {data.points.map((point, idx) => {
            const x = scaleX(point.attempts);
            const y = scaleY(point.validConversationSeconds);
            const isHovered = hoveredPoint === `${point.executive}-${point.queue}`;

            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r={point.radius * (isHovered ? 1.3 : 1)}
                  fill={getQueueColor(point.queue)}
                  opacity={0.7}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    stroke: isHovered ? '#000' : 'none',
                    strokeWidth: isHovered ? 2 : 0,
                  }}
                  onMouseEnter={() =>
                    setHoveredPoint(`${point.executive}-${point.queue}`)
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* Hovered point label */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 70}
                      y={y - 70}
                      width={140}
                      height={60}
                      fill="white"
                      stroke="#6b7280"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={x}
                      y={y - 50}
                      textAnchor="middle"
                      className="text-xs font-bold fill-slate-900"
                    >
                      {point.executive}
                    </text>
                    <text
                      x={x}
                      y={y - 35}
                      textAnchor="middle"
                      className="text-[11px] fill-slate-600"
                    >
                      {point.queue}
                    </text>
                    <text
                      x={x}
                      y={y - 18}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500"
                    >
                      {point.attempts} intentos
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {Object.entries(QUEUE_COLORS).map(([queue, color]) => (
          <div key={queue} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-slate-600">{queue}</span>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
        <strong>Lectura:</strong> Los puntos en <strong>esquina superior derecha</strong> (muchos
        intentos + mucha conversación) son "Cerradores Efectivos". Los en{' '}
        <strong>esquina inferior derecha</strong> (muchos intentos + poca conversación) son
        "Marcadores Compulsivos".
      </div>
    </div>
  );
}
