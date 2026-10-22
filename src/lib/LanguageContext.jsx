import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'ika_language_v1'

const normalizeLanguage = (value) => value === 'en' ? 'en' : 'pl'

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY))
    } catch {
      return 'pl'
    }
  })

  const setLanguage = (next) => {
    const normalized = normalizeLanguage(next)
    setLanguageState(normalized)
    try { localStorage.setItem(STORAGE_KEY, normalized) } catch {}
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    isEnglish: language === 'en',
    tr: (pl, en) => language === 'en' ? en : pl,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage musi być użyty wewnątrz LanguageProvider.')
  return value
}
