import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { PoiCard } from './PoiCard'

describe('PoiCard', () => {
  it('uses a card-sized image with lazy asynchronous decoding', () => {
    render(
      <MemoryRouter>
        <PoiCard
          poi={{
            id: 'poi-1',
            name: 'Example POI',
            city: '',
            country: '',
            imageId: 'fallback',
            imageUrl:
              'https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg?width=1600',
            description: '',
            discovered: true,
            coordinates: [6.6, 46.7],
          }}
        />
      </MemoryRouter>,
    )

    const image = screen.getByRole('img', { name: 'Example POI' })
    expect(image).toHaveAttribute('src', expect.stringContaining('width=640'))
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')

    const card = screen.getByRole('link', { name: /Example POI/ })
    expect(within(card).getByText('POI')).toHaveClass('rounded-full')
    expect(screen.queryByText('Point of interest')).not.toBeInTheDocument()
  })
})
