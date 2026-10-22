import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'ika_language_v1'

const messages = {
  pl: {
    systemName: 'System Zawodów',
    news: 'Aktualności',
    athleteZone: 'Strefa zawodnika',
    rankingsLive: 'Klasyfikacja LIVE',
    screen: 'Telebim',
    organizer: 'Organizator',
    clubEntries: 'Zgłoszenia klubu',
    loginClub: 'Zaloguj klub',
    home: 'Strona główna',
    events: 'Zawody',
    athletes: 'Zawodnicy',
    myEntries: 'Moje zgłoszenia',
    logout: 'Wyloguj',
    organizerPanel: 'Panel organizatora',
    clubPanel: 'Panel klubu',
    athletePreview: 'Podgląd zawodnika',
    openScreen: 'Otwórz telebim',
    scheduled: 'Zaplanowana',
    called: 'Przygotuj się',
    active: 'Trwa teraz',
    done: 'Zakończona',
  },
  en: {
    systemName: 'Competition System',
    news: 'News',
    athleteZone: 'Athlete zone',
    rankingsLive: 'LIVE ranking',
    screen: 'Display',
    organizer: 'Organizer',
    clubEntries: 'Club entries',
    loginClub: 'Club login',
    home: 'Home',
    events: 'Events',
    athletes: 'Athletes',
    myEntries: 'My entries',
    logout: 'Log out',
    organizerPanel: 'Organizer panel',
    clubPanel: 'Club panel',
    athletePreview: 'Athlete preview',
    openScreen: 'Open display',
    scheduled: 'Scheduled',
    called: 'Get ready',
    active: 'Live now',
    done: 'Finished',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'pl'
  })

  const setLanguage = (next) => {
    const safe = next === 'en' ? 'en' : 'pl'
    setLanguageState(safe)
    localStorage.setItem(STORAGE_KEY, safe)
  }

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'pl'
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'pl' ? 'en' : 'pl'),
    t: (key) => messages[language]?.[key] || messages.pl[key] || key,
    pick: (pl, en) => language === 'en' ? en : pl,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}

export function LanguageSwitch({ compact = false }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={`language-switch ${compact ? 'language-switch-compact' : ''}`} aria-label="Language / Język">
      <button type="button" className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')} aria-pressed={language === 'pl'}>PL</button>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
    </div>
  )
}
