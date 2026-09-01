import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
    getDiscovery: vi.fn(),
    updateDiscovery: vi.fn(),
    deleteDiscovery: vi.fn(),
    deleteGroup: vi.fn(),
    leaveGroup: vi.fn(),
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
  api.deleteDiscovery.mockResolvedValue(undefined)
  api.deleteGroup.mockResolvedValue(undefined)
  api.leaveGroup.mockResolvedValue(undefined)
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

  it('shows the personal map and marks it active', async () => {
    renderAt('/groups')

    const personalMap = await screen.findByLabelText('Personal map')
    await waitFor(() =>
      expect(personalMap).toHaveAttribute('aria-current', 'true'),
    )
    expect(personalMap).toHaveTextContent('Your private discoveries')
  })

  it('activates the personal map directly from the maps list', async () => {
    api.getActiveMap.mockResolvedValue({
      groupId: '12',
      name: 'Paris Weekend',
    })
    api.getGroups.mockResolvedValue([{ ...ownedGroup, isActive: true }])
    api.setActiveMap.mockResolvedValue({ groupId: null, name: null })
    renderAt('/groups')

    const activatePersonalMap = await screen.findByRole('button', {
      name: 'Activate personal map',
    })
    await waitFor(() => expect(activatePersonalMap).toBeEnabled())
    fireEvent.click(activatePersonalMap)

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: null,
      }),
    )
    expect(await screen.findByLabelText('Personal map')).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('highlights the active group without activating it from the list', async () => {
    api.getActiveMap.mockResolvedValue({
      groupId: '12',
      name: 'Paris Weekend',
    })
    api.getGroups.mockResolvedValue([{ ...ownedGroup, isActive: true }])
    renderAt('/groups')

    const group = await screen.findByRole('link', { name: /Paris Weekend/ })
    expect(group).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(api.setActiveMap).not.toHaveBeenCalled()
  })

  it('opens a group without activating it from the groups tab', async () => {
    renderAt('/groups')

    fireEvent.click(await screen.findByRole('link', { name: /Paris Weekend/ }))

    expect(await screen.findByText('AB3K-9QZ2')).toBeInTheDocument()
    expect(api.setActiveMap).not.toHaveBeenCalled()
  })

  it('invites the user to create or join when they have no group', async () => {
    api.getGroups.mockResolvedValue([])
    renderAt('/groups')

    expect(
      await screen.findByText(/You are not in any group yet/),
    ).toBeInTheDocument()
  })
})

describe('map group selector', () => {
  it('switches maps directly without opening the groups tab', async () => {
    api.setActiveMap.mockResolvedValue({ groupId: '12', name: 'Paris Weekend' })
    renderAt('/')

    const selector = await screen.findByRole('button', { name: /Active map/ })
    fireEvent.click(selector)
    fireEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Paris Weekend' }),
    )

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: '12',
      }),
    )
    await waitFor(() => expect(selector).toHaveTextContent('Paris Weekend'))
    expect(
      screen.queryByRole('menu', { name: 'Choose active map' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Explore map' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Groups' }),
    ).not.toBeInTheDocument()
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

  it('shows a QR code encoding the raw invite code alongside the text code', async () => {
    renderAt('/groups/12')

    await screen.findByText('AB3K-9QZ2')
    const qrCode = screen.getByRole('img', { name: 'Group invite QR code' })
    expect(qrCode).toBeInTheDocument()
    expect(qrCode.tagName.toLowerCase()).toBe('svg')
  })

  it('reports a group it cannot see as not found rather than falling back', async () => {
    api.getGroup.mockRejectedValue(new ApiError('No such group.', 404))
    renderAt('/groups/99')

    expect(await screen.findByText('Group not found.')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Paris Weekend' }),
    ).not.toBeInTheDocument()
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

  it('opens an application dialog before deleting an owned group', async () => {
    renderAt('/groups/12')

    fireEvent.click(await screen.findByRole('button', { name: /Delete group/ }))

    expect(
      screen.getByRole('alertdialog', { name: 'Delete group?' }),
    ).toBeInTheDocument()
    expect(api.deleteGroup).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api.deleteGroup).not.toHaveBeenCalled()
  })

  it('deletes an owned group once after the application dialog is confirmed', async () => {
    renderAt('/groups/12')

    fireEvent.click(await screen.findByRole('button', { name: /Delete group/ }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete group',
      }),
    )

    await waitFor(() =>
      expect(api.deleteGroup).toHaveBeenCalledWith('test-token', '12'),
    )
    expect(api.deleteGroup).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
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

  it('leaves a group once after the application dialog is confirmed', async () => {
    api.getGroup.mockResolvedValue({ ...detail, role: 'member' as const })
    renderAt('/groups/12')

    fireEvent.click(await screen.findByRole('button', { name: /Leave group/ }))
    expect(
      screen.getByRole('alertdialog', { name: 'Leave group?' }),
    ).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Leave group',
      }),
    )

    await waitFor(() =>
      expect(api.leaveGroup).toHaveBeenCalledWith('test-token', '12'),
    )
    expect(api.leaveGroup).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('activates the group from the header and stays on its detail page', async () => {
    api.setActiveMap.mockResolvedValue({ groupId: '12', name: 'Paris Weekend' })
    renderAt('/groups/12')

    fireEvent.click(await screen.findByRole('button', { name: 'Activate' }))

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: '12',
      }),
    )
    expect(
      await screen.findByText('This is your active map'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Group' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Activate' }),
    ).not.toBeInTheDocument()
  })
})

