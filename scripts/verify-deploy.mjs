import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const fail = (message) => {
  console.error(`\n[IKA DEPLOY CHECK] BŁĄD: ${message}\n`)
  process.exit(1)
}
const read = (name) => {
  const file = path.join(root, name)
  if (!fs.existsSync(file)) fail(`Brakuje pliku ${name}.`)
  return fs.readFileSync(file, 'utf8')
}

let pkg
try { pkg = JSON.parse(read('package.json')) } catch { fail('package.json nie jest poprawnym JSON-em.') }
if (pkg?.name !== 'ika-poland-system-zawodow') fail('package.json ma nieprawidłową zawartość lub został podmieniony.')
if (typeof pkg?.scripts?.build !== 'string' || !pkg.scripts.build.includes('vite build')) fail('W package.json brakuje poprawnego skryptu build.')

let vercel
try { vercel = JSON.parse(read('vercel.json')) } catch { fail('vercel.json nie jest poprawnym JSON-em lub jest pusty.') }
if (vercel?.framework !== 'vite') fail('vercel.json nie wskazuje frameworka Vite.')
if (vercel?.outputDirectory !== 'dist') fail('vercel.json ma nieprawidłowy outputDirectory.')
if (!Array.isArray(vercel?.rewrites) || !vercel.rewrites.some((r) => r?.destination === '/index.html')) fail('vercel.json nie ma reguły SPA do /index.html.')

const vite = read('vite.config.js')
if (!vite.includes("from 'vite'") || !vite.includes("@vitejs/plugin-react") || !vite.includes('defineConfig')) {
  fail('vite.config.js ma nieprawidłową zawartość lub został podmieniony innym plikiem.')
}
if (/"framework"\s*:\s*"vite"/.test(vite)) fail('vite.config.js wygląda jak vercel.json - pliki zostały zamienione.')

const html = read('index.html')
if (!/<!doctype html>/i.test(html) || !html.includes('id="root"') || !html.includes('/src/main.jsx')) {
  fail('index.html ma nieprawidłową zawartość.')
}
if (read('package.json').includes('<!doctype html>')) fail('package.json został nadpisany przez index.html.')

console.log('[IKA DEPLOY CHECK] OK - pliki wdrożeniowe są poprawne.')
