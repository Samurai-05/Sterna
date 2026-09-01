export type PersistedLocationSource = 'exif' | 'current_gps' | 'manual'

export type LocationUiSource =
  PersistedLocationSource | 'photo' | 'current' | 'search'

export type SelectedLocation = {
  coordinates: [number, number]
  source: PersistedLocationSource
}

/** Manual choices are final; EXIF outranks a lower-priority current GPS proposal. */
export function canApplyAutomaticLocation(
  current: Pick<SelectedLocation, 'source'> | null,
  incoming: Exclude<PersistedLocationSource, 'manual'>,
): boolean {
  if (current?.source === 'manual') return false
  return !(current?.source === 'exif' && incoming === 'current_gps')
}

export function normalizeLocationSource(
  source: LocationUiSource,
): PersistedLocationSource {
  switch (source) {
    case 'photo':
      return 'exif'
    case 'current':
      return 'current_gps'
    case 'search':
      return 'manual'
    default:
      return source
  }
}
