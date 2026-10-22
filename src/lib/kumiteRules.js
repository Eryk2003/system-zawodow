function normalizeCompetition(competition) {
  const id = String(competition?.id || '').toLowerCase()
  const name = String(competition?.name || '').toLowerCase()

  const isIppon = id === 'ippon' || (name.includes('ippon') && !name.includes('nihon'))
  const isNihon = id === 'nihon' || id === 'nihon-u12' || name.includes('nihon')
  const isSanbon = id === 'sanbon' || name.includes('sanbon')

  return { id, name, isIppon, isNihon, isSanbon }
}

export function getKumiteWinRule(competition) {
  const { isIppon, isNihon, isSanbon } = normalizeCompetition(competition)

  // Progi punktowe dla poszczególnych odmian Shobu.
  if (isIppon) {
    return {
      discipline: 'ippon',
      targetScore: 2,
      title: 'SHOBU IPPON',
      description: 'Wygrana po osiągnięciu 2 pkt.',
    }
  }

  if (isNihon) {
    return {
      discipline: 'nihon',
      targetScore: 4,
      title: 'SHOBU NIHON',
      description: 'Wygrana po osiągnięciu 4 pkt.',
    }
  }

  if (isSanbon) {
    return {
      discipline: 'sanbon',
      targetScore: 6,
      title: 'SHOBU SANBON',
      description: 'Wygrana po osiągnięciu 6 pkt.',
    }
  }

  return null
}

export function getKumiteSideTheme(competition) {
  const { isIppon, isNihon, isSanbon } = normalizeCompetition(competition)
  const winRule = getKumiteWinRule(competition)

  if (isIppon) {
    return {
      mode: 'red-white',
      discipline: 'ippon',
      red: { key: 'red', code: 'AKA', label: 'AKA', className: 'side-red' },
      blue: { key: 'blue', code: 'SHIRO', label: 'SHIRO', className: 'side-white' },
      scoreRules: {
        awards: [
          { points: 1, label: '+1' },
          { points: 2, label: '+2' },
        ],
        corrections: [1, 2],
      },
      winRule,
    }
  }

  return {
    mode: 'red-blue',
    discipline: isNihon ? 'nihon' : isSanbon ? 'sanbon' : 'kumite',
    red: { key: 'red', code: 'AKA', label: 'AKA', className: 'side-red' },
    blue: { key: 'blue', code: 'AO', label: 'AO', className: 'side-blue' },
    scoreRules: {
      awards: [
        { points: 1, label: '+1' },
        { points: 2, label: '+2' },
      ],
      corrections: [1, 2],
    },
    winRule,
  }
}


export const KUMITE_PENALTIES = [
  { level: 0, label: 'BRAK' },
  { level: 1, label: 'ATTENAI 1' },
  { level: 2, label: 'ATTENAI 2' },
  { level: 3, label: 'CHUI' },
  { level: 4, label: 'HANSOKU' },
]

export function getKumitePenaltyLabel(level) {
  const normalized = Math.max(0, Math.min(4, Number(level || 0)))
  return KUMITE_PENALTIES.find((item) => item.level === normalized)?.label || 'BRAK'
}
