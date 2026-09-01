export interface MapBoundsLike {
  getWest: () => number
  getSouth: () => number
  getEast: () => number
  getNorth: () => number
}

const mapMarkerViewportBuffer = 0.2

export function isCoordinateInMapViewport(
  coordinates: [number, number],
  bounds: MapBoundsLike,
  buffer = mapMarkerViewportBuffer,
): boolean {
  const [longitude, latitude] = coordinates
  const west = bounds.getWest() - buffer
  const east = bounds.getEast() + buffer
  const south = bounds.getSouth() - buffer
  const north = bounds.getNorth() + buffer

  const longitudeVisible =
    west <= east
      ? longitude >= west && longitude <= east
      : longitude >= west || longitude <= east

  return longitudeVisible && latitude >= south && latitude <= north
}

export function getVisibleLandmarks<
  T extends { coordinates: [number, number] },
>(landmarks: T[], bounds: MapBoundsLike): T[] {
  return landmarks.filter((landmark) =>
    isCoordinateInMapViewport(landmark.coordinates, bounds),
  )
}
