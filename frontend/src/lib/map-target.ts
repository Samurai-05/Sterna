export interface MapTarget {
  coordinates: [number, number]
  zoom: number
  label: string
}

export function getMapTarget(state: unknown): MapTarget | null {
  if (!isRecord(state) || !isRecord(state.mapTarget)) return null

  const { coordinates, zoom, label } = state.mapTarget
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every((value) => typeof value === 'number') ||
    typeof zoom !== 'number' ||
    typeof label !== 'string'
  ) {
    return null
  }

  const [longitude, latitude] = coordinates
  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    zoom < 0 ||
    zoom > 22
  ) {
    return null
  }

  return { coordinates: [longitude, latitude], zoom, label }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
