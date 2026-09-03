import { CategoryIcon } from '@/components/CategoryIcon'
import { categoryAppearance } from '@/lib/category-appearance'
import {
  profileCategoryRows,
  type ProfileCategoryRow,
} from '@/lib/profile-analytics'
import type { Discovery, DiscoveryCategory } from '@/lib/mock-data'

export function ProfileCategoryBreakdown({
  discoveries,
}: {
  discoveries: Discovery[]
}) {
  const rows = profileCategoryRows(discoveries)
  const maximumCount = Math.max(...rows.map((row) => row.count))

  if (!rows.length) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No discoveries to categorize yet.
      </p>
    )
  }

  return (
    <div
      role="list"
      aria-label="Discovery distribution by category"
      className="mt-4 space-y-4"
    >
      {rows.map((row) => (
        <CategoryRow key={row.id} row={row} maximumCount={maximumCount} />
      ))}
    </div>
  )
}

function CategoryRow({
  row,
  maximumCount,
}: {
  row: ProfileCategoryRow
  maximumCount: number
}) {
  const appearance = categoryAppearance[row.id]
  const discoveryLabel = row.count === 1 ? 'discovery' : 'discoveries'
  const ratio = maximumCount ? (row.count / maximumCount) * 100 : 0

  return (
    <div
      role="listitem"
      aria-label={`${row.label}: ${row.count} ${discoveryLabel}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${appearance.background}`}
        >
          <CategoryIcon
            category={row.id as DiscoveryCategory}
            className={`size-4 ${appearance.icon}`}
          />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
          {row.label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {row.count}
        </span>
      </div>
      <div className="ml-11 mt-2 h-2 overflow-hidden rounded-full">
        <div
          data-testid={`category-bar-${row.id}`}
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${ratio}%`, backgroundColor: appearance.color }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
