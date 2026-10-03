'use client';

import React from 'react';

export interface InkChartPoint {
  label: string;
  value: number;
}

interface InkChartProps {
  data: InkChartPoint[];
  unit?: string;
  height?: number;
}

export default function InkChart({ data, unit = 'kg', height = 180 }: InkChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ height }}
        className="neo-box bg-paper flex flex-col items-center justify-center p-4 text-center border-dashed"
      >
        <span className="text-xs font-mono font-bold text-ink/60">
          BELUM CUKUP DATA GRAFIK
        </span>
        <p className="text-[11px] text-ink/50 mt-1">
          Catat berat badan minimal 2 minggu untuk melihat garis tren tinta.
        </p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.floor(Math.min(...values) - 1);
  const maxVal = Math.ceil(Math.max(...values) + 1);
  const range = maxVal - minVal || 1;

  const paddingLeft = 38;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const svgWidth = 320;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="neo-box bg-paper p-3 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono font-black text-ink/70 border-b-2 border-ink pb-1.5">
        <span>TREN BERAT BADAN (INK CHART)</span>
        <span>
          RENTANG: {minVal} - {maxVal} {unit}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full select-none text-ink"
          style={{ height, minWidth: 260 }}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const val = (maxVal - ratio * range).toFixed(1);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3.5}
                  fontSize="9"
                  textAnchor="end"
                  fill="currentColor"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill / screentone effect underneath */}
          <polygon
            points={`${points[0].x},${paddingTop + chartHeight} ${polylinePoints} ${points[points.length - 1].x},${paddingTop + chartHeight}`}
            fill="currentColor"
            fillOpacity="0.04"
          />

          {/* Manga Ink Polyline */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points (Dots) */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="var(--color-paper)"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="currentColor"
              />
              {/* Value label on dot */}
              <text
                x={p.x}
                y={p.y - 10}
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                fontWeight="900"
                fontFamily="monospace"
              >
                {p.value}
              </text>
              {/* X label */}
              <text
                x={p.x}
                y={height - 10}
                fontSize="9"
                textAnchor="middle"
                fill="currentColor"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
