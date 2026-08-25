import { describe, expect, it, vi } from 'vitest'

const capacitorMock = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  setStyle: vi.fn(),
  show: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: capacitorMock.getPlatform,
  },
  SystemBars: {
    setStyle: capacitorMock.setStyle,
    show: capacitorMock.show,
  },
  SystemBarType: {
    StatusBar: 'StatusBar',
    NavigationBar: 'NavigationBar',
  },
  SystemBarsStyle: {
    Dark: 'DARK',
    Light: 'LIGHT',
  },
}))

import { applySystemBarAppearance, getSystemBarAppearance } from './system-bars'

describe('system bars', () => {
  it('uses dark status-bar icons only when the screen behind them is light', () => {
    expect(getSystemBarAppearance('/')).toEqual({
      statusBar: 'LIGHT',
      navigationBar: 'LIGHT',
    })
    expect(getSystemBarAppearance('/profile')).toEqual({
      statusBar: 'DARK',
      navigationBar: 'LIGHT',
    })
  })

  it('keeps native system bars visible and does nothing in the browser', async () => {
    capacitorMock.getPlatform.mockReturnValue('android')
    capacitorMock.setStyle.mockResolvedValue(undefined)
    capacitorMock.show.mockResolvedValue(undefined)

    await applySystemBarAppearance({
      statusBar: 'DARK',
      navigationBar: 'LIGHT',
    })

    expect(capacitorMock.show).toHaveBeenCalledOnce()
    expect(capacitorMock.setStyle).toHaveBeenNthCalledWith(1, {
      bar: 'StatusBar',
      style: 'DARK',
    })
    expect(capacitorMock.setStyle).toHaveBeenNthCalledWith(2, {
      bar: 'NavigationBar',
      style: 'LIGHT',
    })

    capacitorMock.getPlatform.mockReturnValue('web')
    capacitorMock.show.mockClear()
    capacitorMock.setStyle.mockClear()

    await applySystemBarAppearance({
      statusBar: 'LIGHT',
      navigationBar: 'LIGHT',
    })

    expect(capacitorMock.show).not.toHaveBeenCalled()
    expect(capacitorMock.setStyle).not.toHaveBeenCalled()
  })
})
