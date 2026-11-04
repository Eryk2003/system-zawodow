import React, { useMemo, useState } from 'react'
import AthleteAvatar from './AthleteAvatar'
import './ClubTournamentRegistration.css'

const normalize = value => String(value || '').trim().toLocaleLowerCase('pl')

export default function ClubTournamentRegistration({
  tournament, competitions = [], categories = [], athletes = [],
  closed = false, deadlineText = '', registrationMessage = '',
  isEligibleForCategory, athleteIsRegistered, categoryEntries, onToggle,
  onClose,
}) {
  const [competitionId, setCompetitionId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const competitionChoices = useMemo(() => competitions.filter(c =>
    categories.some(category => category.competitionId === c.id)
  ), [competitions, categories])
  const selectedCompetition = competitions.find(c => c.id === competitionId)
  const availableCategories = categories.filter(c => c.competitionId === competitionId)
  const selectedCategory = availableCategories.find(c => c.id === categoryId)
  const eligibleAthletes = useMemo(() => selectedCategory ? athletes.filter(a => isEligibleForCategory(a, selectedCategory)) : [], [athletes, selectedCategory, isEligibleForCategory])
  const visibleAthletes = eligibleAthletes.filter(a => normalize(`${a.firstName} ${a.lastName}`).includes(normalize(search)))
  const total = selectedCategory ? categoryEntries(selectedCategory).length : 0

  return <div className="ika-club-event-registration">
    <div className="ika-club-event-register-head">
      <div>
        <span className="eyebrow">Zgłoszenia na wybrane zawody</span>
        <h2>{tournament.name}</h2>
        <p>Wybierz konkurencję, następnie kategorię, a na końcu zawodników swojego klubu.</p>
      </div>
      <button className="btn btn-outline" type="button" onClick={onClose}>Zamknij zawody</button>
    </div>
    <div className={`ika-club-event-register-deadline ${closed ? 'is-closed' : ''}`}>
      <b>{closed ? 'Zapisy zakończone' : 'Zapisy otwarte'}</b>
      <span>{deadlineText}</span>
    </div>
    {registrationMessage && <p className="alert alert-success" role="status">{registrationMessage}</p>}
    {!competitionChoices.length ? <p className="alert alert-info">Organizator nie udostępnił jeszcze kategorii do zgłoszeń.</p> : <>
      <div className="ika-club-event-step">
        <div className="ika-club-event-step-title"><b>1</b><h3>Wybierz konkurencję</h3></div>
        <div className="ika-club-event-options">
          {competitionChoices.map(c => <button key={c.id} type="button"
            className={`ika-club-event-option ${competitionId === c.id ? 'selected' : ''}`}
            aria-pressed={competitionId === c.id}
            onClick={() => { setCompetitionId(c.id); setCategoryId(''); setSearch('') }}>
            <strong>{c.name}</strong><small>{categories.filter(cat => cat.competitionId === c.id).length} kategorii</small>
          </button>)}
        </div>
      </div>
      {competitionId && <div className="ika-club-event-step">
        <div className="ika-club-event-step-title"><b>2</b><h3>Wybierz kategorię – {selectedCompetition?.name}</h3></div>
        <div className="ika-club-event-options">
          {availableCategories.map(category => <button key={category.id} type="button"
            className={`ika-club-event-option ${categoryId === category.id ? 'selected' : ''}`}
            aria-pressed={categoryId === category.id}
            onClick={() => { setCategoryId(category.id); setSearch('') }}>
            <strong>{category.name}</strong><small>{categoryEntries(category).length} zgłoszeń</small>
          </button>)}
        </div>
      </div>}
      {selectedCategory && <div className="ika-club-event-step">
        <div className="ika-club-event-step-title"><b>3</b><h3>Wybierz zawodników</h3></div>
        <p className="ika-club-event-hint">{selectedCategory.name} · {total} zgłoszeń w kategorii. Widoczni są wyłącznie Twoi zawodnicy pasujący do wieku i płci.</p>
        <label className="ika-club-event-search">Znajdź zawodnika klubu
          <input type="search" placeholder="Wpisz imię lub nazwisko" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {!athletes.length ? <p className="alert alert-info">Nie masz jeszcze zawodników w klubie. Dodaj ich w sekcji „Moi zawodnicy”.</p>
        : !eligibleAthletes.length ? <p className="alert alert-info">Brak zawodników spełniających kryteria tej kategorii.</p>
        : !visibleAthletes.length ? <p className="alert alert-info">Nie znaleziono zawodnika.</p>
        : <div className="ika-club-event-athletes">
          {visibleAthletes.map(athlete => {
            const registered = athleteIsRegistered(athlete.id, selectedCategory)
            return <div className="ika-club-event-athlete" key={athlete.id}>
              <div className="athlete-cell"><AthleteAvatar athlete={athlete} />
                <div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.birthDate || 'Data urodzenia niepodana'}</small></div>
              </div>
              <div className="ika-club-event-athlete-actions">
                {registered && <span className="ika-club-event-registered">Zgłoszony</span>}
                <button type="button" disabled={closed} className={`btn btn-sm ${registered ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => onToggle(athlete, selectedCategory)}>
                  {closed ? 'Zapisy zakończone' : registered ? 'Usuń zgłoszenie' : 'Zgłoś'}
                </button>
              </div>
            </div>
          })}
        </div>}
      </div>}
    </>}
  </div>
}
