export type DiscoveryDrawerOpenChangeDetails = {
  reason: string
  cancel: () => void
}

export type DiscoveryViewerBackRequestOptions = {
  isDeleteDialogOpen: boolean
  isActionMenuOpen: boolean
  closeDeleteDialog: () => void
  closeActionMenu: () => void
  restoreActionMenuFocus: () => void
  handleBack: () => void
}

export function handleViewerBackRequest({
  isDeleteDialogOpen,
  isActionMenuOpen,
  closeDeleteDialog,
  closeActionMenu,
  restoreActionMenuFocus,
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
