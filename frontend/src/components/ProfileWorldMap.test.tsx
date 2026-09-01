import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfileWorldMap } from './ProfileWorldMap'

describe('ProfileWorldMap', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { A3: 'FRA' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-5, 40],
                    [10, 40],
                    [10, 52],
                    [-5, 52],
                    [-5, 40],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { A3: 'CHE' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [5, 45],
                    [11, 45],
                    [11, 48],
                    [5, 48],
                    [5, 45],
                  ],
                ],
              },
            },
          ],
        }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders explored and unexplored countries with static SVG styling', async () => {
    renderWithProviders(<ProfileWorldMap exploredCountryCodes={['FRA']} />)

    expect(
      await screen.findByRole('img', { name: 'World exploration map' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('profile-country-FRA')).toHaveAttribute(
      'fill',
      '#2D5A3D',
    )
    expect(screen.getByTestId('profile-country-CHE')).toHaveAttribute(
      'fill',
      '#E8E3D9',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
