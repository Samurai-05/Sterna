import { screen, waitFor } from '@testing-library/react'
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
              properties: { A3: 'XCR' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [30, 40],
                    [40, 40],
                    [40, 50],
                    [30, 50],
                    [30, 40],
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

  it('renders explored and unexplored countries with accessible static SVG styling', async () => {
    renderWithProviders(<ProfileWorldMap exploredCountryCodes={['FRA']} />)

    expect(
      await screen.findByRole('img', { name: 'World exploration map' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('profile-country-FRA')).toHaveAttribute(
      'fill',
      '#2D5A3D',
    )
    expect(screen.getByTestId('profile-country-FRA')).toHaveAttribute(
      'fill-rule',
      'evenodd',
    )
    expect(screen.getByTestId('profile-country-XCR')).toHaveAttribute(
      'fill',
      '#E8E3D9',
    )
  })

  it('shows a recovery action when geometry loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    renderWithProviders(<ProfileWorldMap exploredCountryCodes={[]} />)

    expect(
      await screen.findByText('The world map is temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByRole('img', { name: 'World exploration map' }),
      ).not.toBeInTheDocument(),
    )
  })
})
