export const DEFAULT_COMPETITIONS = [
  { id: 'kata', name: 'Kata indywidualne', group: 'Kata', active: true },
  { id: 'kata-pairs', name: 'Kata w parach', group: 'Kata', active: true },
  { id: 'kata-team', name: 'Kata drużynowe', group: 'Kata', active: true },
  { id: 'fantom', name: 'Juruken / Fantom', group: 'Dzieci', active: true },
  { id: 'sanbon', name: 'Kumite Sanbon Shobu', group: 'Kumite', active: true },
  { id: 'ippon', name: 'Kumite Ippon Shobu', group: 'Kumite', active: true },
  { id: 'nihon-u12', name: 'Kumite Shobu Nihon — do 12 lat', group: 'Kumite', maxAge: 12, active: true },
  { id: 'kumite-team', name: 'Kumite drużynowe', group: 'Kumite', active: true },
  { id: 'kodachi', name: 'Kodachi', group: 'Pozostałe', active: true },
  { id: 'obstacle', name: 'Tor przeszkód', group: 'Dzieci', active: true },
  { id: 'para', name: 'Para Karate / People with Disabilities', group: 'Para Karate', active: true },
]

export const DEFAULT_TOURNAMENT = {
  id: 'ika-open',
  name: 'IKA Poland — zawody',
  date: new Date().toISOString().slice(0, 10),
  venue: 'Hala zawodów',
  status: 'preparation',
  created: false,
  startTime: '09:00',
  matCount: 3,
  competitionIds: [],
  avgBoutMinutes: 2,
  boutSeconds: 120,
}
