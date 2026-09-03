import type { ExpressionSpecification } from 'maplibre-gl'

/** The frontend-only GeoJSON source used by the country-state layer. */
export const fogSourceId = 'countries-fog'
export const fogLayerId = 'unexplored-countries-fog'

/**
 * At world scale, both states are intentionally tinted: explored land is a
 * warm, rewarding green while land still to discover stays a muted sage-grey.
 */
export const countryStateColorExpression: ExpressionSpecification = [
  'case',
  ['boolean', ['feature-state', 'explored'], false],
  '#7EA678',
  '#5F6F66',
]

/**
 * The fade reaches zero before the layer's maxzoom, so maxzoom cannot create a
 * visible cutoff. The first two stops keep world and continent views legible.
 */
export const countryStateMaxZoom = 9
export const countryStateOpacityExpression: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1.5,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0.48, 0.5],
  5,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0.48, 0.5],
  6,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0.4, 0.42],
  7,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0.22, 0.24],
  8,
  ['case', ['boolean', ['feature-state', 'explored'], false], 0.06, 0.07],
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
