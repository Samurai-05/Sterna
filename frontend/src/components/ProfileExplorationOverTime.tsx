import { Area, AreaChart, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { ProfileExplorationMonth } from '@/lib/profile-analytics'

const chartConfig = {
  count: {
    label: 'Discoveries',
    color: '#2D5A3D',
  },
} satisfies ChartConfig

export function ProfileExplorationOverTime({
  months,
}: {
  months: ProfileExplorationMonth[]
}) {
  return (
    <section aria-labelledby="exploration-over-time-heading">
      <h2 id="exploration-over-time-heading" className="sterna-section-title">
        Exploration over time
      </h2>
      <ChartContainer
        config={chartConfig}
        className="mt-4 h-44 min-h-0 w-full aspect-auto"
        aria-label="Discoveries by month"
      >
        <AreaChart
          accessibilityLayer
          data={months}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient
              id="profile-exploration-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-count)"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="var(--color-count)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval={0}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ stroke: '#E7E5E0', strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) => value}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
            strokeWidth={2.5}
            fill="url(#profile-exploration-area)"
            activeDot={{ r: 5, fill: 'var(--color-count)' }}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  )
}
