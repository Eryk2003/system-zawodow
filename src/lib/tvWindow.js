/**
 * IKA Poland - otwieranie TV na ekranie zewnetrznym (Windows / macOS).
 * Chrome / Edge: Window Management API + request popup fullscreen.
 * W przegladarkach bez tego API NIE udajemy, ze przeniesienie sie udalo.
 * Wymaga trybu rozszerzonego pulpitu (nie klonowania).
 */
let knownScreens = null
let watchedScreens = null

function sameDisplay(a, b) {
  if (!a || !b) return false
  return a === b || (a.left === b.left && a.top === b.top
    && a.width === b.width && a.height === b.height)
}

function externalDisplay(details) {
  const screens = Array.from(details?.screens || [])
  if (screens.length < 2) return null
  const current = details.currentScreen
  const others = screens.filter((s) => !sameDisplay(s, current))
  return others.find((s) => s.isInternal === false)
    || others.find((s) => !s.isPrimary)
    || others[0]
    || null
}

function positionFeatures(screen) {
  // Wspolrzedne ekranow moga byc ujemne (TV po lewej/gorze laptopa).
  const left = Math.round(Number(screen?.availLeft ?? screen?.left ?? 0))
  const top = Math.round(Number(screen?.availTop ?? screen?.top ?? 0))
  const width = Math.max(640, Math.round(Number(screen?.availWidth ?? screen?.width ?? 1280)))
  const height = Math.max(480, Math.round(Number(screen?.availHeight ?? screen?.height ?? 720)))
  return { left, top, width, height }
}

function launch(mat, screen) {
  const tvUrl = `${window.location.origin}/tatami/${encodeURIComponent(mat)}`
  const name = `ika-pol-tatami-${mat.replace(/[^\w-]/g, '-').toLowerCase()}`
  const { left, top, width, height } = positionFeatures(screen)
  // 'fullscreen' jest wspierane tylko w wybranych konfiguracjach Chromium.
  // Gdy nie dziala, okno nadal otwiera sie na drugim ekranie i wypelnia
  // jego dostepny obszar. Przycisk "Pelny ekran" zostaje na telebimie.
  const options = `popup=yes,fullscreen=yes,left=${left},top=${top},width=${width},height=${height}`
  const popup = window.open(tvUrl, name, options)
  if (!popup) return null
  try { popup.moveTo(left, top) } catch (_) {}
  try { popup.resizeTo(width, height) } catch (_) {}
  try { window.focus() } catch (_) {}
  return popup
}

/**
 * Wywolywac WYŁĄCZNIE w reakcji na rzeczywiste klikniecie.
 * Pierwsze klikniecie moze wywolac zgode na zarzadzanie oknami - w takim
 * przypadku druga proba bywa konieczna z powodu blokady okien popup.
 */
export async function openTatamiTvWindow(matName) {
  const mat = String(matName || 'Tatami 1')
  if (typeof window.getScreenDetails !== 'function') {
    return {
      ok: false,
      message: 'Ta przeglądarka nie obsługuje automatycznego uruchamiania TV na drugim ekranie. Użyj Chrome/Edge z obsługą zarządzania oknami albo dołączonego uruchamiacza dla starszego Maca lub Windowsa. Nie trzeba przeciągać okien.',
    }
  }

  let screen = externalDisplay(knownScreens)
  if (!screen) {
    try {
      // Zgoda jest wymagana i nie da sie jej pominac z poziomu strony.
      const details = await window.getScreenDetails()
      knownScreens = details
      screen = externalDisplay(details)
      if (details && watchedScreens !== details) {
        details.addEventListener('screenschange', () => { knownScreens = null })
        watchedScreens = details
      }
    } catch (error) {
      return {
        ok: false,
        message: error?.name === 'NotAllowedError'
          ? 'Aby automatycznie uruchomić TV, zezwól stronie IKA Poland na „Zarządzanie oknami”. Potem kliknij „URUCHOM TV” ponownie. Nie wyłączaj telebimu podczas zawodów.'
          : `Nie udało się odczytać ekranów (${error?.message || 'błąd przeglądarki'}). Sprawdź HDMI oraz uprawnienie zarządzania oknami.`,
      }
    }
  }

  if (!screen) {
    return {
      ok: false,
      message: 'Wykryto tylko jeden ekran. Wyłącz klonowanie i ustaw tryb „Rozszerz” (Windows: Win+P; Mac: Monitory). Potem kliknij „URUCHOM TV” ponownie.',
    }
  }

  const popup = launch(mat, screen)
  if (!popup) {
    return {
      ok: false,
      message: 'Drugi ekran został wykryty, ale przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna dla IKA Poland i kliknij „URUCHOM TV” ponownie. Nie musisz niczego przeciągać.',
    }
  }
  return {
    ok: true,
    message: `Uruchomiono tablicę ${mat} na ekranie zewnętrznym. W obsługiwanym Chrome/Edge telebim otwiera się automatycznie na pełnym ekranie; jeśli przeglądarka zablokowała sam pełny ekran, użyj przycisku „Pełny ekran” na telebimie (bez przeciągania okna). Panel sędziego pozostał na laptopie.`,
  }
}
