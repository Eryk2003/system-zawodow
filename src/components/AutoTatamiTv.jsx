import React, { useEffect, useMemo, useRef, useState } from 'react'
import { openTatamiTvWindow } from '../lib/tvWindow'

const MAT_KEY = 'ika_auto_tv_mat_v1'
const WINDOW_NAME = 'ika-auto-tatami-tv'

function getSavedMat(matCount) {
  const fallback = 'Tatami 1'
  try {
    const saved = localStorage.getItem(MAT_KEY)
    if (!saved) return fallback
    const match = saved.match(/^Tatami\s+(\d+)$/i)
    const number = Number(match?.[1] || 1)
    if (number < 1 || number > matCount) return fallback
    return `Tatami ${number}`
  } catch (_) {
    return fallback
  }
}

function sameScreen(a, b) {
  if (!a || !b) return false
  return a.availLeft === b.availLeft
    && a.availTop === b.availTop
    && a.availWidth === b.availWidth
    && a.availHeight === b.availHeight
}

function findExternalScreen(details) {
  if (!details?.screens?.length) return null
  const current = details.currentScreen
  const others = details.screens.filter((screen) => !sameScreen(screen, current))
  return others.find((screen) => screen.isInternal === false)
    || others.find((screen) => screen.isPrimary === false)
    || others[0]
    || null
}

function screenName(screen) {
  if (!screen) return 'brak drugiego ekranu'
  return screen.label || `${screen.width || screen.availWidth}×${screen.height || screen.availHeight}`
}

