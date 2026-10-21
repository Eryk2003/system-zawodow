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

  // Skala punktów w Systemie Zawodów IKA Poland:
  // WAZARI = 1, IPPON = 2.
  // Progi odpowiadają zasadzie Shobu Ippon / Nihon / Sanbon.
  if (isIppon) {
    return {
      discipline: 'ippon',
      targetScore: 2,
      title: 'SHOBU IPPON',
      description: 'Wygrana po 1 IPPON (2 pkt) lub 2 WAZARI (1 + 1).',
    }
  }

  if (isNihon) {
    return {
      discipline: 'nihon',
      targetScore: 4,
      title: 'SHOBU NIHON',
      description: 'Wygrana po osiągnięciu 4 pkt - równowartość 2 IPPON.',
    }
  }

  if (isSanbon) {
    return {
      discipline: 'sanbon',
      targetScore: 6,
      title: 'SHOBU SANBON',
      description: 'Wygrana po osiągnięciu 6 pkt - równowartość 3 IPPON.',
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
          { points: 1, label: 'WAZARI' },
          { points: 2, label: 'IPPON' },
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
        { points: 1, label: 'WAZARI' },
        { points: 2, label: 'IPPON' },
      ],
      corrections: [1, 2],
    },
    winRule,
  }
}
