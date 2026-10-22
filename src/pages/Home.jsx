import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'
import { useLanguage } from '../lib/LanguageContext.jsx'

export default function Home() {
  const news = db.getNews().slice(0, 3)
  const { pick } = useLanguage()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <div>
      <PublicHeader />
      <main>
        <section className="hero club-landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">International Karate Association Poland</span>
            <h1>{pick('Oficjalna strona zgłoszeń na zawody IKA Poland', 'Official IKA Poland competition registration website')}</h1>
            <p>{pick(
              'Kluby rejestrują konto, dodają swoich zawodników i zgłaszają ich na aktywne zawody. W dniu zawodów strona udostępnia także informacje LIVE, drabinki i wyniki.',
              'Clubs create an account, add athletes and enter them into active competitions. On competition day the website also provides LIVE information, brackets and results.',
            )}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary club-main-register" to="/rejestracja">{pick('Zarejestruj klub', 'Register club')}</Link>
              <Link className="btn btn-outline" to="/logowanie">{pick('Zaloguj', 'Log in')}</Link>
            </div>
            <small className="club-landing-help">{pick(
              'Masz już konto klubu? Wybierz „Zaloguj”. Nowy klub zaczyna od bezpłatnej rejestracji konta.',
              'Already have a club account? Choose “Log in”. A new club starts by registering an account.',
            )}</small>
          </div>
          <div className="hero-card">
            <div className="live-pill"><span /> SYSTEM LIVE</div>
            <div className="hero-screen hero-screen-no-logo">
              <div>
                <small>{pick('INFORMACJE PODCZAS ZAWODÓW', 'COMPETITION-DAY INFORMATION')}</small>
                <h2>{pick('Na bieżąco', 'Live updates')}</h2>
                <p>{pick('Tatami • liczba walk • przewidywany start', 'Tatami • fights remaining • estimated start')}</p>
              </div>
            </div>
            <div className="hero-time"><span>{pick('Monitor przy tatami', 'Tatami display')}</span><strong>{pick('Drabinka → wynik', 'Bracket → result')}</strong></div>
          </div>
        </section>

        <section className="section-wrap club-start-section">
          <div className="section-title">
            <span className="eyebrow">{pick('Dla klubów', 'For clubs')}</span>
            <h2>{pick('Zgłoś klub i zawodników', 'Register your club and athletes')}</h2>
            <p>{pick(
              'Publiczna strona służy przede wszystkim klubom do rejestracji, logowania i wysyłania zgłoszeń na aktualne zawody IKA Poland.',
              'The public website is primarily used by clubs to register, log in and submit entries for current IKA Poland events.',
            )}</p>
          </div>
          <div className="club-start-grid">
            <article><strong>1</strong><h3>{pick('Zarejestruj klub', 'Register club')}</h3><p>{pick('Załóż konto klubowe przez e-mail i hasło.', 'Create a club account using email and password.')}</p></article>
            <article><strong>2</strong><h3>{pick('Dodaj zawodników', 'Add athletes')}</h3><p>{pick('Uzupełnij dane i zdjęcia zawodników swojego klubu.', 'Add details and photos for your club athletes.')}</p></article>
            <article><strong>3</strong><h3>{pick('Wybierz zawody', 'Choose event')}</h3><p>{pick('Zobacz aktywne zawody oraz termin zakończenia zgłoszeń.', 'See active events and the registration deadline.')}</p></article>
            <article><strong>4</strong><h3>{pick('Wyślij zgłoszenia', 'Submit entries')}</h3><p>{pick('System pokaże zawodnikowi tylko kategorie zgodne z wiekiem i płcią.', 'The system shows only categories matching the athlete’s age and gender.')}</p></article>
          </div>
          <div className="club-start-actions">
            <Link className="btn btn-primary" to="/rejestracja">{pick('Zarejestruj klub', 'Register club')}</Link>
            <Link className="btn btn-outline club-light-outline" to="/logowanie">{pick('Zaloguj do strefy klubu', 'Log in to club area')}</Link>
          </div>
        </section>

        {news.length > 0 && (
          <section className="section-wrap club-home-news">
            <div className="section-title"><span className="eyebrow">{pick('Aktualności', 'News')}</span><h2>{pick('Ważne informacje dla klubów', 'Important information for clubs')}</h2></div>
            <div className="home-mini-list">{news.map((item) => <article key={item.id}><small>{item.date} {item.important ? `• ${pick('WAŻNE', 'IMPORTANT')}` : ''}</small><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>
            <Link className="link-more" to="/aktualnosci">{pick('Wszystkie aktualności →', 'All news →')}</Link>
          </section>
        )}

        <section className="section-wrap feature-strip club-public-features">
          <div><strong>1</strong><h3>{pick('Rejestracja klubu', 'Club registration')}</h3><p>{pick('Klub zakłada konto przez e-mail i hasło, a następnie uzupełnia swój profil.', 'The club creates an account using email and password, then completes its profile.')}</p></div>
          <div><strong>2</strong><h3>{pick('Zgłoszenia zawodników', 'Athlete entries')}</h3><p>{pick('Klub dodaje własnych zawodników i zgłasza ich tylko do pasujących kategorii.', 'The club adds its own athletes and enters them only in eligible categories.')}</p></div>
          <div><strong>3</strong><h3>{pick('Informacja LIVE', 'LIVE information')}</h3><p>{pick('W dniu zawodów można sprawdzić tatami, szacowany start oraz przebieg konkurencji.', 'On competition day you can check tatami, estimated start and competition progress.')}</p></div>
          <div><strong>4</strong><h3>{pick('Obsługa zawodów', 'Competition operation')}</h3><p>{pick('Organizator korzysta z osobnych narzędzi do drabinek, sędziów, telebimów i wyników.', 'The organizer uses dedicated tools for brackets, judges, displays and results.')}</p></div>
        </section>
      </main>
      <footer className="footer">IKA Poland • ETAP 67</footer>
    </div>
  )
}
