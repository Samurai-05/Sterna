export function ProfileExplorationStats({
  discoveries,
  countries,
  pois,
}: {
  discoveries: number | null
  countries: number | null
  pois: number | null
}) {
  const stats = [
    { label: 'Discoveries', value: discoveries },
    { label: 'Countries', value: countries },
    { label: 'POIs', value: pois },
  ]

  return (
    <div
      className="grid grid-cols-3 divide-x divide-border"
      aria-label="Exploration statistics"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          role="group"
          aria-label={`${stat.label}: ${stat.value ?? 'Loading'}`}
          className="px-3 text-center first:pl-0 last:pr-0"
        >
          <p className="font-sans text-3xl font-semibold leading-9 tabular-nums text-foreground">
            {stat.value ?? '—'}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
