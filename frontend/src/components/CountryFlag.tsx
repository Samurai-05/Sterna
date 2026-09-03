import { Globe2 } from 'lucide-react'
import { useId, useState } from 'react'

import { getCountryFlagCode } from '@/lib/countries'

export function CountryFlag({
  countryCode,
  countryName,
}: {
  countryCode: string
  countryName: string
}) {
  const [isNameVisible, setIsNameVisible] = useState(false)
  const tooltipId = useId()
  const flagCode = getCountryFlagCode(countryCode)

  return (
    <button
      type="button"
      aria-label={countryName}
      aria-describedby={tooltipId}
      aria-expanded={isNameVisible}
      onClick={() => setIsNameVisible((visible) => !visible)}
      onBlur={() => setIsNameVisible(false)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        setIsNameVisible(false)
        event.currentTarget.blur()
      }}
      className="group relative flex h-10 w-14 items-center justify-center rounded-lg border border-border bg-card shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-0"
    >
      {flagCode ? (
        <img
          data-testid={`country-flag-${countryCode}`}
          src={`/country-flags/${flagCode}.svg`}
          alt=""
          width="40"
          height="30"
          className="h-7 w-10 rounded-[3px] object-contain shadow-sm ring-1 ring-black/10"
        />
      ) : (
        <Globe2
          data-testid={`country-flag-${countryCode}`}
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${isNameVisible ? 'opacity-100' : ''}`}
      >
        {countryName}
      </span>
    </button>
  )
}
