export function personalMapName(userName: string | undefined): string {
  const normalizedName = userName?.trim()

  if (!normalizedName) return 'Personal map'

  return normalizedName.endsWith('s')
    ? `${normalizedName}' map`
    : `${normalizedName}'s map`
}