const otherMembersDiscovery = {
  id: 22,
  userId: '2',
  name: "Marc's find",
  category: 'monument' as const,
  location: '48.8000, 2.3000',
  imageId: 'photo-1500530855697-b586d89ba3ee',
  description: '',
  author: 'Marc',
  initials: 'M',
  relativeDate: 'today',
  coordinates: [2.3, 48.8] as [number, number],
  countryCode: 'FRA',
}

describe('opening a discovery from a group map', () => {
  it('reads it through the group instead of the owner-scoped route', async () => {
    api.getGroupDiscoveries.mockResolvedValue([otherMembersDiscovery])
    renderAt('/discoveries/22?group=12')

    expect(await screen.findByText("Marc's find")).toBeInTheDocument()
    // GET /api/discoveries/:id only ever returns the caller's own discoveries.
    expect(api.getDiscovery).not.toHaveBeenCalled()
    expect(api.getGroupDiscoveries).toHaveBeenCalled()
  })

  it("does not offer edit or delete on another member's discovery", async () => {
    api.getGroupDiscoveries.mockResolvedValue([otherMembersDiscovery])
    renderAt('/discoveries/22?group=12')

    await screen.findByText("Marc's find")
    expect(
      screen.queryByRole('menuitem', { name: 'Edit discovery' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: /Delete discovery/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('discovery-detail-expanded-content'),
    ).toHaveAttribute('aria-hidden', 'true')
  })

  it("keeps edit and delete on the viewer's own discovery", async () => {
    api.getGroupDiscoveries.mockResolvedValue([
      { ...otherMembersDiscovery, userId: '1', author: 'Emma' },
    ])
    renderAt('/discoveries/22?group=12')

    await screen.findByRole('button', { name: 'More actions' })
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(
      screen.getByRole('menuitem', { name: 'Edit discovery' }),
    ).toBeInTheDocument()
  })

  it('deletes a discovery once after the application dialog is confirmed', async () => {
    api.getGroupDiscoveries.mockResolvedValue([
      { ...otherMembersDiscovery, userId: '1', author: 'Emma' },
    ])
    renderAt('/discoveries/22?group=12')

    await screen.findByRole('button', { name: 'More actions' })
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete discovery' }))
    expect(
      screen.getByRole('alertdialog', { name: 'Delete discovery?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api.deleteDiscovery).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete discovery' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete discovery',
      }),
    )

    await waitFor(() =>
      expect(api.deleteDiscovery).toHaveBeenCalledWith('test-token', '22'),
    )
    expect(api.deleteDiscovery).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('returns to the map after saving an edit opened from the map', async () => {
    const ownDiscovery = {
      ...otherMembersDiscovery,
      userId: '1',
      author: 'Emma',
      groupId: null,
      groupIds: [],
      personal: true,
    }
    api.getDiscovery.mockResolvedValue(ownDiscovery)
    api.updateDiscovery.mockResolvedValue(ownDiscovery)

    renderWithProviders(<App />, {
      initialEntries: [
        {
          pathname: '/discoveries/22',
          state: {
            returnTo: '/',
            backgroundLocation: {
              pathname: '/',
              search: '',
              hash: '',
              state: null,
              key: 'map',
            },
          },
        },
      ],
    })

    await screen.findByRole('button', { name: 'More actions' })
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Edit discovery' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    await screen.findByRole('button', { name: 'More actions' })
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Explore map' }),
      ).toBeVisible(),
    )
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

describe('choosing the destination map before saving', () => {
  it('blocks saving until the active map is known', async () => {
    // getActiveMap left unresolved: the destination is not settled yet.
    api.getActiveMap.mockReturnValue(new Promise(() => {}))
    renderAt('/add')

    expect(
      await screen.findByRole('button', { name: 'Save discovery' }),
    ).toBeDisabled()
  })

  it('selects the active group by default and lets it be deselected', async () => {
    api.getActiveMap.mockResolvedValue({
      groupId: '12',
      name: 'Paris Weekend',
    })
    renderAt('/add')

    const activeGroup = await screen.findByRole('button', {
      name: 'Add to Paris Weekend',
    })
    expect(activeGroup).toHaveAttribute('aria-pressed', 'true')
    expect(activeGroup).toBeEnabled()
    expect(
      screen.getAllByRole('button', {
        name: 'Add to Paris Weekend',
      }),
    ).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Add to Personal map' }))
    fireEvent.click(activeGroup)
    expect(activeGroup).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/Saving to:/)).not.toBeInTheDocument()
    expect(
      screen
        .getByRole('heading', { name: 'Explore map', hidden: true })
        .closest('main'),
    ).toHaveClass('opacity-0')
  })

  it('enables saving once the active map has loaded', async () => {
    renderAt('/add')

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save discovery' }),
      ).toBeEnabled(),
    )
  })
})
