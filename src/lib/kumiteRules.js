export function getKumiteSideTheme(competition) {
  const id = String(competition?.id || '').toLowerCase()
  const name = String(competition?.name || '').toLowerCase()
  const isIppon = id === 'ippon' || (name.includes('ippon') && !name.includes('nihon'))

  if (isIppon) {
    return {
      mode: 'red-white',
      red: { key: 'red', code: '', label: '', className: 'side-red' },
      blue: { key: 'blue', code: '', label: '', className: 'side-white' },
    }
  }

  return {
    mode: 'red-blue',
    red: { key: 'red', code: '', label: '', className: 'side-red' },
    blue: { key: 'blue', code: '', label: '', className: 'side-blue' },
  }
}
