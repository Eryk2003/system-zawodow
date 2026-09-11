import React, { useEffect, useState } from 'react'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'

export default function NewsPage() {
  const [items, setItems] = useState(() => db.getNews())

  useEffect(() => {
    const refresh = () => setItems(db.getNews())
    window.addEventListener('storage', refresh)
    window.addEventListener('ika:data', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ika:data', refresh)
    }
  }, [])

  return (
    <div>
      <PublicHeader />
      <main className="public-page news-page">
        <section className="lookup-hero">
          <span className="eyebrow">Komunikaty IKA Poland</span>
          <h1>Aktualności i ważne informacje</h1>
          <p>W jednym miejscu znajdują się komunikaty organizatora i najważniejsze informacje dotyczące zawodów.</p>
        </section>
        {!items.length ? (
          <div className="empty-state"><div className="empty-icon">i</div><h3>Brak aktualności</h3><p>Nowe komunikaty pojawią się tutaj po publikacji przez organizatora.</p></div>
        ) : (
          <section className="news-list">
            {items.map((item) => (
              <article className={`news-card ${item.important ? 'news-important' : ''}`} key={item.id}>
                <div className="news-meta"><span>{item.important ? 'WAŻNE' : 'AKTUALNOŚĆ'}</span><time>{item.date || ''}</time></div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
