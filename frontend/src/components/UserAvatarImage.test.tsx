import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ getPhoto: vi.fn() }))

const { getPhoto } = vi.mocked(await import('@/lib/api'))
const { UserAvatarImage } = await import('./UserAvatarImage')

describe('UserAvatarImage', () => {
  it('shows the initial when there is no photo', () => {
    render(<UserAvatarImage initial="E" />)

    expect(screen.getByText('E')).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('shows the initial without fetching when there is no access token', () => {
    render(<UserAvatarImage avatarObjectKey="photos/a.jpg" initial="E" />)

    expect(screen.getByText('E')).toBeInTheDocument()
    expect(getPhoto).not.toHaveBeenCalled()
  })

  it('fetches and displays the photo once both are known', async () => {
    getPhoto.mockResolvedValue(new Blob(['bytes']))

    const { container } = render(
      <UserAvatarImage
        accessToken="token"
        avatarObjectKey="photos/a.jpg"
        initial="E"
      />,
    )

    await waitFor(() =>
      expect(getPhoto).toHaveBeenCalledWith('token', 'photos/a.jpg'),
    )
    await waitFor(() =>
      expect(container.querySelector('img')).toBeInTheDocument(),
    )
    expect(screen.queryByText('E')).not.toBeInTheDocument()
  })

  it('falls back to the initial when the photo fails to load', async () => {
    getPhoto.mockRejectedValue(new Error('not found'))

    render(
      <UserAvatarImage
        accessToken="token"
        avatarObjectKey="photos/missing.jpg"
        initial="E"
      />,
    )

    await waitFor(() => expect(getPhoto).toHaveBeenCalled())
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })
})
