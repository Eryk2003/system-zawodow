// ETAP 70: Tłumaczenie wszystkich widoków, także tekstów tworzonych dynamicznie.
// Nie modyfikuje danych w Supabase, nazw klubów, nazwisk ani struktury aplikacji.
import { UI_TRANSLATIONS } from './completeTranslations.js'

const LANGUAGE_KEY = 'ika_language_v1'
const ORIGINAL_TEXT = new WeakMap()
const RENDERED_TEXT = new WeakMap()
const ORIGINAL_ATTR = new WeakMap()
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt', 'data-tooltip']
const SKIP_TEXT_IN = 'script, style, code, pre, textarea, [contenteditable="true"], [data-no-i18n]'

function activeLanguage() {
  try { return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'pl' }
  catch { return 'pl' }
}

const ENGLISH_ERRORS_TO_PL = Object.freeze({
  'Invalid login credentials': 'Nieprawidłowy adres e-mail lub hasło.',
  'Email not confirmed': 'Adres e-mail nie został potwierdzony.',
  'User already registered': 'Konto z tym adresem e-mail już istnieje.',
  'Signup is disabled': 'Rejestracja jest obecnie wyłączona.',
  'Email rate limit exceeded': 'Przekroczono limit wiadomości e-mail. Spróbuj ponownie później.',
  'Failed to fetch': 'Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.',
  'Network request failed': 'Błąd połączenia z serwerem. Spróbuj ponownie.',
})

const dynamicRules = [
  [/^za około (\d+) min(?:ut)?$/i, (_, n) => `in approximately ${n} min`],
  [/^Za (\d+) dni$/, (_, n) => `In ${n} days`],
  [/^Za (\d+) dzień$/, (_, n) => `In ${n} day`],
  [/^(\d+) zawodników w klubie$/, (_, n) => `${n} club athletes`],
  [/^(\d+) zawodników$/, (_, n) => `${n} athletes`],
  [/^(\d+) zgłoszeń$/, (_, n) => `${n} entries`],
  [/^(\d+) kategorii$/, (_, n) => `${n} categories`],
  [/^(\d+) walk$/, (_, n) => `${n} bouts`],
  [/^(\d+) walki$/, (_, n) => `${n} bouts`],
  [/^Wiek zawodnika w dniu zawodów:\s*(\d+)$/, (_, n) => `Athlete age on event day: ${n}`],
  [/^Usunięto zgłoszenie:\s*(.*)$/i, (_, rest) => `Entry removed: ${rest}`],
  [/^Zgłoszono:\s*(.*)$/i, (_, rest) => `Registered: ${rest}`],
  [/^Zapisano (\d+) zawodników w kategorii „(.+)”\.\s*Harmonogram został przeliczony automatycznie\.$/, (_, n, name) => `Saved ${n} athletes in category “${name}”. Schedule recalculated automatically.`],
  [/^Zapisano (\d+) zawodników w kategorii „(.+)”\.$/, (_, n, name) => `Saved ${n} athletes in category “${name}”.`],
  [/^Zawodnik nie spełnia limitu wieku tej kategorii\.$/, () => 'The athlete does not meet this category’s age limit.'],
  [/^Usunąć klub „(.+)” razem ze wszystkimi zawodnikami i zgłoszeniami\? Istniejące drabinki zostaną wyczyszczone\.$/, (_, club) => `Delete club “${club}” along with all athletes and entries? Existing brackets will be cleared.`],
  [/^Czy na pewno nadać rolę ORGANIZATOR dla (.*?)\?$/, (_, email) => `Are you sure you want to grant ORGANIZER access to ${email}?`],
  [/^Czy na pewno odebrać rolę ORGANIZATOR dla (.*?)\?$/, (_, email) => `Are you sure you want to revoke ORGANIZER access from ${email}?`],
  [/^Nie udało się odczytać uprawnień z bazy \(.*\)\. Sprawdź funkcję ika_list_organizer_accounts oraz sesję logowania\.$/, () => `Could not read permissions from the database. Check the ika_list_organizer_accounts function and your session.`],
  [/^Usunąć kategorię „(.+)” wraz ze zgłoszeniami i drabinką\?$/, (_, name) => `Delete category “${name}” together with its entries and bracket?`],
  [/^Nie można usunąć konkurencji „(.+)”, ponieważ ma już utworzone kategorie\. Najpierw usuń jej kategorie\.$/, (_, name) => `Cannot remove discipline “${name}” because it has categories. Delete its categories first.`],
  [/^Usunięto konkurencję „(.+)” z zawodów\.$/, (_, name) => `Discipline “${name}” removed from the event.`],
  [/^Dodano konkurencję „(.+)” do zawodów\. Możesz wybrać kolejne\.$/, (_, name) => `Discipline “${name}” added to the event. You may add more.`],
  [/^Kategoria „(.+)” została dodana\. Teraz wybierz zawodników\.$/, (_, name) => `Category “${name}” created. Now select athletes.`],
  [/^Drabinka kategorii „(.+)” została wylosowana losowo\. Możesz losować ponownie albo przejść do obsługi zawodów\.$/, (_, name) => `Category “${name}” bracket drawn randomly. You can redraw or proceed to event operations.`],
  [/^Walka zakończona automatycznie - (.*?) wygrywa zgodnie z zasadami(.*)\. Wynik został zablokowany\.$/, (_, athlete, rest) => `Bout ended automatically - ${athlete} wins under the rules${rest}. The score is locked.`],
  [/^HANSOKU - walka zakończona\. (.*?) wygrywa, a wynik i kary tej walki zostały zablokowane\.$/, (_, athlete) => `HANSOKU - bout ended. ${athlete} wins; score and penalties are locked.`],
  [/^Tatami (\d+)$/, (_, n) => `Tatami ${n}`],
  [/^Chłopcy\s*(\d+[-–]\d+)\s*lat(.*)$/i, (_, years, rest) => `Boys aged ${years}${rest}`],
  [/^Dziewczęta\s*(\d+[-–]\d+)\s*lat(.*)$/i, (_, years, rest) => `Girls aged ${years}${rest}`],
  [/^Ustawiono (\d+) sędziów\.$/, (_, n) => `Set ${n} judges.`],
  [/^Jedna drabinka może mieć maksymalnie (\d+) zawodników\.$/, (_, n) => `A bracket can have at most ${n} athletes.`],
  [/^Wpisz oceny wszystkich (\d+) sędziów\.$/, (_, n) => `Enter scores from all ${n} judges.`],
  [/^Zawodnik\s*\+(\d+)\s*pkt$/, (_, n) => `Athlete +${n} pts`],
  [/^Klub\s*\+(\d+)\s*pkt$/, (_, n) => `Club +${n} pts`],
]

