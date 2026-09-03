import type { ProfileExplorationMonth } from '@/lib/profile-analytics'

const CHART = { left: 28, right: 304, top: 16, bottom: 118 }

export function ProfileExplorationOverTime({
  months,
}: {
  months: ProfileExplorationMonth[]
}) {
  const maximum = Math.max(...months.map((month) => month.count), 1)
  const points = months.map((month, index) => ({
    ...month,
    x:
      CHART.left +
      (index * (CHART.right - CHART.left)) / Math.max(months.length - 1, 1),
    y: CHART.bottom - (month.count / maximum) * (CHART.bottom - CHART.top),
  }))
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ')
  const hasActivity = months.some((month) => month.count > 0)

  return (
    <section aria-labelledby="exploration-over-time-heading">
      <h2 id="exploration-over-time-heading" className="sterna-section-title">
        Exploration over time
      </h2>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        {hasActivity ? (
          <svg
            viewBox="0 0 320 156"
            role="img"
            aria-label={`Discoveries by month: ${months
              .map((month) => `${month.label}: ${month.count}`)
              .join(', ')}`}
            className="h-auto w-full overflow-visible"
          >
            <line
              x1={CHART.left}
              x2={CHART.right}
              y1={CHART.top}
              y2={CHART.top}
              className="stroke-border/60"
              strokeDasharray="4 5"
            />
            <line
              x1={CHART.left}
              x2={CHART.right}
              y1={CHART.bottom}
              y2={CHART.bottom}
              className="stroke-border"
            />
            <polygon
              points={`${CHART.left},${CHART.bottom} ${pointString} ${CHART.right},${CHART.bottom}`}
              fill="#2D5A3D"
              fillOpacity="0.1"
            />
            <polyline
              points={pointString}
              fill="none"
              stroke="#2D5A3D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point) => (
              <g key={point.key}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#2D5A3D"
                  strokeWidth="2.5"
                />
                <text
                  x={point.x}
                  y={Math.max(point.y - 9, 9)}
                  textAnchor="middle"
                  className="fill-foreground text-[9px] font-semibold tabular-nums"
                >
                  {point.count}
                </text>
                <text
                  x={point.x}
                  y="143"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px] font-medium"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <p className="text-sm text-muted-foreground">
            No discoveries recorded in the last 6 months.
          </p>
        )}
      </div>
    </section>
  )
}
