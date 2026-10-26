import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'
import { useLanguage } from '../lib/I18nContext.jsx'

export default function Home() {
  const news = db.getNews().slice(0, 3)
  const { language } = useLanguage()
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [])
  const en = language === 'en'
  const steps = en ? [
    ['Register club','Create a club account with email and password.'],
    ['Add athletes','Complete athlete data and photos for your club.'],
    ['Choose event','See active events and the registration deadline.'],
    ['Submit entries','The system shows only categories matching age and gender.'],
  ] : [
    ['Zarejestruj klub','Załóż konto klubowe przez e-mail i hasło.'],
    ['Dodaj zawodników','Uzupełnij dane i zdjęcia zawodników swojego klubu.'],
    ['Wybierz zawody','Zobacz aktywne zawody oraz termin zakończenia zgłoszeń.'],
    ['Wyślij zgłoszenia','System pokaże zawodnikowi tylko kategorie zgodne z wiekiem i płcią.'],
  ]
  return <div><PublicHeader /><main>
    <section className="hero club-landing-hero"><div className="hero-copy"><span className="eyebrow">International Karate Association Poland</span><h1>{en ? 'Official IKA Poland competition registration website' : 'Oficjalna strona zgłoszeń na zawody IKA Poland'}</h1><p>{en ? 'Clubs create accounts, add athletes and enter them into active competitions. During the event, the website also provides LIVE information, brackets and results.' : 'Kluby rejestrują konto, dodają swoich zawodników i zgłaszają ich na aktywne zawody. W dniu zawodów strona udostępnia także informacje LIVE, drabinki i wyniki.'}</p><div className="hero-actions"><Link className="btn btn-primary club-main-register" to="/rejestracja">{en ? 'Register club' : 'Zarejestruj klub'}</Link><Link className="btn btn-outline" to="/logowanie">{en ? 'Login' : 'Zaloguj'}</Link></div><small className="club-landing-help">{en ? 'Already have a club account? Choose “Login”. New clubs start by creating an account.' : 'Masz już konto klubu? Wybierz „Zaloguj”. Nowy klub zaczyna od bezpłatnej rejestracji konta.'}</small></div><div className="hero-card"><div className="live-pill"><span /> SYSTEM LIVE</div><div className="hero-screen hero-screen-no-logo"><div><small>{en ? 'INFORMATION DURING THE EVENT' : 'INFORMACJE PODCZAS ZAWODÓW'}</small><h2>{en ? 'Live updates' : 'Na bieżąco'}</h2><p>Tatami • {en ? 'fights remaining • estimated start' : 'liczba walk • przewidywany start'}</p></div></div><div className="hero-time"><span>{en ? 'Tatami monitor' : 'Monitor przy tatami'}</span><strong>{en ? 'Bracket → result' : 'Drabinka → wynik'}</strong></div></div></section>
    <section className="section-wrap club-start-section"><div className="section-title"><span className="eyebrow">{en ? 'For clubs' : 'Dla klubów'}</span><h2>{en ? 'Register club and athletes' : 'Zgłoś klub i zawodników'}</h2><p>{en ? 'The public website is primarily for club registration, login and competition entries.' : 'Publiczna strona służy przede wszystkim klubom do rejestracji, logowania i wysyłania zgłoszeń na aktualne zawody IKA Poland.'}</p></div><div className="club-start-grid">{steps.map((step,i)=><article key={step[0]}><strong>{i+1}</strong><h3>{step[0]}</h3><p>{step[1]}</p></article>)}</div><div className="club-start-actions"><Link className="btn btn-primary" to="/rejestracja">{en ? 'Register club' : 'Zarejestruj klub'}</Link><Link className="btn btn-outline club-light-outline" to="/logowanie">{en ? 'Club login' : 'Zaloguj do strefy klubu'}</Link></div></section>
    {news.length > 0 && <section className="section-wrap club-home-news"><div className="section-title"><span className="eyebrow">{en ? 'News' : 'Aktualności'}</span><h2>{en ? 'Important information for clubs' : 'Ważne informacje dla klubów'}</h2></div><div className="home-mini-list">{news.map((item)=><article key={item.id}><small>{item.date} {item.important ? '• WAŻNE' : ''}</small><strong>{item.title}</strong><p>{item.body}</p></article>)}</div></section>}
  </main><footer className="footer"><span className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></span> • ETAP 67</footer></div>
}
