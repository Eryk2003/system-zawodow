import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ika_language_v1'

export const translations = {
  pl: {
    news: 'Aktualności', athleteZone: 'Strefa zawodnika', liveRanking: 'Klasyfikacja LIVE', scoreboard: 'Telebim', organizer: 'Organizator',
    clubEntries: 'Zgłoszenia klubu', loginClub: 'Zaloguj klub', home: 'Strona główna', competitions: 'Zawody', athletes: 'Zawodnicy', myEntries: 'Moje zgłoszenia', logout: 'Wyloguj',
    heroTitle: 'Oficjalna strona zgłoszeń na zawody IKA Poland', heroText: 'Kluby rejestrują konto, dodają swoich zawodników i zgłaszają ich na aktywne zawody. W dniu zawodów strona udostępnia także informacje LIVE, drabinki i wyniki.',
    registerClub: 'Zarejestruj klub', login: 'Zaloguj', alreadyAccount: 'Masz już konto klubu? Wybierz „Zaloguj”. Nowy klub zaczyna od bezpłatnej rejestracji konta.',
    forClubs: 'Dla klubów', submitClubAthletes: 'Zgłoś klub i zawodników', publicForClubs: 'Publiczna strona służy przede wszystkim klubom do rejestracji, logowania i wysyłania zgłoszeń na aktualne zawody IKA Poland.',
    step1: 'Zarejestruj klub', step1Text: 'Załóż konto klubowe przez e-mail i hasło.', step2: 'Dodaj zawodników', step2Text: 'Uzupełnij dane i zdjęcia zawodników swojego klubu.',
    step3: 'Wybierz zawody', step3Text: 'Zobacz aktywne zawody oraz termin zakończenia zgłoszeń.', step4: 'Wyślij zgłoszenia', step4Text: 'System pokaże zawodnikowi tylko kategorie zgodne z wiekiem i płcią.',
    clubLogin: 'Zaloguj do strefy klubu', importantInfo: 'Ważne informacje dla klubów', allNews: 'Wszystkie aktualności →', liveInfo: 'Informacja LIVE',
    liveInfoText: 'W dniu zawodów można sprawdzić tatami, szacowany start oraz przebieg konkurencji.', eventOperations: 'Obsługa zawodów', eventOperationsText: 'Organizator korzysta z osobnych narzędzi do drabinek, sędziów, telebimów i wyników.',
    newClub: 'Nowy klub', loginHeading: 'Logowanie', registerHeading: 'Zarejestruj klub', registerDesc: 'Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.',
    loginDesc: 'Kluby i organizator logują się tym samym formularzem. Uprawnienia są rozpoznawane automatycznie przez konto Supabase.', fullName: 'Imię i nazwisko właściciela konta', email: 'Adres e-mail', password: 'Hasło',
    minPassword: 'Minimum 6 znaków', createAccount: 'Utwórz konto', loginAction: 'Zaloguj się', wait: 'Proszę czekać…', haveAccount: 'Masz już konto?', noAccount: 'Nie masz konta?', backHome: 'Wróć na stronę główną',
    clubRegistrationZone: 'Strefa zgłoszeń klubów', clubZoneIntro: 'Zarejestrowany klub dodaje tutaj swoich zawodników, a następnie zgłasza ich na aktywne zawody IKA Poland.',
    firstLaunch: 'Pierwsze uruchomienie', createClubProfile: 'Utwórz profil klubu', clubProfileText: 'Ten krok wykonujesz tylko raz. Profil klubu służy do dodawania zawodników i wysyłania zgłoszeń na zawody IKA Poland.',
    clubFullName: 'Pełna nazwa klubu', clubShortName: 'Skrócona nazwa', city: 'Miasto', country: 'Kraj', federation: 'Federacja / organizacja narodowa', phone: 'Telefon', clubEmail: 'E-mail klubu', createClub: 'Utwórz klub',
    polish: 'PL', english: 'EN'
  },
  en: {
    news: 'News', athleteZone: 'Athlete zone', liveRanking: 'LIVE ranking', scoreboard: 'Scoreboard', organizer: 'Organizer',
    clubEntries: 'Club entries', loginClub: 'Club login', home: 'Home', competitions: 'Events', athletes: 'Athletes', myEntries: 'My entries', logout: 'Log out',
    heroTitle: 'Official IKA Poland competition registration website', heroText: 'Clubs create an account, add their athletes and register them for active competitions. On competition day the website also provides LIVE information, brackets and results.',
    registerClub: 'Register club', login: 'Log in', alreadyAccount: 'Already have a club account? Choose “Log in”. A new club starts with free account registration.',
    forClubs: 'For clubs', submitClubAthletes: 'Register your club and athletes', publicForClubs: 'The public website is primarily used by clubs to register, log in and submit entries for current IKA Poland competitions.',
    step1: 'Register club', step1Text: 'Create a club account using email and password.', step2: 'Add athletes', step2Text: 'Add the details and photos of your club athletes.',
    step3: 'Choose event', step3Text: 'View active competitions and the registration deadline.', step4: 'Submit entries', step4Text: 'The system only shows categories matching the athlete’s age and gender.',
    clubLogin: 'Log in to club zone', importantInfo: 'Important information for clubs', allNews: 'All news →', liveInfo: 'LIVE information',
    liveInfoText: 'On competition day you can check tatami, estimated start time and competition progress.', eventOperations: 'Competition operations', eventOperationsText: 'The organizer uses separate tools for brackets, judges, scoreboards and results.',
    newClub: 'New club', loginHeading: 'Login', registerHeading: 'Register club', registerDesc: 'Create a club account. After logging in you can add athletes and register them for competitions published by IKA Poland.',
    loginDesc: 'Clubs and organizers use the same login form. Permissions are recognized automatically by the Supabase account.', fullName: 'Account owner full name', email: 'Email address', password: 'Password',
    minPassword: 'Minimum 6 characters', createAccount: 'Create account', loginAction: 'Log in', wait: 'Please wait…', haveAccount: 'Already have an account?', noAccount: 'No account yet?', backHome: 'Back to home',
    clubRegistrationZone: 'Club registration zone', clubZoneIntro: 'A registered club adds its athletes here and then submits them to active IKA Poland competitions.',
    firstLaunch: 'First setup', createClubProfile: 'Create club profile', clubProfileText: 'You only do this once. The club profile is used to add athletes and submit entries for IKA Poland competitions.',
    clubFullName: 'Full club name', clubShortName: 'Short name', city: 'City', country: 'Country', federation: 'Federation / national organization', phone: 'Phone', clubEmail: 'Club email', createClub: 'Create club',
    polish: 'PL', english: 'EN'
  }
}

export function getLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'en' ? 'en' : 'pl'
}

export function setLanguage(language) {
  const next = language === 'en' ? 'en' : 'pl'
  localStorage.setItem(STORAGE_KEY, next)
  window.dispatchEvent(new CustomEvent('ika:language', { detail: next }))
}

export function useLanguage() {
  const [language, setCurrent] = useState(() => getLanguage())
  useEffect(() => {
    const onLanguage = (event) => setCurrent(event.detail === 'en' ? 'en' : 'pl')
    window.addEventListener('ika:language', onLanguage)
    return () => window.removeEventListener('ika:language', onLanguage)
  }, [])
  const t = (key) => translations[language]?.[key] ?? translations.pl[key] ?? key
  return { language, setLanguage, t }
}
