import React, { useEffect, useState } from 'react'

const allowedImage = (logo) => typeof logo === 'string' && (
  /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(logo) ||
  /^https:\/\//i.test(logo)
)

export default function ClubLogo({ club, size = 'md' }) {
  const [failed, setFailed] = useState(false)
  const logo = club?.logo || ''
  useEffect(() => setFailed(false), [logo])
  const name = String(club?.shortName || club?.name || 'Klub')
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase() || 'K'
  return (
    <span className={`ika-club-logo ika-club-logo-${size}`} role="img" aria-label={`Logo klubu ${club?.name || name}`}>
      {allowedImage(logo) && !failed
        ? <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span aria-hidden="true">{initials}</span>}
    </span>
  )
}
