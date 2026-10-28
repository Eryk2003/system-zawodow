// IKA Poland Elite European Cup 2027 — zestaw kategorii na podstawie regulaminu.
// 78 kodow (K, J, S, IP, KU) przepisanych z tabel regulaminu.
// Dodatkowe, niekodowane szablony sa wyraznie oznaczone jako pomocnicze.
const AGE = {
  '6-7': [6, 7], '8': [8, 8], '9': [9, 9], '10': [10, 10],
  '11': [11, 11], '12': [12, 12], '13': [13, 13],
  '14-15': [14, 15], '16-17': [16, 17],
  '18-21': [18, 21], '22-40': [22, 40],
  '8-9': [8, 9], '10-11': [10, 11], '12-13': [12, 13],
  '16+': [16, null], '6-8': [6, 8], '9-11': [9, 11],
  '12-15': [12, 15], 'over41': [42, null], 'over40': [41, null],
  'under40-adults': [18, 39],
}
const AGE_LABEL = {
  '6-7': '6–7 lat', '8': '8 lat', '9': '9 lat', '10': '10 lat',
  '11': '11 lat', '12': '12 lat', '13': '13 lat',
  '14-15': '14–15 lat', '16-17': '16–17 lat', '18-21': '18–21 lat',
  '22-40': '22–40 lat', '8-9': '8–9 lat', '10-11': '10–11 lat',
  '12-13': '12–13 lat', '16+': '16+ lat', '6-8': '6–8 lat',
  '9-11': '9–11 lat', '12-15': '12–15 lat',
  'over41': 'powyżej 41 lat', 'over40': 'powyżej 40 lat',
  'under40-adults': 'poniżej 40 lat (dorośli)',
}
function record(competitionId, code, label, gender, ageKey, { official = true, boutSeconds = null } = {}) {
  const [minAge, maxAge] = AGE[ageKey] || [null, null]
  return {
    code: code || '',
    competitionId, name: `${code ? `${code} · ` : ''}${label} ${AGE_LABEL[ageKey] || ''}`.trim(),
    gender, minAge, maxAge, boutSeconds,
    official, preferredMat: null, categorySource: official ? 'elite2027-official' : 'elite2027-helper',
  }
}
const official = []
// KATA: K1-K10, K12-K13; K14-K25. Regulamin pomija K11.
const kataBoys = ['6-7','8','9','10','11','12','13','14-15','16-17','18-21','22-40','over41']
const kataGirls = ['6-7','8','9','10','11','12','13','14-15','16-17','18-21','22-40','over40']
;[...Array.from({length:10},(_,i)=>`K${i+1}`),'K12','K13'].forEach((code,i) => official.push(record('kata',code,'Chłopcy / mężczyźni','M',kataBoys[i])))
Array.from({length:12},(_,i)=>`K${i+14}`).forEach((code,i)=>official.push(record('kata',code,'Dziewczęta / kobiety','K',kataGirls[i])))
// JURUKEN/FANTOM: J1-J5, J6-J10.
const jrAges = ['6-7','8','9','10','11']
Array.from({length:5},(_,i)=>`J${i+1}`).forEach((code,i)=>official.push(record('fantom',code,'Chłopcy','M',jrAges[i])))
Array.from({length:5},(_,i)=>`J${i+6}`).forEach((code,i)=>official.push(record('fantom',code,'Dziewczęta','K',jrAges[i])))
// SANBON SHOBU: S1-S9, S11-S13; S14-S25. Regulamin pomija S10.
const sanbonAges = ['6-7','8','9','10','11','12','13','14-15','16-17','18-21','22-40','over41']
;[...Array.from({length:9},(_,i)=>`S${i+1}`),'S11','S12','S13'].forEach((code,i)=>official.push(record('sanbon',code,'Chłopcy / mężczyźni','M',sanbonAges[i],{boutSeconds:i<=5?90:i<=8?120:180})))
Array.from({length:12},(_,i)=>`S${i+14}`).forEach((code,i)=>official.push(record('sanbon',code,'Dziewczęta / kobiety','K',sanbonAges[i],{boutSeconds:i<=5?90:i<=8?120:180})))
// IPPON SHOBU: IP1-IP8; IP9-IP16.
const ipponAges = ['6-7','8-9','10-11','12-13','14-15','16-17','under40-adults','over40']
Array.from({length:8},(_,i)=>`IP${i+1}`).forEach((code,i)=>official.push(record('ippon',code,'Chłopcy / mężczyźni','M',ipponAges[i],{boutSeconds:120})))
Array.from({length:8},(_,i)=>`IP${i+9}`).forEach((code,i)=>official.push(record('ippon',code,'Dziewczęta / kobiety','K',ipponAges[i],{boutSeconds:120})))
// MIX TEAM KUMITE: KU1-KU4 (wszystkie kategorie mieszane).
;['6-8','9-11','12-15','16+'].forEach((age,i)=>official.push(record('kumite-team',`KU${i+1}`,'Mieszane kumite drużynowe','X',age)))
// Poniższe szablony nie mają kodów kategorii w przesłanym regulaminie.
const supplementary = []
// NIHON Shobu: osobna konkurencja zachowana zgodnie z ustaleniem uzytkownika.
// W regulaminie <=12 lat figuruje w zapisach Sanbon, bez osobnych kodow N.
;['6-7','8','9','10','11','12'].forEach(age => {
  supplementary.push(record('nihon-u12','', 'Nihon Shobu – chłopcy', 'M', age, {official:false,boutSeconds:90}))
  supplementary.push(record('nihon-u12','', 'Nihon Shobu – dziewczęta', 'K', age, {official:false,boutSeconds:90}))
})
supplementary.push({code:'',competitionId:'kata-pairs',name:'Kata w parach · OPEN (do podziału przez organizatora)',gender:'X',minAge:null,maxAge:null,boutSeconds:null,official:false,preferredMat:null,categorySource:'elite2027-helper'})
supplementary.push({code:'',competitionId:'kata-team',name:'Kata drużynowe · OPEN (do podziału przez organizatora)',gender:'X',minAge:null,maxAge:null,boutSeconds:null,official:false,preferredMat:null,categorySource:'elite2027-helper'})
supplementary.push({code:'',competitionId:'para',name:'Para Karate · OPEN (do podziału przez organizatora)',gender:'X',minAge:null,maxAge:null,boutSeconds:null,official:false,preferredMat:null,categorySource:'elite2027-helper'})

export const ELITE_2027_OFFICIAL_CATEGORIES = official
export const ELITE_2027_EXTRA_TEMPLATES = supplementary
export const ELITE_2027_ALL_TEMPLATES = [...official,...supplementary]
export const getElite2027Templates = (competitionIds = []) => {
  const allowed = new Set(competitionIds)
  return ELITE_2027_ALL_TEMPLATES.filter(item => allowed.has(item.competitionId))
}
