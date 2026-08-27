import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const maplibreMocks = vi.hoisted(() => ({
  maps: [] as Array<{
    options: Record<string, unknown>
    controls: Array<{ control: { kind?: string }; position: string }>
  }>,
}))

vi.mock('maplibre-gl', () => {
  class FakeMap {
    options: Record<string, unknown>
    controls: Array<{ control: { kind?: string }; position: string }> = []

    constructor(options: Record<string, unknown>) {
      this.options = options
      maplibreMocks.maps.push(this)
    }

    addControl(control: { kind?: string }, position: string) {
      this.controls.push({ control, position })
      return this
    }

    on() {
      return this
    }

    flyTo() {
      return this
    }

    remove() {}
  }

  class FakeControl {
    options?: Record<string, unknown>

    constructor(options?: Record<string, unknown>) {
      this.options = options
    }

    on() {
      return this
    }
  }

  class FakeAttributionControl extends FakeControl {
    kind = 'attribution'
  }

  class FakeMarker {
    setLngLat() {
      return this
    }

    addTo() {
      return this
    }

    on() {
      return this
    }
  }

  return {
    AttributionControl: FakeAttributionControl,
    GeolocateControl: FakeControl,
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: FakeControl,
    setWorkerUrl: vi.fn(),
  }
})

import { LocationPickerMap } from './LocationPickerMap'

describe('LocationPickerMap attribution', () => {
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    maplibreMocks.maps.length = 0
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0',
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('uses a compact attribution control in the bottom right', () => {
    render(
      <LocationPickerMap coordinates={[2.3522, 48.8566]} onChange={vi.fn()} />,
    )

    const map = maplibreMocks.maps[0]
    expect(map.options).toMatchObject({ attributionControl: false })
    expect(map.controls).toContainEqual({
      control: expect.objectContaining({
        kind: 'attribution',
        options: { compact: true },
      }),
      position: 'bottom-right',
    })
  })
})
