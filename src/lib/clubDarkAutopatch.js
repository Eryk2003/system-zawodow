(function () {
  const STYLE_ID = 'ika-club-dark-autopatch-style'
  const OBSERVER_KEY = '__ikaClubDarkObserver'

  const isClubRoute = () => {
    const p = window.location.pathname || ''
    return p.startsWith('/organizator/klub') || p.startsWith('/club') || p.includes('/organizator/klub/')
  }

  const parseRgb = (value) => {
    if (!value) return null
    const m = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (!m) return null
    return [Number(m[1]), Number(m[2]), Number(m[3])]
  }

  const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  const addStyle = () => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      body.ika-club-dark-route, body.ika-club-dark-route #root {
        background: #090c12 !important;
        color: #f4f7fb !important;
      }
      body.ika-club-dark-route main,
      body.ika-club-dark-route [role="main"] {
        background: linear-gradient(180deg, #090c12 0%, #0d121a 100%) !important;
        color: #f4f7fb !important;
      }
      body.ika-club-dark-route .ika-club-dark-surface {
        background: linear-gradient(180deg, #171d28 0%, #121823 100%) !important;
        color: #f4f7fb !important;
        border-color: #343d4f !important;
        box-shadow: none !important;
      }
      body.ika-club-dark-route .ika-club-dark-soft {
        background: #1c2330 !important;
        color: #eaf0f8 !important;
        border-color: #394354 !important;
      }
      body.ika-club-dark-route .ika-club-dark-surface *,
      body.ika-club-dark-route .ika-club-dark-soft * {
        border-color: inherit;
      }
      body.ika-club-dark-route h1,
      body.ika-club-dark-route h2,
      body.ika-club-dark-route h3,
      body.ika-club-dark-route h4,
      body.ika-club-dark-route strong,
      body.ika-club-dark-route label,
      body.ika-club-dark-route b {
        color: #ffffff !important;
      }
      body.ika-club-dark-route p,
      body.ika-club-dark-route span,
      body.ika-club-dark-route small,
      body.ika-club-dark-route li,
      body.ika-club-dark-route div {
        color: inherit;
      }
      body.ika-club-dark-route .ika-club-dark-muted,
      body.ika-club-dark-route .ika-club-dark-surface p,
      body.ika-club-dark-route .ika-club-dark-surface span,
      body.ika-club-dark-route .ika-club-dark-soft p,
      body.ika-club-dark-route .ika-club-dark-soft span {
        color: #c8d0df !important;
      }
      body.ika-club-dark-route input,
      body.ika-club-dark-route textarea,
      body.ika-club-dark-route select {
        background: #0f1520 !important;
        color: #ffffff !important;
        border: 1px solid #455063 !important;
        box-shadow: none !important;
      }
      body.ika-club-dark-route input::placeholder,
      body.ika-club-dark-route textarea::placeholder {
        color: #97a4b8 !important;
      }
      body.ika-club-dark-route input[type="file"] {
        color: #d9e2ef !important;
      }
      body.ika-club-dark-route input[type="file"]::file-selector-button {
        background: #1f2736 !important;
        color: #fff !important;
        border: 1px solid #4b5668 !important;
        border-radius: 10px;
        padding: 10px 14px;
        margin-right: 12px;
      }
      body.ika-club-dark-route button:not(.ika-keep-red),
      body.ika-club-dark-route a[role="button"]:not(.ika-keep-red) {
        border-color: #495465 !important;
      }
      body.ika-club-dark-route .ika-club-dark-button {
        background: #20293a !important;
        color: #fff !important;
        border: 1px solid #4d586b !important;
      }
      body.ika-club-dark-route .ika-club-dark-button-red,
      body.ika-club-dark-route .ika-club-dark-button-red * {
        background: #e1261c !important;
        color: #fff !important;
        border-color: #e1261c !important;
      }
      body.ika-club-dark-route img {
        border-color: #364051 !important;
      }
    `
    document.head.appendChild(style)
  }

  const darkenButtons = () => {
    const buttons = Array.from(document.querySelectorAll('button, a[role="button"], a'))
    buttons.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase()
      if (!text) return
      if (/zobacz zawody|wyślij zgłoszenia|zgloszenia|dodaj zawodnika|zarejestruj|zapisz|opublikuj/.test(text)) {
        el.classList.add('ika-club-dark-button-red', 'ika-keep-red')
      } else if (/moi zawodnicy|usuń logo|wybierz plik|edytuj|anuluj|powrót|powrot/.test(text)) {
        el.classList.add('ika-club-dark-button')
      }
    })
  }

  const darkenInputsAndChips = () => {
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      el.classList.add('ika-club-dark-soft')
    })
    document.querySelectorAll('main button, main a, main span, main div').forEach((el) => {
      const cs = getComputedStyle(el)
      const rgb = parseRgb(cs.backgroundColor)
      const text = (el.textContent || '').trim()
      if (!rgb) return
      const lum = luminance(rgb)
      const rect = el.getBoundingClientRect()
      if (lum > 0.80 && rect.width > 40 && rect.height > 20) {
        if (text && rect.width < 320 && rect.height < 80) el.classList.add('ika-club-dark-soft')
        else el.classList.add('ika-club-dark-surface')
      }
    })
  }

  const darkenLightSurfaces = () => {
    const candidates = Array.from(document.querySelectorAll('main section, main article, main div, main form'))
    candidates.forEach((el) => {
      const cs = getComputedStyle(el)
      const rgb = parseRgb(cs.backgroundColor)
      const rect = el.getBoundingClientRect()
      if (!rgb) return
      if (rect.width < 120 || rect.height < 36) return
      const lum = luminance(rgb)
      if (lum > 0.83) {
        el.classList.add(rect.height < 90 || rect.width < 360 ? 'ika-club-dark-soft' : 'ika-club-dark-surface')
      }
      if ((cs.borderColor && parseRgb(cs.borderColor) && luminance(parseRgb(cs.borderColor)) > 0.8) || cs.borderStyle !== 'none') {
        el.style.borderColor = '#364051'
      }
      if (['rgb(17, 24, 39)', 'rgb(31, 41, 55)', 'rgb(0, 0, 0)'].includes(cs.color)) {
        el.style.color = '#f4f7fb'
      }
    })
  }

  const darkenImageZone = () => {
    document.querySelectorAll('img').forEach((img) => {
      const rect = img.getBoundingClientRect()
      if (rect.width > 120 && rect.height > 120) {
        const parent = img.parentElement
        if (parent) parent.classList.add('ika-club-dark-surface')
        img.style.border = '1px solid #364051'
      }
    })
  }

  const applyPatch = () => {
    addStyle()
    const active = isClubRoute()
    document.body.classList.toggle('ika-club-dark-route', active)
    if (!active) return
    const rootMain = document.querySelector('main, [role="main"]')
    if (rootMain) rootMain.classList.add('ika-club-dark-scope')
    darkenLightSurfaces()
    darkenInputsAndChips()
    darkenButtons()
    darkenImageZone()
  }

  const hookNavigation = () => {
    if (window.__ikaClubDarkHooked) return
    window.__ikaClubDarkHooked = true
    const rerun = () => window.requestAnimationFrame(() => setTimeout(applyPatch, 40))
    const wrap = (name) => {
      const original = history[name]
      if (!original) return
      history[name] = function () {
        const result = original.apply(this, arguments)
        rerun()
        return result
      }
    }
    wrap('pushState')
    wrap('replaceState')
    window.addEventListener('popstate', rerun)
    window.addEventListener('load', rerun)
    document.addEventListener('DOMContentLoaded', rerun)
  }

  const startObserver = () => {
    if (window[OBSERVER_KEY]) return
    const observer = new MutationObserver(() => {
      if (!isClubRoute()) return
      applyPatch()
    })
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true })
    window[OBSERVER_KEY] = observer
  }

  hookNavigation()
  startObserver()
  applyPatch()
})()
