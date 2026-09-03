export function ProfileExplorationStats({
  discoveries,
  countries,
  countryTotal,
  pois,
  poiTotal,
}: {
  discoveries: number | null
  countries: number | null
  countryTotal: number
  pois: number | null
  poiTotal: number | null
}) {
  const stats = [
    { label: 'Discoveries', value: discoveries },
    { label: 'Countries', value: countries, total: countryTotal },
    { label: 'POIs', value: pois, total: poiTotal },
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
          aria-label={`${stat.label}: ${stat.value ?? 'Loading'}${stat.total == null ? '' : ` of ${stat.total}`}`}
          className="px-3 text-center first:pl-0 last:pr-0"
        >
          <p className="font-sans text-3xl font-semibold leading-9 tabular-nums text-foreground">
            {stat.value ?? '—'}
            {stat.total != null && (
              <span className="ml-0.5 text-base font-medium text-muted-foreground">
                /{stat.total}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
