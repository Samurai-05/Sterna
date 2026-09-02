import { describe, expect, it, vi } from 'vitest'

import { handleDiscoveryDrawerOpenChange } from './discovery-drawer'

describe('handleDiscoveryDrawerOpenChange', () => {
  it.each(['close-watcher', 'escape-key'])(
    'cancels the close and routes %s to viewer back navigation',
    (reason) => {
      const cancel = vi.fn()
      const handleBack = vi.fn()

      handleDiscoveryDrawerOpenChange(false, { reason, cancel }, handleBack)

      expect(cancel).toHaveBeenCalledOnce()
      expect(handleBack).toHaveBeenCalledOnce()
    },
  )

  it('cancels a swipe dismissal without leaving the viewer', () => {
    const cancel = vi.fn()
    const handleBack = vi.fn()

    handleDiscoveryDrawerOpenChange(
      false,
      { reason: 'swipe', cancel },
      handleBack,
    )

    expect(cancel).toHaveBeenCalledOnce()
    expect(handleBack).not.toHaveBeenCalled()
  })
})
