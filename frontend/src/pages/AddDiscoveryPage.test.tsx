import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AddDiscoveryPage } from './AddDiscoveryPage'

describe('AddDiscoveryPage', () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return render(
      <QueryClientProvider client={queryClient}>
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
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('renders a native photo selected before entering the form', () => {
    renderPage()

    expect(screen.getByRole('img', { name: 'Selected discovery photo' })).toHaveAttribute(
      'src',
      expect.stringContaining('photo.jpg'),
    )
    expect(screen.queryByText('Photo selected')).not.toBeInTheDocument()
    expect(screen.queryByText('JPEG, PNG or WebP · 10 MB maximum')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
    expect(screen.queryByText('Choose a photo from your device')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title (optional)' })).not.toBeRequired()
    expect(screen.getByRole('button', { name: 'Landscape' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByText('Other is selected automatically when no category is chosen.')).not.toBeInTheDocument()
  })

  it('replaces the selected photo from the change action', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:replacement',
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Change photo' }))
    fireEvent.change(screen.getByLabelText('Discovery photo'), {
      target: {
        files: [new File(['replacement'], 'replacement.jpg', { type: 'image/jpeg' })],
      },
    })

    expect(screen.getByRole('img', { name: 'Selected discovery photo' })).toHaveAttribute(
      'src',
      'blob:replacement',
    )
  })

  it('allows a category to be selected and unselected', () => {
    renderPage()

    const landscapeButton = screen.getByRole('button', { name: 'Landscape' })

    fireEvent.click(landscapeButton)
    expect(landscapeButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(landscapeButton)
    expect(landscapeButton).toHaveAttribute('aria-pressed', 'false')
  })
})
