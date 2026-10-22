import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { useLanguage } from '../lib/i18n.js'
import { db } from '../lib/demoStore'

export default function Home() {
  const news = db.getNews().slice(0, 3)
  const { t } = useLanguage()

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
            <h1>{t('heroTitle')}</h1>
            <p>
              {t('heroText')}
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary club-main-register" to="/rejestracja">{t('registerClub')}</Link>
              <Link className="btn btn-outline" to="/logowanie">{t('login')}</Link>
            </div>
            <small className="club-landing-help">{t('alreadyAccount')}</small>
          </div>
          <div className="hero-card">
            <div className="live-pill"><span /> SYSTEM LIVE</div>
            <div className="hero-screen hero-screen-no-logo">
              <div>
                <small>{t('liveInfo')}</small>
                <h2>{t('liveInfo')}</h2>
                <p>{t('liveInfoText')}</p>
              </div>
            </div>
            <div className="hero-time"><span>{t('scoreboard')}</span><strong>{t('liveRanking')}</strong></div>
          </div>
        </section>

        <section className="section-wrap club-start-section">
          <div className="section-title">
            <span className="eyebrow">{t('forClubs')}</span>
            <h2>{t('submitClubAthletes')}</h2>
            <p>{t('publicForClubs')}</p>
          </div>
          <div className="club-start-grid">
            <article><strong>1</strong><h3>{t('step1')}</h3><p>{t('step1Text')}</p></article>
            <article><strong>2</strong><h3>{t('step2')}</h3><p>{t('step2Text')}</p></article>
            <article><strong>3</strong><h3>{t('step3')}</h3><p>{t('step3Text')}</p></article>
            <article><strong>4</strong><h3>{t('step4')}</h3><p>{t('step4Text')}</p></article>
          </div>
          <div className="club-start-actions">
            <Link className="btn btn-primary" to="/rejestracja">{t('registerClub')}</Link>
            <Link className="btn btn-outline club-light-outline" to="/logowanie">{t('clubLogin')}</Link>
          </div>
        </section>

        {news.length > 0 && (
          <section className="section-wrap club-home-news">
            <div className="section-title"><span className="eyebrow">{t('news')}</span><h2>{t('importantInfo')}</h2></div>
            <div className="home-mini-list">{news.map((item) => <article key={item.id}><small>{item.date} {item.important ? (t('news') === 'News' ? '• IMPORTANT' : '• WAŻNE') : ''}</small><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>
            <Link className="link-more" to="/aktualnosci">{t('allNews')}</Link>
          </section>
        )}

        <section className="section-wrap feature-strip club-public-features">
          <div><strong>1</strong><h3>{t('step1')}</h3><p>{t('step1Text')}</p></div>
          <div><strong>2</strong><h3>{t('step4')}</h3><p>{t('step4Text')}</p></div>
          <div><strong>3</strong><h3>{t('liveInfo')}</h3><p>{t('liveInfoText')}</p></div>
          <div><strong>4</strong><h3>{t('eventOperations')}</h3><p>{t('eventOperationsText')}</p></div>
        </section>
      </main>
      <footer className="footer">IKA Poland - strona zgłoszeń i obsługi zawodów • ETAP 67</footer>
    </div>
  )
}
