export type DiscoveryDrawerOpenChangeDetails = {
  reason: string
  cancel: () => void
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
