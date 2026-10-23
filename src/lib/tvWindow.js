/**
 * IKA Poland — tryb oddzielnego ekranu TV dla paneli sedziowskich.
 * To okno jest otwierane synchronicznie w reakcji na klikniecie uzytkownika.
 * Window Management API (Chrome / Edge) sluzy tylko do opcjonalnego
 * ustawienia na ekranie zewnetrznym. Safari zachowuje tryb reczny.
 */

function findTvScreen(details) {
  const screens = Array.from(details?.screens || [])
  if (screens.length < 2) return null

  const current = details?.currentScreen
  const isCurrent = (screen) => {
    if (!current) return false
    if (screen === current) return true
    return screen.availLeft === current.availLeft
      && screen.availTop === current.availTop
      && screen.availWidth === current.availWidth
      && screen.availHeight === current.availHeight
  }
  const other = screens.filter((screen) => !isCurrent(screen))
  return other.find((screen) => screen.isInternal === false)
    || other.find((screen) => screen.isPrimary === false)
    || other[0]
    || null
}

function positionPopup(popup, screen) {
  if (!popup || popup.closed || !screen) return
  const left = Number(screen.availLeft ?? screen.left ?? 0)
  const top = Number(screen.availTop ?? screen.top ?? 0)
  const width = Math.max(640, Number(screen.availWidth || screen.width || 1280))
  const height = Math.max(480, Number(screen.availHeight || screen.height || 720))
  try { popup.moveTo(left, top) } catch (_) { /* przegladarka moze blokowac */ }
  try { popup.resizeTo(width, height) } catch (_) { /* przegladarka moze blokowac */ }
}

/**
 * Otwiera TYLKO tablice TV. Aktualny panel sedziego pozostaje na laptopie.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function openTatamiTvWindow(matName) {
  const mat = String(matName || 'Tatami 1')
  const tvUrl = `${window.location.origin}/tatami/${encodeURIComponent(mat)}`
  const name = `ika-tatami-tv-${mat.replace(/[^\w-]+/g, '-').toLowerCase()}`

  // Musi byc przed pierwszym await, inaczej blokada wyskakujacych okien.
  const popup = window.open(tvUrl, name, 'popup=yes,width=1000,height=700')
  if (!popup) {
    return {
      ok: false,
      message: 'Przeglądarka zablokowała okno TV. Zezwól na wyskakujące okna dla strony IKA Poland i kliknij ponownie.',
    }
  }

  let message = `Osobna tablica ${mat} jest otwarta. Ustaw na Macu: Monitory → Rozszerz ekran, przenieś okno tablicy na telewizor i włącz pełny ekran. Panel sędziego zostaje na laptopie.`

  if (typeof window.getScreenDetails === 'function') {
    try {
      // Chrome / Edge: uzytkownik sam wyraza zgode na zarzadzanie oknami.
      const details = await window.getScreenDetails()
      const tvScreen = findTvScreen(details)
      if (tvScreen) {
        positionPopup(popup, tvScreen)
        message = `Wykryto drugi ekran. Próba przeniesienia tablicy ${mat} na TV została wykonana. Sprawdź telewizor; jeśli okno nie przeszło, przenieś je ręcznie. Panel sędziego pozostaje na laptopie.`
      } else {
        message = `Tablica ${mat} jest otwarta. System widzi tylko jeden ekran: w ustawieniach Maca wybierz Rozszerz ekran (nie Klonuj), następnie przenieś okno na TV.`
      }
    } catch (error) {
      // Brak zgody NIE zamyka TV ani nie blokuje sterowania walka.
      message = `Tablica ${mat} jest otwarta. Automatyczne przenoszenie nie jest dostępne (${error?.name === 'NotAllowedError' ? 'brak zgody przeglądarki' : 'ograniczenie przeglądarki'}). Ustaw Rozszerz ekran i przenieś okno na telewizor ręcznie.`
    }
  }

  // Po otwarciu telebimu fokus moze wrocic na Panel Sedziego.
  window.setTimeout(() => { try { window.focus() } catch (_) {} }, 350)
  return { ok: true, message }
}
