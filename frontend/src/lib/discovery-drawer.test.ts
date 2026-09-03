import { describe, expect, it, vi } from 'vitest'

import {
  handleDiscoveryDrawerOpenChange,
  handleViewerBackRequest,
} from './discovery-drawer'

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

  it('closes the delete dialog before navigation for close-watcher requests', () => {
    const cancel = vi.fn()
    const closeDeleteDialog = vi.fn()
    const handleBack = vi.fn()

    handleDiscoveryDrawerOpenChange(
      false,
      { reason: 'close-watcher', cancel },
      () =>
        handleViewerBackRequest({
          isDeleteDialogOpen: true,
          closeDeleteDialog,
          handleBack,
        }),
    )

    expect(cancel).toHaveBeenCalledOnce()
    expect(closeDeleteDialog).toHaveBeenCalledOnce()
    expect(handleBack).not.toHaveBeenCalled()
  })

  it('navigates only when no local viewer overlay is open', () => {
    const handleBack = vi.fn()

    handleViewerBackRequest({
      isDeleteDialogOpen: false,
      closeDeleteDialog: vi.fn(),
      handleBack,
    })

    expect(handleBack).toHaveBeenCalledOnce()
  })

  it('collapses an expanded drawer before leaving the viewer', () => {
    const closeDrawer = vi.fn()
    const handleBack = vi.fn()

    handleViewerBackRequest({
      isDeleteDialogOpen: false,
      isDrawerExpanded: true,
      closeDeleteDialog: vi.fn(),
      closeDrawer,
      handleBack,
    })

    expect(closeDrawer).toHaveBeenCalledOnce()
    expect(handleBack).not.toHaveBeenCalled()
  })
})
