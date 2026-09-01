const disputedZoneClaims: Record<string, string[]> = {
  XCR: ['RUS', 'UKR'],
  XWS: ['MAR', 'ESH'],
}

export function normalizeExploredCountryCodes(codes: string[]): string[] {
  return [
    ...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)),
  ]
}

/**
 * Expands claim-country state to the disputed GeoJSON features used by both
 * MapLibre and the profile SVG map.
 */
export function expandedExploredCountryCodes(codes: string[]): string[] {
  const expandedCodes = new Set(normalizeExploredCountryCodes(codes))

  for (const [zone, claims] of Object.entries(disputedZoneClaims)) {
    if (claims.some((claim) => expandedCodes.has(claim))) {
      expandedCodes.add(zone)
    }
  }

  return [...expandedCodes]
}