export function translateUiString(value, language = activeLanguage()) {
  if (typeof value !== 'string') return value
  if (language === 'pl') {
    const translated = ENGLISH_ERRORS_TO_PL[value.trim()]
    return translated === undefined ? value : value.replace(value.trim(), translated)
  }
  if (language !== 'en') return value
  // Preserve indentation and spaces in JSX text nodes.
  const m = value.match(/^(\s*)([\s\S]*?)(\s*)$/u)
  if (!m) return value
  const [, prefix, core, suffix] = m
  if (!core) return value
  const direct = UI_TRANSLATIONS[core]
  if (direct !== undefined) return prefix + direct + suffix
  for (const [pattern, handler] of dynamicRules) {
    const match = core.match(pattern)
    if (match) return prefix + handler(...match) + suffix
  }
  return value
}

function isTranslatableTextNode(node) {
  if (!node?.parentElement) return false
  return !node.parentElement.closest(SKIP_TEXT_IN)
}

function updateTextNode(node, language) {
  if (!isTranslatableTextNode(node)) return
  const value = node.nodeValue
  if (typeof value !== 'string' || !value.trim()) return

  const oldRendered = RENDERED_TEXT.get(node)
  if (!ORIGINAL_TEXT.has(node) || (oldRendered !== undefined && value !== oldRendered)) {
    ORIGINAL_TEXT.set(node, value)
  }
  const source = ORIGINAL_TEXT.get(node)
  const next = translateUiString(source, language)
  RENDERED_TEXT.set(node, next)
  if (value !== next) node.nodeValue = next
}

function updateAttributes(element, language) {
  if (!element?.getAttribute || element.closest('[data-no-i18n]')) return
  let origins = ORIGINAL_ATTR.get(element)
  if (!origins) { origins = new Map(); ORIGINAL_ATTR.set(element, origins) }
  for (const attr of ATTRIBUTES) {
    if (!element.hasAttribute(attr)) continue
    const current = element.getAttribute(attr)
    const state = origins.get(attr)
    const source = state && state.rendered === current ? state.source : current
    const next = translateUiString(source, language)
    origins.set(attr, { source, rendered: next })
    if (current !== next) element.setAttribute(attr, next)
  }
  // Native input buttons may carry UI text in a value attribute.
  if (element.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(element.type)) {
    const current = element.value
    const state = origins.get('value')
    const source = state && state.rendered === current ? state.source : current
    const next = translateUiString(source, language)
    origins.set('value', { source, rendered: next })
    if (current !== next) element.value = next
  }
}

function updateTree(node, language) {
  if (!node) return
  if (node.nodeType === 3) { updateTextNode(node, language); return }
  if (node.nodeType !== 1) return
  if (node.closest?.('[data-no-i18n]')) return
  updateAttributes(node, language)
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let current
  while ((current = walker.nextNode())) {
    if (current.nodeType === 3) updateTextNode(current, language)
    else updateAttributes(current, language)
  }
}

function startTranslator() {
  const root = document.getElementById('root')
  if (!root || root.dataset.ikaTranslationObserver === 'active') return
  root.dataset.ikaTranslationObserver = 'active'
  let language = activeLanguage()
  document.documentElement.lang = language

  const refresh = () => {
    language = activeLanguage()
    document.documentElement.lang = language
    updateTree(root, language)
    document.title = translateUiString('System Zawodów - IKA Poland', language)
  }

  // Handle UI updates made by React, including live bout state changes and overlays.
  const observer = new MutationObserver(records => {
    const affected = new Set()
    for (const item of records) {
      if (item.type === 'characterData') affected.add(item.target)
      else if (item.type === 'attributes') affected.add(item.target)
      else if (item.type === 'childList') {
        for (const node of item.addedNodes) affected.add(node)
      }
    }
    for (const node of affected) updateTree(node, language)
  })
  observer.observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: [...ATTRIBUTES, 'value'],
  })

  window.addEventListener('ika:language', refresh)
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_KEY) refresh()
  })
  // In case the site's language is changed via a legacy context in the same tab.
  window.addEventListener('focus', refresh)
  refresh()
}

// Browser dialogues are translated without changing the code's validation logic.
if (typeof window !== 'undefined') {
  const originalConfirm = window.confirm.bind(window)
  const originalAlert = window.alert.bind(window)
  const originalPrompt = window.prompt.bind(window)
  window.confirm = (message) => originalConfirm(translateUiString(String(message)))
  window.alert = (message) => originalAlert(translateUiString(String(message)))
  window.prompt = (message, defaultValue) => defaultValue === undefined
    ? originalPrompt(translateUiString(String(message)))
    : originalPrompt(translateUiString(String(message)), defaultValue)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTranslator, { once: true })
  } else startTranslator()
}
