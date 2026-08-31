import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadSession, saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { EditProfilePage } from './EditProfilePage'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')

  return {
    ...actual,
    getCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    uploadPhoto: vi.fn(),
    getPhoto: vi.fn(),
  }
})

const api = vi.mocked(await import('@/lib/api'))

const user = {
  id: '1',
  email: 'explorer@sterna.app',
  userName: 'Explorer',
  avatarObjectKey: null as string | null,
  createdAt: '2026-08-26T08:00:00.000Z',
}

beforeEach(() => {
  saveSession({ accessToken: 'test-token', user })
  api.getCurrentUser.mockResolvedValue(user)
  api.getPhoto.mockResolvedValue(new Blob(['fake image bytes']))
})

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('editing the display name and photo', () => {
  it('saves a renamed display name and updates the session', async () => {
    api.updateProfile.mockResolvedValue({ ...user, userName: 'Ada' })
    renderWithProviders(<EditProfilePage />)

    const nameField = await screen.findByLabelText('Display name')
    fireEvent.change(nameField, { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalled())
    expect(api.updateProfile.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      userName: 'Ada',
    })
    expect(loadSession()?.user.userName).toBe('Ada')
  })

  it('uploads a selected photo and saves its object key as the avatar', async () => {
    api.uploadPhoto.mockResolvedValue({
      objectKey: 'photos/new.jpg',
      url: '/api/photos/new.jpg',
      exif: null,
    })
    api.updateProfile.mockResolvedValue({
      ...user,
      avatarObjectKey: 'photos/new.jpg',
    })
    renderWithProviders(<EditProfilePage />)

    await screen.findByLabelText('Display name')
    const fileInput = screen.getByLabelText(/Change photo/)
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalled())
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalled())
    expect(api.updateProfile.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      avatarObjectKey: 'photos/new.jpg',
    })
  })

  it('removes the existing photo on request', async () => {
    api.getCurrentUser.mockResolvedValue({
      ...user,
      avatarObjectKey: 'photos/current.jpg',
    })
    api.updateProfile.mockResolvedValue({ ...user, avatarObjectKey: null })
    renderWithProviders(<EditProfilePage />)

    fireEvent.click(await screen.findByRole('button', { name: /Remove photo/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalled())
    expect(api.updateProfile.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      avatarObjectKey: null,
    })
  })

  it('does not call the API when nothing changed', async () => {
    renderWithProviders(<EditProfilePage />)

    await screen.findByLabelText('Display name')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    // No submission round-trip to wait on, so this only proves the mutation
    // was never fired — a settled microtask queue is as much as there is to
    // observe here.
    await Promise.resolve()
    expect(api.updateProfile).not.toHaveBeenCalled()
  })
})

describe('changing the password', () => {
  it('submits the current and new password and confirms success', async () => {
    api.changePassword.mockResolvedValue(undefined)
    renderWithProviders(<EditProfilePage />)

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'correct horse battery staple' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'a whole different passphrase' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'a whole different passphrase' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(api.changePassword).toHaveBeenCalled())
    expect(api.changePassword.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      currentPassword: 'correct horse battery staple',
      newPassword: 'a whole different passphrase',
    })
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('refuses a mismatched confirmation without calling the API', async () => {
    renderWithProviders(<EditProfilePage />)

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'correct horse battery staple' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'a whole different passphrase' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'does not match' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText(/do not match/)).toBeInTheDocument()
    expect(api.changePassword).not.toHaveBeenCalled()
  })

  it('surfaces the backend error for a wrong current password', async () => {
    api.changePassword.mockRejectedValue(
      new Error('The current password is incorrect.'),
    )
    renderWithProviders(<EditProfilePage />)

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'wrong password' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'a whole different passphrase' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'a whole different passphrase' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(
      await screen.findByText('The current password is incorrect.'),
    ).toBeInTheDocument()
  })
})
