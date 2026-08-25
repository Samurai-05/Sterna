import {
  Capacitor,
  SystemBarType,
  SystemBars,
  SystemBarsStyle,
} from '@capacitor/core'

export type SystemBarStyle = 'DARK' | 'LIGHT'

export type SystemBarAppearance = {
  statusBar: SystemBarStyle
  navigationBar: SystemBarStyle
}

export function getSystemBarAppearance(pathname: string): SystemBarAppearance {
  return {
    statusBar: pathname === '/profile' ? 'DARK' : 'LIGHT',
    navigationBar: 'LIGHT',
  }
}

export async function applySystemBarAppearance(
  appearance: SystemBarAppearance,
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return
  }

  try {
    await SystemBars.show()
    await Promise.all([
      SystemBars.setStyle({
        bar: SystemBarType.StatusBar,
        style:
          appearance.statusBar === 'DARK'
            ? SystemBarsStyle.Dark
            : SystemBarsStyle.Light,
      }),
      SystemBars.setStyle({
        bar: SystemBarType.NavigationBar,
        style:
          appearance.navigationBar === 'DARK'
            ? SystemBarsStyle.Dark
            : SystemBarsStyle.Light,
      }),
    ])
  } catch {
    // Native system-bar APIs may be unavailable during browser previews.
  }
}
