import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

let observers: Array<{
  callback: IntersectionObserverCallback
  elements: Element[]
}> = []

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  elements: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observers.push(this)
  }

  observe(element: Element) {
    this.elements.push(element)
  }

  disconnect() {
    this.elements = []
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element)
  }
}

function simulateIntersection(element: Element, isIntersecting = true) {
  act(() => {
    for (const observer of observers) {
      if (observer.elements.includes(element)) {
        observer.callback(
          [{ isIntersecting, target: element } as IntersectionObserverEntry],
          observer as unknown as IntersectionObserver,
        )
      }
    }
  })
}

describe('DiscoveryClusterSheet', () => {
  beforeEach(() => {
    observers = []
    getPhotoMock.mockReset()
    getPhotoMock.mockResolvedValue(new Blob(['photo']))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
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

  it('shows nearby discoveries and loads only card-sized photos when scrolled into view', async () => {
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
    const flowerButton = screen.getByRole('button', {
      name: 'View Alpine flower',
    })
    expect(flowerButton).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Old monument' }),
    ).toBeInTheDocument()

    expect(getPhotoMock).not.toHaveBeenCalled()

    simulateIntersection(flowerButton.querySelector('span')!)

    await waitFor(() =>
      expect(getPhotoMock).toHaveBeenCalledWith(
        'token',
        'photos/flower.jpg',
        'card',
      ),
    )
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
  })

  it('does not immediately fetch photos for 12 nearby discoveries until intersected', async () => {
    const twelveDiscoveries = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Discovery ${i + 1}`,
      category: 'plant' as const,
      imageId: `img-${i + 1}`,
      imageObjectKey: `photos/discovery-${i + 1}.jpg`,
      coordinates: [6, 46] as [number, number],
    }))

    render(
      <DiscoveryClusterSheet
        open
        discoveries={twelveDiscoveries}
        photoAccessToken="token"
        onOpenChange={() => {}}
        onSelectDiscovery={() => {}}
      />,
    )

    expect(screen.getByText('12 discoveries nearby')).toBeInTheDocument()
    // Opening the sheet must NOT immediately call getPhoto 12 times
    expect(getPhotoMock).not.toHaveBeenCalled()

    // Simulate intersection of a later card (e.g. card 10)
    const card10Button = screen.getByRole('button', {
      name: 'View Discovery 10',
    })
    simulateIntersection(card10Button.querySelector('span')!)

    await waitFor(() =>
      expect(getPhotoMock).toHaveBeenCalledWith(
        'token',
        'photos/discovery-10.jpg',
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

    const flowerButton = screen.getByRole('button', {
      name: 'View Alpine flower',
    })
    simulateIntersection(flowerButton.querySelector('span')!)

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())

    view.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sheet-photo')
  })
})
