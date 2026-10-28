// ETAP 76 — visible TV labels in English without changing the stored tournament data.
// Names of competitors, clubs and user-defined events are intentionally unchanged.

export function tvRound(value) {
  const source = String(value ?? '')
  const key = source.trim().toLowerCase()
  const roundNames = {
    'runda wstępna': 'Preliminary Round',
    'runda wstepna': 'Preliminary Round',
    'finał': 'Final',
    'final': 'Final',
    'półfinał': 'Semifinal',
    'polfinal': 'Semifinal',
    'ćwierćfinał': 'Quarterfinal',
    'cwiercfinal': 'Quarterfinal',
    '1/8 finału': 'Round of 16',
    '1/16 finału': 'Round of 32',
    '1/32 finału': 'Round of 64',
    '1/64 finału': 'Round of 128',
    'walka o trzecie miejsce': 'Bronze Medal Bout',
    'walka o 3. miejsce': 'Bronze Medal Bout',
  }
  if (roundNames[key]) return roundNames[key]
  const numberedRound = key.match(/^runda\s+(\d+)$/u)
  if (numberedRound) return `Round ${numberedRound[1]}`
  return source
}

export function tvCategory(value) {
  const source = String(value ?? '')
  const trimmed = source.trim()
  if (!trimmed) return source

  // Only translate standard age/sex group labels; preserve custom category names.
  const sex = /^(chłopcy|chlopcy|dziewczęta|dziewczeta|kobiety|mężczyźni|mezczyzni|dzieci|młodzicy|mlodzicy|młodziczki|mlodziczki)\b\s*[-–:]?\s*(.*)$/iu.exec(trimmed)
  if (!sex) return source
  const names = {
    'chłopcy': 'Boys', 'chlopcy': 'Boys',
    'dziewczęta': 'Girls', 'dziewczeta': 'Girls',
    'kobiety': 'Women', 'mężczyźni': 'Men', 'mezczyzni': 'Men',
    'dzieci': 'Children', 'młodzicy': 'Cadet boys', 'mlodzicy': 'Cadet boys',
    'młodziczki': 'Cadet girls', 'mlodziczki': 'Cadet girls',
  }
  const label = names[sex[1].toLowerCase()] || sex[1]
  const rest = sex[2].trim()
  if (!rest) return label
  let suffix = rest.replace(/\s*lat\b/giu, ' years').replace(/\s*lata\b/giu, ' years').trim()
  suffix = suffix.replace(/^(\d+)\s*[-–]\s*(\d+)\s*years$/i, '$1–$2 years')
  suffix = suffix.replace(/^(\d+)\s*years$/i, '$1 years')
  return `${label} ${suffix}`.trim()
}

export function tvPenaltyLabel(label) {
  const source = String(label ?? '')
  return source.trim().toUpperCase() === 'BRAK' ? 'NONE' : source
}
