import React, { useState } from 'react'
import ClubLogo from './ClubLogo.jsx'

// Convert uploaded images to a small, safe raster data URL. The existing club JSON
// synchronization stores the logo and the database publishes it with the club name.
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_LOGO_CHARS = 145000
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function prepareClubLogo(file) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Wybierz obraz JPG, PNG lub WebP.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Plik logo może mieć maksymalnie 5 MB.')

  const blobUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Nie udało się odczytać pliku graficznego.'))
      img.src = blobUrl
    })
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Nieprawidłowy obraz.')
    for (const size of [256, 192, 160, 128]) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Przeglądarka nie obsługuje przetwarzania obrazu.')
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
      const output = canvas.toDataURL('image/webp', 0.82)
      // Safari variants without WebP canvas support automatically return PNG.
      if (/^data:image\/(?:png|webp);base64,/i.test(output) && output.length <= MAX_LOGO_CHARS) return output
    }
    throw new Error('Nie udało się zmniejszyć logo. Wybierz prostszy obraz JPG lub PNG.')
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

export default function ClubLogoField({ value, onChange, disabled = false }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const logo = await prepareClubLogo(file)
      onChange(logo)
    } catch (err) {
      setError(err.message || 'Nie udało się wczytać logo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ika-club-logo-picker">
      <ClubLogo club={{ logo: value, name: 'Klub' }} size="lg" />
      <div className="ika-club-logo-picker-body">
        <strong>Logo klubu (opcjonalnie)</strong>
        <label className="ika-club-logo-upload">
          {loading ? 'Przetwarzanie logo…' : value ? 'Zmień logo' : 'Dodaj logo klubu'}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={loading || disabled} />
        </label>
        {value && <button type="button" className="ika-club-logo-remove" onClick={() => { setError(''); onChange('') }} disabled={loading || disabled}>Usuń logo</button>}
        <small>JPG, PNG lub WebP, maks. 5 MB. Logo zostanie automatycznie zmniejszone i pojawi się w klasyfikacji medalowej.</small>
        {error && <span className="ika-club-logo-error" role="alert">{error}</span>}
      </div>
    </div>
  )
}
