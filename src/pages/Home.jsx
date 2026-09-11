import React from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'

export default function Home() {
  const competitions = db.getCompetitions().filter((c) => c.active)
  const news = db.getNews().slice(0, 3)

  return (
    <div>
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">International Karate Association Poland</span>
            <h1>Jeden system do obsługi zawodów IKA Poland</h1>
            <p>
              Rejestracja klubów i zawodników, informacja na żywo dla rodziców,
              telebim, drabinki kumite i tablice punktowe przy tatami.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/rejestracja">Zarejestruj się</Link>
              <Link className="btn btn-outline" to="/logowanie">Zaloguj</Link>
            </div>
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

        {news.length > 0 && (
          <section className="section-wrap">
            <div className="section-title"><span className="eyebrow">Aktualności</span><h2>Ważne informacje</h2></div>
            <div className="home-mini-list">{news.map((item) => <article key={item.id}><small>{item.date} {item.important ? '• WAŻNE' : ''}</small><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>
            <Link className="link-more" to="/aktualnosci">Wszystkie aktualności →</Link>
          </section>
        )}

        <section className="section-wrap">
          <div className="section-title">
            <span className="eyebrow">Konkurencje</span>
            <h2>Katalog IKA Poland</h2>
            <p>Administrator może włączać, wyłączać i dodawać konkurencje zależnie od regulaminu konkretnego turnieju.</p>
          </div>
          <div className="competition-grid">
            {competitions.map((competition) => (
              <article className="competition-card" key={competition.id}>
                <span>{competition.group}</span>
                <h3>{competition.name}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section-wrap feature-strip">
          <div><strong>1</strong><h3>Konto i klub</h3><p>Rejestracja przez e-mail i hasło, następnie własny profil klubu.</p></div>
          <div><strong>2</strong><h3>Informacja LIVE</h3><p>Rodzic widzi tatami, przewidywany start i liczbę walk pozostałych do wejścia zawodnika.</p></div>
          <div><strong>3</strong><h3>Drabinka kumite</h3><p>Przed walką monitor pokazuje drabinkę, a podczas walki automatycznie przełącza się na tablicę.</p></div>
          <div><strong>4</strong><h3>Klasyfikacja LIVE</h3><p>Kluby są klasyfikowane medalowo: najpierw złote, potem srebrne i brązowe. Punkty klubowe: złoto 6, srebro 4, brąz 2.</p></div>
        </section>
      </main>
      <footer className="footer">IKA Poland — System Zawodów • ETAP 31</footer>
    </div>
  )
}
