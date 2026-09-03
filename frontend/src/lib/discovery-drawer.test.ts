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

  it('closes the action menu before navigation for close-watcher requests', () => {
    const cancel = vi.fn()
    const closeActionMenu = vi.fn()
    const restoreFocus = vi.fn()
    const handleBack = vi.fn()

    handleDiscoveryDrawerOpenChange(
      false,
      { reason: 'close-watcher', cancel },
      () =>
        handleViewerBackRequest({
          isDeleteDialogOpen: false,
          isActionMenuOpen: true,
          closeDeleteDialog: vi.fn(),
          closeActionMenu,
          restoreActionMenuFocus: restoreFocus,
          handleBack,
        }),
    )

    expect(cancel).toHaveBeenCalledOnce()
    expect(closeActionMenu).toHaveBeenCalledOnce()
    expect(restoreFocus).toHaveBeenCalledOnce()
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
          isActionMenuOpen: true,
          closeDeleteDialog,
          closeActionMenu: vi.fn(),
          restoreActionMenuFocus: vi.fn(),
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
      isActionMenuOpen: false,
      closeDeleteDialog: vi.fn(),
      closeActionMenu: vi.fn(),
      restoreActionMenuFocus: vi.fn(),
      handleBack,
    })

    expect(handleBack).toHaveBeenCalledOnce()
  })

  it('collapses an expanded drawer before leaving the viewer', () => {
    const closeDrawer = vi.fn()
    const handleBack = vi.fn()

    handleViewerBackRequest({
      isDeleteDialogOpen: false,
      isActionMenuOpen: false,
      isDrawerExpanded: true,
      closeDeleteDialog: vi.fn(),
      closeActionMenu: vi.fn(),
      restoreActionMenuFocus: vi.fn(),
      closeDrawer,
      handleBack,
    })

    expect(closeDrawer).toHaveBeenCalledOnce()
    expect(handleBack).not.toHaveBeenCalled()
  })
})
