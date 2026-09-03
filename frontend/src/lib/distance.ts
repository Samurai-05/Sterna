export function distanceInKilometres(
  from: [number, number],
  to: [number, number],
): number {
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(to[1] - from[1])
  const longitudeDelta = toRadians(to[0] - from[0])
  const fromLatitude = toRadians(from[1])
  const toLatitude = toRadians(to[1])
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1)
    return `${Math.max(1, Math.round(distanceKm * 1000))} m away`
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`
  return `${Math.round(distanceKm)} km away`
}
