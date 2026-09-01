import type { ExpressionSpecification } from 'maplibre-gl'

/** The frontend-only GeoJSON source used by the country veil. */
export const fogSourceId = 'countries-fog'
export const fogLayerId = 'unexplored-countries-fog'

/** A muted green-grey keeps the veil intentional without recolouring explored land. */
export const fogColor = '#2f4439'

/**
 * The fade reaches zero before the layer's maxzoom, so maxzoom cannot create a
 * visible cutoff. The first two stops keep world and continent views legible.
 */
export const fogMaxZoom = 9
export const fogOpacityExpression: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1.5,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.52],
  5,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.52],
  6,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.44],
  7,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.25],
  8,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.08],
  8.5,
  0,
]

interface StyleLayerForInsertion {
  id: string
  type: string
  'source-layer'?: string
}

/**
 * Return the earliest native administrative boundary or label layer in the
 * loaded style. Every later boundary and label then stays above the fog. A
 * symbol fallback keeps the veil useful if a future basemap style renames or
 * removes its boundaries.
 */
export function getFogInsertionBeforeLayerId(
  layers: readonly StyleLayerForInsertion[],
): string | undefined {
  return layers.find(
    (layer) =>
      layer.type === 'symbol' ||
      (layer.type === 'line' && layer['source-layer'] === 'boundary'),
  )?.id
}
