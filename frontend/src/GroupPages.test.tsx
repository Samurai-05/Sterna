import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { ApiError } from './lib/api'
import { renderWithProviders } from './test/renderWithProviders'

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api')

  return {
    ...actual,
    getGroups: vi.fn(),
    getGroup: vi.fn(),
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
    getGroupDiscoveries: vi.fn(),
    getActiveMap: vi.fn(),
    setActiveMap: vi.fn(),
    getDiscoveries: vi.fn(),
    getPois: vi.fn(),
  }
})

const api = vi.mocked(await import('./lib/api'))

const ownedGroup = {
  id: '12',
  name: 'Paris Weekend',
  description: 'A shared map for a weekend in Paris.',
  role: 'owner' as const,
  isActive: false,
  memberCount: 2,
  discoveryCount: 3,
}

const detail = {
  ...ownedGroup,
  inviteCode: 'AB3K9QZ2',
  createdAt: '2026-08-01T10:00:00.000Z',
  members: [
    {
      userId: '1',
      userName: 'Emma',
      role: 'owner' as const,
      joinedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      userId: '2',
      userName: 'Marc',
      role: 'member' as const,
      joinedAt: '2026-08-02T10:00:00.000Z',
    },
  ],
}

beforeEach(() => {
  window.localStorage.setItem(
    'sterna.auth',
    JSON.stringify({
      accessToken: 'test-token',
      user: { id: '1', email: 'emma@example.com', userName: 'Emma' },
    }),
  )
  api.getGroups.mockResolvedValue([ownedGroup])
  api.getGroup.mockResolvedValue(detail)
  api.getGroupDiscoveries.mockResolvedValue([])
  api.getActiveMap.mockResolvedValue({ groupId: null, name: null })
  api.getDiscoveries.mockResolvedValue([])
  api.getPois.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

function renderAt(path: string) {
  return renderWithProviders(<App />, { route: path })
}

describe('groups list', () => {
  it('lists the groups with their member and discovery counts', async () => {
    renderAt('/groups')

    await screen.findByRole('link', { name: /Paris Weekend/ })
    expect(
      screen.getAllByText('2 members · 3 discoveries').length,
    ).toBeGreaterThan(0)
  })

  it('marks the personal map as active when no group is active', async () => {
    renderAt('/groups')

    const personal = await screen.findByRole('button', { name: /Personal map/ })
    expect(personal).toHaveAttribute('aria-current', 'true')
    expect(personal).toBeDisabled()
  })

  it('switches the active map when another destination is picked', async () => {
    api.setActiveMap.mockResolvedValue({ groupId: '12', name: 'Paris Weekend' })
    renderAt('/groups')

    fireEvent.click(
      await screen.findByRole('button', { name: /Paris Weekend/ }),
    )

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: '12',
      }),
    )
  })

  it('invites the user to create or join when they have no group', async () => {
    api.getGroups.mockResolvedValue([])
    renderAt('/groups')

    expect(
      await screen.findByText(/You are not in any group yet/),
    ).toBeInTheDocument()
  })
})

describe('group detail', () => {
  it('shows the invitation code and the member list', async () => {
    renderAt('/groups/12')

    expect(await screen.findByText('AB3K-9QZ2')).toBeInTheDocument()
    expect(screen.getByText('Emma')).toBeInTheDocument()
    expect(screen.getByText('Marc')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('reports a group it cannot see as not found rather than falling back', async () => {
    api.getGroup.mockRejectedValue(new ApiError('No such group.', 404))
    renderAt('/groups/99')

    expect(await screen.findByText('Group not found.')).toBeInTheDocument()
    expect(screen.queryByText('Paris Weekend')).not.toBeInTheDocument()
  })

  it('offers the owner a delete action instead of leaving', async () => {
    renderAt('/groups/12')

    expect(
      await screen.findByRole('button', { name: /Delete group/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Leave group/ }),
    ).not.toBeInTheDocument()
  })

  it('offers a plain member the leave action', async () => {
    api.getGroup.mockResolvedValue({ ...detail, role: 'member' as const })
    renderAt('/groups/12')

    expect(
      await screen.findByRole('button', { name: /Leave group/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Delete group/ }),
    ).not.toBeInTheDocument()
  })
})

describe('creating and joining', () => {
  it('sends the typed name and description', async () => {
    api.createGroup.mockResolvedValue(detail)
    renderAt('/groups/new')

    fireEvent.change(screen.getByLabelText(/Group name/), {
      target: { value: '  Paris Weekend  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }))

    // TanStack Query hands the mutation context as a second argument, so the
    // assertion looks at the payload alone.
    await waitFor(() => expect(api.createGroup).toHaveBeenCalled())
    expect(api.createGroup.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      name: 'Paris Weekend',
      description: null,
    })
  })

  it('explains an unknown invitation code instead of showing the raw 404', async () => {
    api.joinGroup.mockRejectedValue(
      new ApiError('No group matches this invitation code.', 404),
    )
    renderAt('/groups/join')

    fireEvent.change(screen.getByLabelText(/Invitation code/), {
      target: { value: 'zzzz9999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Join group' }))

    expect(
      await screen.findByText('No group matches this code.'),
    ).toBeInTheDocument()
  })

  it('uppercases the code as it is typed', async () => {
    renderAt('/groups/join')

    const field = screen.getByLabelText(/Invitation code/)
    fireEvent.change(field, { target: { value: 'ab3k-9qz2' } })

    expect(field).toHaveValue('AB3K-9QZ2')
  })
})
