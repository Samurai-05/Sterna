export type DiscoveryDrawerOpenChangeDetails = {
  reason: string
  cancel: () => void
}

export type DiscoveryViewerBackRequestOptions = {
  isDeleteDialogOpen: boolean
  isDrawerExpanded?: boolean
  closeDeleteDialog: () => void
  closeDrawer?: () => void
  handleBack: () => void
}

export function handleViewerBackRequest({
  isDeleteDialogOpen,
  isDrawerExpanded,
  closeDeleteDialog,
  closeDrawer,
  handleBack,
}: DiscoveryViewerBackRequestOptions) {
  if (isDeleteDialogOpen) {
    closeDeleteDialog()
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
