export function getKumiteSideTheme(competition) {
  const id = String(competition?.id || '').toLowerCase()
  const name = String(competition?.name || '').toLowerCase()

  const isIppon = id === 'ippon' || (name.includes('ippon') && !name.includes('nihon'))
  const isNihon = id === 'nihon' || name.includes('nihon')
  const isSanbon = id === 'sanbon' || name.includes('sanbon')

  if (isIppon) {
    return {
      mode: 'red-white',
      discipline: 'ippon',
      red: { key: 'red', code: 'AKA', label: 'AKA', className: 'side-red' },
      blue: { key: 'blue', code: 'SHIRO', label: 'SHIRO', className: 'side-white' },
      scoreRules: {
        awards: [
          { points: 1, label: 'WAZARI' },
          { points: 2, label: 'IPPON' },
        ],
        corrections: [1, 2],
      },
    }
  }

  return {
    mode: 'red-blue',
    discipline: isNihon ? 'nihon' : isSanbon ? 'sanbon' : 'kumite',
    red: { key: 'red', code: 'AKA', label: 'AKA', className: 'side-red' },
    blue: { key: 'blue', code: 'AO', label: 'AO', className: 'side-blue' },
    scoreRules: {
      awards: [
        { points: 1, label: 'WAZARI' },
        { points: 2, label: 'IPPON' },
      ],
      corrections: [1, 2],
    },
  }
}
