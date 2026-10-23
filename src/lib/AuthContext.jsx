import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginAccount, logoutAccount, registerAccount } from './demoStore'
import { cloudSyncConfigured, refreshCloudSyncForSession, supabase } from './cloudSync'

const AuthContext = createContext(null)

export const TEMP_ORGANIZER_EMAIL = 'admin@ikapoland.demo'
export const TEMP_ORGANIZER_PASSWORD = 'IKA12345'
export const TEMP_ORGANIZER_EXPIRES_AT = new Date('2026-10-23T23:59:00+02:00').getTime()
export const isTemporaryOrganizerAvailable = () => Date.now() <= TEMP_ORGANIZER_EXPIRES_AT

const temporaryOrganizerUser = () => ({
  id: 'organizer_demo',
  email: TEMP_ORGANIZER_EMAIL,
  fullName: 'Administrator IKA Poland (TEST)',
  role: 'organizer',
  authProvider: 'temporary-test',
})

async function resolveSupabaseUser(authUser) {
  if (!authUser || !supabase) return null

  let role = 'club'
  let fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.fullName || authUser.email || 'Klub'

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name,role')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!error && profile) {
      role = profile.role === 'organizer' ? 'organizer' : 'club'
      fullName = profile.full_name || fullName
    }
  } catch {
    // Jeżeli profil chwilowo nie jest dostępny, konto pozostaje klubowe.
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName,
    role,
    authProvider: 'supabase',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let subscription = null

    const initialize = async () => {
      // W produkcji (Supabase skonfigurowany) źródłem prawdy jest Supabase Auth.
      // Lokalne konto demo pozostaje tylko do pracy offline/deweloperskiej.
      if (cloudSyncConfigured && supabase) {
        const localTest = getSession()
        if (localTest?.id === 'organizer_demo' && isTemporaryOrganizerAvailable()) {
          if (mounted) setUser(temporaryOrganizerUser())
          if (mounted) setLoading(false)
          return
        }
        if (localTest?.id === 'organizer_demo' && !isTemporaryOrganizerAvailable()) logoutAccount()

        try {
          const { data } = await supabase.auth.getSession()
          const cloudUser = await resolveSupabaseUser(data?.session?.user)
          if (mounted) setUser(cloudUser)
        } catch {
          if (mounted) setUser(null)
        }

        const result = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return
          resolveSupabaseUser(session?.user)
            .then((cloudUser) => {
              if (!mounted) return
              setUser(cloudUser)
              refreshCloudSyncForSession().catch(() => {})
            })
            .catch(() => {
              if (mounted) setUser(null)
            })
        })
        subscription = result?.data?.subscription || null
      } else {
        const local = getSession()
        if (mounted) setUser(local)
      }

      if (mounted) setLoading(false)
    }

    initialize()

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      register: async (payload) => {
        if (cloudSyncConfigured && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: payload.email.trim(),
            password: payload.password,
            options: {
              data: {
                full_name: payload.fullName.trim(),
                role: 'club',
              },
            },
          })

          if (error) throw new Error(error.message || 'Nie udało się utworzyć konta.')

          if (!data?.session) {
            const pending = new Error('Konto zostało utworzone. Potwierdź adres e-mail, a następnie zaloguj się.')
            pending.code = 'EMAIL_CONFIRMATION_REQUIRED'
            throw pending
          }

          logoutAccount()
          const next = await resolveSupabaseUser(data.session.user)
          setUser(next)
          await refreshCloudSyncForSession()
          return next
        }

        const next = registerAccount(payload)
        setUser(next)
        return next
      },
      login: async (payload) => {
        const normalizedEmail = payload.email.trim().toLowerCase()
        if (!cloudSyncConfigured && normalizedEmail === TEMP_ORGANIZER_EMAIL && payload.password === TEMP_ORGANIZER_PASSWORD) {
          if (!isTemporaryOrganizerAvailable()) throw new Error('Testowe konto organizatora wygasło 23.10.2026 o 23:59.')
          if (cloudSyncConfigured && supabase) {
            try { await supabase.auth.signOut() } catch {}
          }
          loginAccount({ email: TEMP_ORGANIZER_EMAIL, password: TEMP_ORGANIZER_PASSWORD })
          const next = temporaryOrganizerUser()
          setUser(next)
          return next
        }

        if (cloudSyncConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: payload.email.trim(), password: payload.password })
          if (error || !data?.user) throw new Error(error?.message || 'Nieprawidłowy e-mail lub hasło.')
          logoutAccount()
          const next = await resolveSupabaseUser(data.user)
          setUser(next)
          await refreshCloudSyncForSession()
          return next
        }

        const next = loginAccount(payload)
        setUser(next)
        return next
      },
      logout: async () => {
        if (cloudSyncConfigured && supabase) {
          try {
            await supabase.auth.signOut()
          } catch {
            // Czyścimy sesję UI niezależnie od chwilowego błędu sieci.
          }
        }
        logoutAccount()
        setUser(null)
        await refreshCloudSyncForSession().catch(() => {})
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
