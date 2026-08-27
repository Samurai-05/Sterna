import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { AddDiscoveryPage } from './AddDiscoveryPage'

describe('AddDiscoveryPage', () => {
  it('renders a native photo selected before entering the form', () => {
    renderWithProviders(<AddDiscoveryPage />, {
      initialEntries: [
        {
          pathname: '/add',
          state: {
            selectedPhoto: {
              path: '/data/user/0/com.sterna.app/cache/photo.jpg',
              mimeType: 'image/jpeg',
              fileName: 'photo.jpg',
              source: 'gallery',
            },
          },
        },
      ],
    })

    expect(screen.getByRole('img', { name: 'Selected discovery photo' })).toHaveAttribute(
      'src',
      expect.stringContaining('photo.jpg'),
    )
    expect(screen.getByText('Photo selected')).toBeInTheDocument()
    expect(screen.queryByText('Choose a photo from your device')).not.toBeInTheDocument()
  })
})
