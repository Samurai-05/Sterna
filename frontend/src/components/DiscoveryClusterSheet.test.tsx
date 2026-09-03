import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPhotoMock } = vi.hoisted(() => ({
  getPhotoMock: vi.fn().mockResolvedValue(new Blob(['photo'])),
}))

vi.mock('@/lib/api', () => ({ getPhoto: getPhotoMock }))

import { DiscoveryClusterSheet } from './DiscoveryClusterSheet'

const discoveries = [
  {
    id: 1,
    name: 'Alpine flower',
    category: 'plant' as const,
    imageId: 'fallback-1',
    imageObjectKey: 'photos/flower.jpg',
    coordinates: [6, 46] as [number, number],
  },
  {
    id: 2,
    name: 'Old monument',
    category: 'monument' as const,
    imageId: 'fallback-2',
    coordinates: [6, 46] as [number, number],
  },
]

describe('DiscoveryClusterSheet', () => {
  beforeEach(() => {
    getPhotoMock.mockReset()
    getPhotoMock.mockResolvedValue(new Blob(['photo']))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decode = vi.fn().mockResolvedValue(undefined)
      },
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sheet-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows nearby discoveries and loads only card-sized photos', async () => {
    render(
      <DiscoveryClusterSheet
        open
        discoveries={discoveries}
        photoAccessToken="token"
        onOpenChange={() => {}}
        onSelectDiscovery={() => {}}
      />,
    )

    expect(screen.getByText('2 discoveries nearby')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Alpine flower' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Old monument' }),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(getPhotoMock).toHaveBeenCalledWith(
        'token',
        'photos/flower.jpg',
        'card',
      ),
    )
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
  })

  it('closes before selecting a discovery', () => {
    const onOpenChange = vi.fn()
    const onSelectDiscovery = vi.fn()

    render(
      <DiscoveryClusterSheet
        open
        discoveries={discoveries}
        onOpenChange={onOpenChange}
        onSelectDiscovery={onSelectDiscovery}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View Old monument' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSelectDiscovery).toHaveBeenCalledWith(2)
  })

  it('revokes loaded card photo URLs when disposed', async () => {
    const view = render(
      <DiscoveryClusterSheet
        open
        discoveries={[discoveries[0]]}
        photoAccessToken="token"
        onOpenChange={() => {}}
        onSelectDiscovery={() => {}}
      />,
    )
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())

    view.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sheet-photo')
  })
})
