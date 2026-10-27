import React, { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'ika_language_v1'

const dictionary = {
  pl: {
    news: 'Aktualności', athleteZone: 'Strefa zawodnika', rankings: 'Klasyfikacja LIVE', scoreboard: 'Telebim',
    organizer: 'Organizator', clubEntries: 'Zgłoszenia klubu', clubLogin: 'Zaloguj klub', home: 'Strona główna',
    competitions: 'Zawody', athletes: 'Zawodnicy', myEntries: 'Moje zgłoszenia', logout: 'Wyloguj',
    organizerPanel: 'Panel organizatora', clubPanel: 'Panel klubu', athletePreview: 'Podgląd zawodnika', openScoreboard: 'Otwórz telebim',
    login: 'Logowanie', registerClub: 'Zarejestruj klub', email: 'Adres e-mail', password: 'Hasło', signIn: 'Zaloguj się',
    createAccount: 'Utwórz konto', ownerName: 'Imię i nazwisko właściciela konta', backHome: 'Wróć na stronę główną',
    noAccount: 'Nie masz konta?', haveAccount: 'Masz już konto?',
  },
  en: {
    news: 'News', athleteZone: 'Athlete zone', rankings: 'LIVE rankings', scoreboard: 'Scoreboard',
    organizer: 'Organizer', clubEntries: 'Club entries', clubLogin: 'Club login', home: 'Home',
    competitions: 'Events', athletes: 'Athletes', myEntries: 'My entries', logout: 'Log out',
    organizerPanel: 'Organizer panel', clubPanel: 'Club panel', athletePreview: 'Athlete lookup', openScoreboard: 'Open scoreboard',
    login: 'Login', registerClub: 'Register club', email: 'Email address', password: 'Password', signIn: 'Sign in',
    createAccount: 'Create account', ownerName: 'Account owner full name', backHome: 'Back to home',
    noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'pl' } catch { return 'pl' }
  })
  const setLanguage = (next) => {
    const safe = next === 'en' ? 'en' : 'pl'
    setLanguageState(safe)
    try { localStorage.setItem(STORAGE_KEY, safe) } catch {}
    document.documentElement.lang = safe
    window.dispatchEvent(new CustomEvent('ika:language', { detail: safe }))
  }
  const value = useMemo(() => ({ language, setLanguage, t: dictionary[language] }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)

export function LanguageSwitch({ compact = false }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={`language-switch ${compact ? 'compact' : ''}`} aria-label="Language / Język">
      <button type="button" className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')}>PL</button>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
    </div>
  )
}
