export const COUNTRIES = [
  ['AL','Albania','Albania','🇦🇱'],['AD','Andorra','Andora','🇦🇩'],['AM','Armenia','Armenia','🇦🇲'],['AT','Austria','Austria','🇦🇹'],
  ['AZ','Azerbaijan','Azerbejdżan','🇦🇿'],['BY','Belarus','Białoruś','🇧🇾'],['BE','Belgium','Belgia','🇧🇪'],['BA','Bosnia and Herzegovina','Bośnia i Hercegowina','🇧🇦'],
  ['BG','Bulgaria','Bułgaria','🇧🇬'],['HR','Croatia','Chorwacja','🇭🇷'],['CY','Cyprus','Cypr','🇨🇾'],['CZ','Czechia','Czechy','🇨🇿'],
  ['DK','Denmark','Dania','🇩🇰'],['EE','Estonia','Estonia','🇪🇪'],['FI','Finland','Finlandia','🇫🇮'],['FR','France','Francja','🇫🇷'],
  ['GE','Georgia','Gruzja','🇬🇪'],['DE','Germany','Niemcy','🇩🇪'],['GR','Greece','Grecja','🇬🇷'],['HU','Hungary','Węgry','🇭🇺'],
  ['IS','Iceland','Islandia','🇮🇸'],['IE','Ireland','Irlandia','🇮🇪'],['IL','Israel','Izrael','🇮🇱'],['IT','Italy','Włochy','🇮🇹'],
  ['KZ','Kazakhstan','Kazachstan','🇰🇿'],['XK','Kosovo','Kosowo','🇽🇰'],['LV','Latvia','Łotwa','🇱🇻'],['LI','Liechtenstein','Liechtenstein','🇱🇮'],
  ['LT','Lithuania','Litwa','🇱🇹'],['LU','Luxembourg','Luksemburg','🇱🇺'],['MT','Malta','Malta','🇲🇹'],['MD','Moldova','Mołdawia','🇲🇩'],
  ['MC','Monaco','Monako','🇲🇨'],['ME','Montenegro','Czarnogóra','🇲🇪'],['NL','Netherlands','Holandia','🇳🇱'],['MK','North Macedonia','Macedonia Północna','🇲🇰'],
  ['NO','Norway','Norwegia','🇳🇴'],['PL','Poland','Polska','🇵🇱'],['PT','Portugal','Portugalia','🇵🇹'],['RO','Romania','Rumunia','🇷🇴'],
  ['SM','San Marino','San Marino','🇸🇲'],['RS','Serbia','Serbia','🇷🇸'],['SK','Slovakia','Słowacja','🇸🇰'],['SI','Slovenia','Słowenia','🇸🇮'],
  ['ES','Spain','Hiszpania','🇪🇸'],['SE','Sweden','Szwecja','🇸🇪'],['CH','Switzerland','Szwajcaria','🇨🇭'],['TR','Türkiye','Turcja','🇹🇷'],
  ['UA','Ukraine','Ukraina','🇺🇦'],['GB','United Kingdom','Wielka Brytania','🇬🇧'],['VA','Vatican City','Watykan','🇻🇦'],
  ['US','United States','Stany Zjednoczone','🇺🇸'],['CA','Canada','Kanada','🇨🇦'],['JP','Japan','Japonia','🇯🇵'],['KR','South Korea','Korea Południowa','🇰🇷'],
  ['BR','Brazil','Brazylia','🇧🇷'],['AR','Argentina','Argentyna','🇦🇷'],['AU','Australia','Australia','🇦🇺'],['NZ','New Zealand','Nowa Zelandia','🇳🇿']
].map(([code,en,pl,flag]) => ({ code, en, pl, flag }))

export const countryByCode = (code) => COUNTRIES.find((item) => item.code === code) || null

export function countryLabel(codeOrName, language = 'pl') {
  const direct = countryByCode(codeOrName)
  if (direct) return `${direct.flag} ${language === 'en' ? direct.en : direct.pl}`
  const normalized = String(codeOrName || '').trim().toLowerCase()
  const match = COUNTRIES.find((item) => [item.en, item.pl].some((name) => name.toLowerCase() === normalized))
  if (!match) return codeOrName || ''
  return `${match.flag} ${language === 'en' ? match.en : match.pl}`
}

export function countryName(codeOrName, language = 'pl') {
  const direct = countryByCode(codeOrName)
  if (direct) return language === 'en' ? direct.en : direct.pl
  const normalized = String(codeOrName || '').trim().toLowerCase()
  const match = COUNTRIES.find((item) => [item.en, item.pl].some((name) => name.toLowerCase() === normalized))
  if (!match) return codeOrName || ''
  return language === 'en' ? match.en : match.pl
}
