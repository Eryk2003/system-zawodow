// ETAP 92: dostepne kata z najczesciej spotykanych stylow IKA.
// Organizator moze zawsze wybrac "Inne kata" i wpisac dodatkowa nazwe.
// Nazwy to propozycje do wyboru, nie zamknieta lista dopuszczalnych kata.
export const KATA_CUSTOM_VALUE = '__ika92_inne_kata__'

export const KATA_GROUPS = [
  {
    style: 'Shotokan',
    names: [
      'Taikyoku Shodan', 'Heian Shodan', 'Heian Nidan', 'Heian Sandan', 'Heian Yondan', 'Heian Godan',
      'Tekki Shodan', 'Tekki Nidan', 'Tekki Sandan', 'Bassai Dai', 'Bassai Sho', 'Kanku Dai',
      'Kanku Sho', 'Empi', 'Jion', 'Jitte', 'Hangetsu', 'Gankaku', 'Chinte', 'Nijushiho',
      'Sochin', 'Meikyo', 'Gojushiho Dai', 'Gojushiho Sho', 'Unsu', 'Wankan', 'Ji in',
    ],
  },
  {
    style: 'Wado-ryu',
    names: [
      'Pinan Shodan', 'Pinan Nidan', 'Pinan Sandan', 'Pinan Yondan', 'Pinan Godan',
      'Naihanchi', 'Kushanku', 'Seishan', 'Chinto', 'Bassai', 'Niseishi', 'Rohai',
      'Wanshu', 'Jion', 'Jitte',
    ],
  },
  {
    style: 'Shito-ryu',
    names: [
      'Pinan Shodan', 'Pinan Nidan', 'Pinan Sandan', 'Pinan Yondan', 'Pinan Godan',
      'Bassai Dai', 'Bassai Sho', 'Kosokun Dai', 'Kosokun Sho', 'Shiho Kosokun',
      'Jion', 'Jitte', 'Matsukaze', 'Seienchin', 'Saifa', 'Seipai', 'Shisochin',
      'Sanseiru', 'Suparinpei', 'Nipaipo', 'Aoyagi', 'Pachu', 'Chatanyara Kushanku',
      'Unshu', 'Rohai', 'Kururunfa',
    ],
  },
  {
    style: 'Goju-ryu',
    names: [
      'Gekisai Dai Ichi', 'Gekisai Dai Ni', 'Saifa', 'Seiyunchin', 'Shisochin',
      'Sanseiru', 'Seipai', 'Kururunfa', 'Suparinpei', 'Sanchin', 'Tensho',
    ],
  },
  {
    style: 'Kyokushin',
    names: [
      'Taikyoku Sono Ichi', 'Taikyoku Sono Ni', 'Taikyoku Sono San',
      'Taikyoku Sono Ichi Ura', 'Taikyoku Sono Ni Ura', 'Taikyoku Sono San Ura',
      'Pinan Sono Ichi', 'Pinan Sono Ni', 'Pinan Sono San', 'Pinan Sono Yon', 'Pinan Sono Go',
      'Pinan Sono Ichi Ura', 'Pinan Sono Ni Ura', 'Pinan Sono San Ura',
      'Pinan Sono Yon Ura', 'Pinan Sono Go Ura', 'Sanchin', 'Tsuki no Kata',
      'Yantsu', 'Gekisai Dai', 'Gekisai Sho', 'Tensho', 'Saifa', 'Seienchin',
      'Kanku Dai', 'Sushiho', 'Garyu',
    ],
  },
  {
    style: 'Shorin-ryu',
    names: [
      'Naihanchi Shodan', 'Naihanchi Nidan', 'Naihanchi Sandan',
      'Pinan Shodan', 'Pinan Nidan', 'Pinan Sandan', 'Pinan Yondan', 'Pinan Godan',
      'Passai', 'Kusanku', 'Chinto', 'Gojushiho', 'Wanshu',
    ],
  },
  {
    style: 'Gosoku-ryu (kata klasyczne)',
    names: ['Heian Shodan', 'Heian Nidan', 'Heian Sandan', 'Heian Yondan', 'Heian Godan', 'Bassai Dai', 'Jion', 'Kanku Dai'],
  },
]

export const KATA_NAME_SET = new Set(KATA_GROUPS.flatMap((group) => group.names))
