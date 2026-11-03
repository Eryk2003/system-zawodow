(function () {
  const STYLE_ID = 'ika-club-dark-autopatch-style-v2'
  const OBSERVER_KEY = '__ikaClubDarkObserverV2'

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
    const prev = document.getElementById('ika-club-dark-autopatch-style')
    if (prev) prev.remove()
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      html, body { background: #080b11; }
      body.ika-club-dark-route,
      body.ika-club-dark-route #root,
      body.ika-club-dark-route main,
      body.ika-club-dark-route [role="main"] {
        background: #080b11 !important;
        color: #f4f7fb !important;
      }
      body.ika-club-dark-route .ika-club-dark-force-page {
        background: #080b11 !important;
      }
      body.ika-club-dark-route .ika-club-dark-surface {
        background: linear-gradient(180deg, #161d28 0%, #111823 100%) !important;
        color: #f4f7fb !important;
        border: 1px solid #313b4c !important;
        box-shadow: none !important;
      }
      body.ika-club-dark-route .ika-club-dark-soft {
        background: #1c2330 !important;
        color: #eaf0f8 !important;
        border: 1px solid #394354 !important;
        box-shadow: none !important;
      }
      body.ika-club-dark-route .ika-club-dark-deep {
        background: #0b1018 !important;
        color: #f4f7fb !important;
        border: 1px solid #2e3848 !important;
        box-shadow: none !important;
      }
      body.ika-club-dark-route h1,
      body.ika-club-dark-route h2,
      body.ika-club-dark-route h3,
      body.ika-club-dark-route h4,
      body.ika-club-dark-route h5,
      body.ika-club-dark-route strong,
      body.ika-club-dark-route b,
      body.ika-club-dark-route label,
      body.ika-club-dark-route th,
      body.ika-club-dark-route thead,
      body.ika-club-dark-route .ika-club-dark-title {
        color: #ffffff !important;
      }
      body.ika-club-dark-route p,
      body.ika-club-dark-route span,
      body.ika-club-dark-route small,
      body.ika-club-dark-route li,
      body.ika-club-dark-route td,
      body.ika-club-dark-route div {
        color: inherit;
      }
      body.ika-club-dark-route .ika-club-dark-muted,
      body.ika-club-dark-route .ika-club-dark-soft p,
      body.ika-club-dark-route .ika-club-dark-soft span,
      body.ika-club-dark-route .ika-club-dark-surface p,
      body.ika-club-dark-route .ika-club-dark-surface span,
      body.ika-club-dark-route .ika-club-dark-deep p,
      body.ika-club-dark-route .ika-club-dark-deep span {
        color: #c8d0df !important;
      }
      body.ika-club-dark-route input,
      body.ika-club-dark-route textarea,
      body.ika-club-dark-route select,
      body.ika-club-dark-route option {
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
      body.ika-club-dark-route hr {
        border-color: #2f3949 !important;
      }
    `
    document.head.appendChild(style)
  }

  const markPageBackground = () => {
    document.documentElement.style.background = '#080b11'
    document.body.style.background = '#080b11'
    const root = document.getElementById('root')
    if (root) root.classList.add('ika-club-dark-force-page')
  }

  const darkenButtons = () => {
    const buttons = Array.from(document.querySelectorAll('button, a[role="button"], a'))
    buttons.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase()
      if (!text) return
      if (/zobacz zawody|wyślij zgłoszenia|wyslij zgloszenia|zgloszenia|dodaj zawodnika|zarejestruj|zapisz|opublikuj/.test(text)) {
        el.classList.add('ika-club-dark-button-red')
      } else if (/moi zawodnicy|usun logo|usuń logo|wybierz plik|edytuj|anuluj|powrót|powrot|wyloguj/.test(text)) {
        el.classList.add('ika-club-dark-button')
      }
    })
  }

  const isBigSurface = (rect) => rect.width > 260 && rect.height > 70
  const isMediumSurface = (rect) => rect.width > 120 && rect.height > 32

  const forceDarkOnMainLayout = () => {
    const main = document.querySelector('main, [role="main"]') || document.querySelector('#root > div')
    if (!main) return
    main.classList.add('ika-club-dark-force-page')
    const children = Array.from(main.children || [])
    children.forEach((el) => {
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return
      const rect = el.getBoundingClientRect()
      if (isBigSurface(rect)) el.classList.add('ika-club-dark-surface')
      else if (isMediumSurface(rect)) el.classList.add('ika-club-dark-deep')
    })
  }

  const darkenInputsAndChips = () => {
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      el.classList.add('ika-club-dark-soft')
    })
    document.querySelectorAll('main button, main a, main span, main div, main section, main article, main form').forEach((el) => {
      const cs = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      if (!isMediumSurface(rect)) return
      const bg = parseRgb(cs.backgroundColor)
      const color = parseRgb(cs.color)
      const text = (el.textContent || '').trim()
      if (bg && luminance(bg) > 0.80) {
        if (rect.width > 340 || rect.height > 120) el.classList.add('ika-club-dark-surface')
        else el.classList.add('ika-club-dark-soft')
      }
      if (color && luminance(color) < 0.35) {
        if (/strefa zgłoszeń klubów|logo klubu|zawody ika poland|akademia karate zazen/i.test(text)) {
          el.classList.add('ika-club-dark-title')
        } else {
          el.classList.add('ika-club-dark-muted')
        }
      }
    })
  }

  const darkenLightSurfaces = () => {
    const candidates = Array.from(document.querySelectorAll('main section, main article, main div, main form, main header'))
    candidates.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (!isMediumSurface(rect)) return
      const cs = getComputedStyle(el)
      const bg = parseRgb(cs.backgroundColor)
      if (!bg) {
        if (isBigSurface(rect)) el.classList.add('ika-club-dark-surface')
        return
      }
      const lum = luminance(bg)
      if (lum > 0.85) {
        el.classList.add(isBigSurface(rect) ? 'ika-club-dark-surface' : 'ika-club-dark-soft')
      } else if (lum > 0.15 && lum < 0.45 && isBigSurface(rect)) {
        el.classList.add('ika-club-dark-deep')
      }
    })
  }

  const darkenText = () => {
    document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main p, main span, main label, main strong, main small, main li, main div').forEach((el) => {
      const cs = getComputedStyle(el)
      const color = parseRgb(cs.color)
      if (!color) return
      const txt = (el.textContent || '').trim()
      if (!txt) return
      const lum = luminance(color)
      if (lum < 0.35) {
        if (el.matches('h1,h2,h3,h4,h5,strong,label')) {
          el.style.color = '#ffffff'
        } else {
          el.style.color = '#c8d0df'
        }
      }
    })
  }

  const darkenImageZone = () => {
    document.querySelectorAll('img').forEach((img) => {
      const rect = img.getBoundingClientRect()
      if (rect.width > 120 && rect.height > 120) {
        const parent = img.parentElement
        if (parent) parent.classList.add('ika-club-dark-deep')
        img.style.border = '1px solid #364051'
      }
    })
  }

  const applyPatch = () => {
    addStyle()
    const active = isClubRoute()
    document.body.classList.toggle('ika-club-dark-route', active)
    if (!active) return
    markPageBackground()
    forceDarkOnMainLayout()
    darkenLightSurfaces()
    darkenInputsAndChips()
    darkenText()
    darkenButtons()
    darkenImageZone()
  }

  const hookNavigation = () => {
    if (window.__ikaClubDarkHookedV2) return
    window.__ikaClubDarkHookedV2 = true
    const rerun = () => window.requestAnimationFrame(() => setTimeout(applyPatch, 50))
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