export default function AutoTatamiTv({ matCount = 1 }) {
  const mats = useMemo(
    () => Array.from({ length: Math.max(1, Number(matCount) || 1) }, (_, index) => `Tatami ${index + 1}`),
    [matCount],
  )
  const [selectedMat, setSelectedMat] = useState(() => getSavedMat(Math.max(1, Number(matCount) || 1)))
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState({ kind: 'off', title: 'AUTO TV wyłączony', text: 'Wybierz tatami i włącz tryb przed rozpoczęciem walk.' })
  const [screenCount, setScreenCount] = useState(() => (window.screen?.isExtended ? 2 : 1))
  const [permissionHelp, setPermissionHelp] = useState(false)
  const screenDetailsRef = useRef(null)
  const listenerRef = useRef(null)
  const tvWindowRef = useRef(null)
  const selectedMatRef = useRef(selectedMat)

  useEffect(() => {
    selectedMatRef.current = selectedMat
    try { localStorage.setItem(MAT_KEY, selectedMat) } catch (_) {}

    const popup = tvWindowRef.current
    if (popup && !popup.closed) {
      try {
        popup.location.replace(`/tatami/${encodeURIComponent(selectedMat)}`)
      } catch (_) {
        // Okno może być jeszcze w trakcie ładowania. Kolejne odświeżenie stanu je zsynchronizuje.
      }
    }
  }, [selectedMat])

  useEffect(() => {
    if (mats.includes(selectedMat)) return
    setSelectedMat(mats[0])
  }, [mats, selectedMat])

  const tvUrl = (mat = selectedMatRef.current) => `${window.location.origin}/tatami/${encodeURIComponent(mat)}`

  const placeWindow = (popup, targetScreen) => {
    if (!popup || popup.closed || !targetScreen) return false
    try {
      popup.location.replace(tvUrl())
    } catch (_) {}

    const left = Number(targetScreen.availLeft ?? targetScreen.left ?? 0)
    const top = Number(targetScreen.availTop ?? targetScreen.top ?? 0)
    const width = Math.max(640, Number(targetScreen.availWidth || targetScreen.width || 1280))
    const height = Math.max(480, Number(targetScreen.availHeight || targetScreen.height || 720))

    try { popup.moveTo(left, top) } catch (_) {}
    try { popup.resizeTo(width, height) } catch (_) {}
    try { popup.focus() } catch (_) {}
    window.setTimeout(() => {
      try { popup.moveTo(left, top) } catch (_) {}
      try { popup.resizeTo(width, height) } catch (_) {}
    }, 250)
    return true
  }

  const openStandbyWindow = (targetScreen = null) => {
    const existing = tvWindowRef.current
    if (existing && !existing.closed) {
      if (targetScreen) placeWindow(existing, targetScreen)
      return existing
    }

    const width = targetScreen ? Math.max(640, Number(targetScreen.availWidth || targetScreen.width || 1280)) : 560
    const height = targetScreen ? Math.max(480, Number(targetScreen.availHeight || targetScreen.height || 720)) : 320
    const left = targetScreen ? Number(targetScreen.availLeft ?? targetScreen.left ?? 0) : Math.max(0, window.screenX + 40)
    const top = targetScreen ? Number(targetScreen.availTop ?? targetScreen.top ?? 0) : Math.max(0, window.screenY + 40)
    const features = `popup=yes,left=${left},top=${top},width=${width},height=${height}`
    const popup = window.open(tvUrl(), WINDOW_NAME, features)
    if (!popup) return null
    tvWindowRef.current = popup
    if (targetScreen) placeWindow(popup, targetScreen)
    else window.setTimeout(() => { try { window.focus() } catch (_) {} }, 200)
    return popup
  }

  const syncScreens = (details) => {
    if (!details) return
    setScreenCount(details.screens?.length || 1)
    const external = findExternalScreen(details)
    const popup = tvWindowRef.current

    if (external) {
      if (!popup || popup.closed) {
        setStatus({
          kind: 'warning',
          title: 'Telewizor wykryty',
          text: `${screenName(external)} jest podłączony. Kliknij „Otwórz TV ponownie”, ponieważ przeglądarka nie może sama utworzyć zamkniętego okna.`,
        })
        return
      }
      placeWindow(popup, external)
      setStatus({
        kind: 'ok',
        title: `${selectedMatRef.current} → TV HDMI`,
        text: `Drugi ekran wykryty: ${screenName(external)}. Wszystkie kategorie uruchamiane na ${selectedMatRef.current} będą pokazywane w tym oknie TV.`,
      })
      return
    }

    setStatus({
      kind: 'waiting',
      title: 'Czekam na telewizor HDMI',
      text: `AUTO TV jest aktywne dla ${selectedMatRef.current}. Podłącz HDMI i wybierz tryb rozszerzony (Mac: Monitory → Rozszerz; Windows: Win+P → Rozszerz).`,
    })
  }

  const detachScreenListener = () => {
    const details = screenDetailsRef.current
    const listener = listenerRef.current
    if (details && listener) {
      try { details.removeEventListener('screenschange', listener) } catch (_) {}
    }
    listenerRef.current = null
    screenDetailsRef.current = null
  }

  const attachScreenDetails = (details, popup) => {
    detachScreenListener()
    screenDetailsRef.current = details
    const external = findExternalScreen(details)
    if (external) placeWindow(popup, external)

    const listener = () => syncScreens(details)
    listenerRef.current = listener
    details.addEventListener('screenschange', listener)
    setPermissionHelp(false)
    setEnabled(true)
    syncScreens(details)
  }

  const requestScreenAccess = async (popup) => {
    const details = await window.getScreenDetails()
    attachScreenDetails(details, popup)
  }

  const showPermissionFallback = (popup) => {
    // Brak zgody nie może zamykać telebimu podczas zawodów.
    // Zostawiamy okno TV otwarte i pozwalamy odblokować uprawnienie bez restartu systemu.
    tvWindowRef.current = popup
    setEnabled(true)
    setPermissionHelp(true)
    setScreenCount(window.screen?.isExtended ? 2 : 1)
    setStatus({
      kind: 'warning',
      title: 'TV otwarte — potrzebna zgoda do AUTO HDMI',
      text: window.screen?.isExtended
        ? 'Drugi ekran jest podłączony, ale przeglądarka nie pozwala jeszcze automatycznie przenieść na niego okna. Odblokuj „Zarządzanie oknami” i kliknij „Ponów wykrywanie”.'
        : 'Telebim został otwarty. Odblokuj „Zarządzanie oknami”, podłącz HDMI w trybie rozszerzonym i kliknij „Ponów wykrywanie”.',
    })
  }

  const launchFullscreenTv = async () => {
    const { ok, message } = await openTatamiTvWindow(selectedMatRef.current)
    setStatus({ kind: ok ? 'ok' : 'warning', title: ok ? 'TV uruchomione na ekranie zewnętrznym' : 'Ustawienia TV wymagają uwagi', text: message })
    if (!ok) setPermissionHelp(true)
  }

  const retryScreenAccess = async () => {
    const popup = openStandbyWindow()
    if (!popup) {
      setStatus({ kind: 'error', title: 'Okno TV zablokowane', text: 'Zezwól na wyskakujące okna dla Systemu Zawodów i spróbuj ponownie.' })
      return
    }
    if (!('getScreenDetails' in window)) {
      setStatus({ kind: 'warning', title: 'Tryb ręczny TV', text: 'Ta przeglądarka nie obsługuje automatycznego przenoszenia okien. Użyj Chrome/Edge albo dołączonego uruchamiacza systemowego, bez przeciągania okien.' })
      return
    }
    try {
      await requestScreenAccess(popup)
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        showPermissionFallback(popup)
        return
      }
      setStatus({ kind: 'error', title: 'Nie udało się wykryć ekranów', text: error?.message || 'Spróbuj ponownie po podłączeniu telewizora.' })
    }
  }

  const enableAutoTv = async () => {
    // Okno TV otwieramy NATYCHMIAST po kliknięciu użytkownika, zanim pojawi się
    // pytanie o zgodę na zarządzanie ekranami. Dzięki temu Chrome nie blokuje
    // późniejszego automatycznego przeniesienia okna na ekran HDMI.
    const popup = openStandbyWindow()
    if (!popup) {
      setEnabled(false)
      setStatus({ kind: 'error', title: 'Okno TV zablokowane', text: 'Zezwól na wyskakujące okna dla Systemu Zawodów i kliknij ponownie Włącz AUTO TV.' })
      return
    }

    if (!('getScreenDetails' in window)) {
      setEnabled(true)
      setStatus({
        kind: 'warning',
        title: 'Tryb zgodności',
        text: 'Ta przeglądarka nie obsługuje automatycznego wykrywania ekranów. Tablica TV została otwarta ręcznie. Do automatycznego przenoszenia użyj Chrome lub Edge z obsługą Window Management API i zezwól na zarządzanie oknami.',
      })
      return
    }

    try {
      await requestScreenAccess(popup)
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        showPermissionFallback(popup)
        return
      }
      setEnabled(true)
      setStatus({
        kind: 'warning',
        title: 'TV otwarte — AUTO HDMI chwilowo niedostępne',
        text: error?.message || 'Okno TV pozostaje otwarte. Możesz użyć go ręcznie i ponowić wykrywanie ekranów.',
      })
    }
  }

  const reopenTv = () => {
    const details = screenDetailsRef.current
    const external = findExternalScreen(details)
    const popup = openStandbyWindow(external)
    if (!popup) {
      setStatus({ kind: 'error', title: 'Okno TV zablokowane', text: 'Zezwól na wyskakujące okna w Chrome i spróbuj ponownie.' })
      return
    }
    if (details) syncScreens(details)
  }

  const disableAutoTv = () => {
    detachScreenListener()
    setEnabled(false)
    setPermissionHelp(false)
    const popup = tvWindowRef.current
    if (popup && !popup.closed) {
      try { popup.close() } catch (_) {}
    }
    tvWindowRef.current = null
    setStatus({ kind: 'off', title: 'AUTO TV wyłączony', text: 'Telebim nie będzie automatycznie przenoszony na drugi ekran.' })
  }

  useEffect(() => () => detachScreenListener(), [])

  return (
    <section className="panel-section auto-tv-panel">
      <div className="panel-section-head auto-tv-head">
        <div>
          <span className="eyebrow">Telebim HDMI</span>
          <h2>Automatyczny TV dla tatami</h2>
          <p>Przypisz ten laptop do tatami. Po jednorazowym włączeniu AUTO TV system wykryje drugi ekran w trybie rozszerzonym i przeniesie na niego tablicę tego tatami. Kolejne kategorie na tym samym tatami pojawią się na tym samym telewizorze automatycznie.</p>
        </div>
        <span className={`auto-tv-badge auto-tv-${status.kind}`}>{enabled ? 'AUTO TV AKTYWNE' : 'AUTO TV WYŁĄCZONE'}</span>
      </div>

      <div className="auto-tv-grid">
        <label>
          <span>Ten laptop obsługuje</span>
          <select value={selectedMat} onChange={(event) => setSelectedMat(event.target.value)} disabled={enabled}>
            {mats.map((mat) => <option value={mat} key={mat}>{mat}</option>)}
          </select>
          <small>Ustaw raz przed rozpoczęciem konkurencji na tym stanowisku.</small>
        </label>

        <div className={`auto-tv-status auto-tv-status-${status.kind}`}>
          <small>Status ekranów</small>
          <strong>{status.title}</strong>
          <span>{status.text}</span>
          <em>{screenCount > 1 ? `${screenCount} ekrany wykryte` : '1 ekran wykryty'}</em>
        </div>

        <div className="auto-tv-actions">
          <button className="btn btn-primary" type="button" onClick={launchFullscreenTv}>URUCHOM TV — PEŁNY EKRAN</button>
          {!enabled ? (
            <button className="btn btn-primary" type="button" onClick={enableAutoTv}>Włącz AUTO TV</button>
          ) : (
            <>
              {permissionHelp && <button className="btn btn-primary" type="button" onClick={retryScreenAccess}>Ponów wykrywanie</button>}
              <button className="btn btn-outline" type="button" onClick={reopenTv}>Otwórz TV ponownie</button>
              <button className="btn btn-ghost" type="button" onClick={disableAutoTv}>Wyłącz AUTO TV</button>
            </>
          )}
          <a className="btn btn-outline" href={`/tatami/${encodeURIComponent(selectedMat)}`} target="_blank" rel="noreferrer">Otwórz TV ręcznie</a>
        </div>
      </div>

      {permissionHelp && (
        <div className="auto-tv-permission-help">
          <strong>Jak odblokować AUTO TV w Chrome / Edge</strong>
          <ol>
            <li>Kliknij ikonę ustawień witryny po lewej stronie adresu strony.</li>
            <li>Otwórz <b>Ustawienia witryny</b>.</li>
            <li>Przy opcji <b>Zarządzanie oknami / Window management</b> wybierz <b>Zezwalaj</b>.</li>
            <li>Wróć do systemu i kliknij <b>Ponów wykrywanie</b>. Jeśli przeglądarka tego wymaga, odśwież stronę.</li>
          </ol>
          <small>Telebim pozostaje otwarty podczas tej operacji — nie trzeba przerywać zawodów.</small>
        </div>
      )}

      <div className="auto-tv-note auto-tv-mac-help"><strong>MacBook + telewizor:</strong> Wybierz na Macu <b>Ustawienia systemowe → Monitory → Rozszerz ekran</b> (nie Klonuj). W starszym Safari automatyczne otwarcie TV wymaga uruchamiacza systemowego z paczki, a nie przeciągania okna. Panel sędziego zostaje na MacBooku.</div>
      <div className="auto-tv-note">
        <strong>Windows:</strong> po podłączeniu HDMI wybierz <b>Win+P → Rozszerz</b>. Przy pierwszym uruchomieniu Chrome lub Edge musi mieć zgodę na <b>Zarządzanie oknami</b>. AUTO TV działa na stronie HTTPS (Vercel).
      </div>
    </section>
  )
}
