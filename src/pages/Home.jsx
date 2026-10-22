import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'

export default function Home() {
  const news = db.getNews().slice(0, 3)

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
            <h1>Oficjalna strona zgłoszeń na zawody IKA Poland</h1>
            <p>
              Kluby rejestrują konto, dodają swoich zawodników i zgłaszają ich na aktywne zawody. W dniu zawodów strona udostępnia także informacje LIVE, drabinki i wyniki.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary club-main-register" to="/rejestracja">Zarejestruj klub</Link>
              <Link className="btn btn-outline" to="/logowanie">Zaloguj</Link>
            </div>
            <small className="club-landing-help">Masz już konto klubu? Wybierz „Zaloguj”. Nowy klub zaczyna od bezpłatnej rejestracji konta.</small>
          </div>
          <div className="hero-card">
            <div className="live-pill"><span /> SYSTEM LIVE</div>
            <div className="hero-screen hero-screen-no-logo">
              <div>
                <small>INFORMACJE PODCZAS ZAWODÓW</small>
                <h2>Na bieżąco</h2>
                <p>Tatami • liczba walk • przewidywany start</p>
              </div>
            </div>
            <div className="hero-time"><span>Monitor przy tatami</span><strong>Drabinka → wynik</strong></div>
          </div>
        </section>

        <section className="section-wrap club-start-section">
          <div className="section-title">
            <span className="eyebrow">Dla klubów</span>
            <h2>Zgłoś klub i zawodników</h2>
            <p>Publiczna strona służy przede wszystkim klubom do rejestracji, logowania i wysyłania zgłoszeń na aktualne zawody IKA Poland.</p>
          </div>
          <div className="club-start-grid">
            <article><strong>1</strong><h3>Zarejestruj klub</h3><p>Załóż konto klubowe przez e-mail i hasło.</p></article>
            <article><strong>2</strong><h3>Dodaj zawodników</h3><p>Uzupełnij dane i zdjęcia zawodników swojego klubu.</p></article>
            <article><strong>3</strong><h3>Wybierz zawody</h3><p>Zobacz aktywne zawody oraz termin zakończenia zgłoszeń.</p></article>
            <article><strong>4</strong><h3>Wyślij zgłoszenia</h3><p>System pokaże zawodnikowi tylko kategorie zgodne z wiekiem i płcią.</p></article>
          </div>
          <div className="club-start-actions">
            <Link className="btn btn-primary" to="/rejestracja">Zarejestruj klub</Link>
            <Link className="btn btn-outline club-light-outline" to="/logowanie">Zaloguj do strefy klubu</Link>
          </div>
        </section>

        {news.length > 0 && (
          <section className="section-wrap club-home-news">
            <div className="section-title"><span className="eyebrow">Aktualności</span><h2>Ważne informacje dla klubów</h2></div>
            <div className="home-mini-list">{news.map((item) => <article key={item.id}><small>{item.date} {item.important ? '• WAŻNE' : ''}</small><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>
            <Link className="link-more" to="/aktualnosci">Wszystkie aktualności →</Link>
          </section>
        )}

        <section className="section-wrap feature-strip club-public-features">
          <div><strong>1</strong><h3>Rejestracja klubu</h3><p>Klub zakłada konto przez e-mail i hasło, a następnie uzupełnia swój profil.</p></div>
          <div><strong>2</strong><h3>Zgłoszenia zawodników</h3><p>Klub dodaje własnych zawodników i zgłasza ich tylko do pasujących kategorii.</p></div>
          <div><strong>3</strong><h3>Informacja LIVE</h3><p>W dniu zawodów można sprawdzić tatami, szacowany start oraz przebieg konkurencji.</p></div>
          <div><strong>4</strong><h3>Obsługa zawodów</h3><p>Organizator korzysta z osobnych narzędzi do drabinek, sędziów, telebimów i wyników.</p></div>
        </section>
      </main>
      <footer className="footer">IKA Poland - strona zgłoszeń i obsługi zawodów • ETAP 63</footer>
    </div>
  )
}
