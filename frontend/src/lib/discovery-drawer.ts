export type DiscoveryDrawerOpenChangeDetails = {
  reason: string
  cancel: () => void
}

export type DiscoveryViewerBackRequestOptions = {
  isDeleteDialogOpen: boolean
  isActionMenuOpen: boolean
  isDrawerExpanded?: boolean
  closeDeleteDialog: () => void
  closeActionMenu: () => void
  restoreActionMenuFocus: () => void
  closeDrawer?: () => void
  handleBack: () => void
}

export function handleViewerBackRequest({
  isDeleteDialogOpen,
  isActionMenuOpen,
  isDrawerExpanded,
  closeDeleteDialog,
  closeActionMenu,
  restoreActionMenuFocus,
  closeDrawer,
  handleBack,
}: DiscoveryViewerBackRequestOptions) {
  if (isDeleteDialogOpen) {
    closeDeleteDialog()
    return
  }

  if (isActionMenuOpen) {
    closeActionMenu()
    restoreActionMenuFocus()
    return
  }

  if (isDrawerExpanded) {
    closeDrawer?.()
    return
  }

  handleBack()
}

export function handleDiscoveryDrawerOpenChange(
  nextOpen: boolean,
  details: DiscoveryDrawerOpenChangeDetails,
  handleBack: () => void,
) {
  if (nextOpen) return

  details.cancel()
  if (details.reason === 'close-watcher' || details.reason === 'escape-key') {
    handleBack()
  }
}
