import React from 'react'

export default function AthleteAvatar({ athlete, large = false }) {
  const initials = `${athlete?.firstName?.[0] || ''}${athlete?.lastName?.[0] || ''}`.toUpperCase()
  return athlete?.photo ? (
    <img className={`athlete-avatar ${large ? 'athlete-avatar-large' : ''}`} src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} />
  ) : (
    <div className={`athlete-avatar athlete-avatar-fallback ${large ? 'athlete-avatar-large' : ''}`}>{initials || 'IKA'}</div>
  )
}
