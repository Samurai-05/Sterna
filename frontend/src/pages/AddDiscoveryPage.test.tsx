import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AddDiscoveryPage } from './AddDiscoveryPage'

describe('AddDiscoveryPage', () => {
  it('renders a native photo selected before entering the form', () => {
    render(
      <MemoryRouter
        initialEntries={[
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
        ]}
      >
        <AddDiscoveryPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: 'Selected discovery photo' })).toHaveAttribute(
      'src',
      expect.stringContaining('photo.jpg'),
    )
    expect(screen.getByText('Photo selected')).toBeInTheDocument()
    expect(screen.queryByText('Choose a photo from your device')).not.toBeInTheDocument()
  })
})
