import React, { useEffect, useState } from 'react'
import { cloudSyncConfigured } from '../lib/cloudSync.js'

export default function CloudStatus() {
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    const ready = (event) => setConnected(Boolean(event?.detail?.enabled))
    window.addEventListener('ika:cloud-ready', ready)
    return () => window.removeEventListener('ika:cloud-ready', ready)
  }, [])
  if (!cloudSyncConfigured) return null
  return <span className={`cloud-status ${connected ? 'cloud-status-ok' : ''}`}>{connected ? 'Chmura LIVE' : 'Łączenie z chmurą…'}</span>
}
