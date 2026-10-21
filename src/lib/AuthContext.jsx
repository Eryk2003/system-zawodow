import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginAccount, logoutAccount, registerAccount } from './demoStore'
import { cloudSyncConfigured, supabase } from './cloudSync'

const AuthContext = createContext(null)
const ORGANIZER_EMAIL = 'admin@ikapoland.demo'

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

function mapSupabaseUser(authUser) {
  if (!authUser) return null
  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName:
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.fullName ||
      authUser.email || 'Klub',
    role: 'club',
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
      const local = getSession()

      // Konto organizatora pozostaje lokalne i ma pierwszeństwo.
      if (local?.role === 'organizer') {
        if (mounted) {
          setUser(local)
          setLoading(false)
        }
        return
      }

      if (cloudSyncConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          const cloudUser = mapSupabaseUser(data?.session?.user)
          if (cloudUser && mounted) setUser(cloudUser)
          else if (local && mounted) setUser(local)
        } catch {
          if (local && mounted) setUser(local)
        }

        const result = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return
          const cloudUser = mapSupabaseUser(session?.user)
          if (cloudUser) setUser(cloudUser)
          else {
            const nextLocal = getSession()
            setUser(nextLocal?.role === 'organizer' ? nextLocal : null)
          }
        })
        subscription = result?.data?.subscription || null
      } else if (local && mounted) {
        setUser(local)
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

          const next = mapSupabaseUser(data.session.user)
          setUser(next)
          return next
        }

        // Tryb lokalny pozostaje dostępny, gdy Supabase nie jest skonfigurowany.
        const next = registerAccount(payload)
        setUser(next)
        return next
      },
      login: async (payload) => {
        const email = normalizeEmail(payload.email)

        // Organizator IKA Poland pozostaje na lokalnym koncie administracyjnym.
        if (email === ORGANIZER_EMAIL) {
          const next = loginAccount(payload)
          setUser(next)
          return next
        }

        if (cloudSyncConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: payload.email.trim(),
            password: payload.password,
          })

          if (!error && data?.user) {
            logoutAccount()
            const next = mapSupabaseUser(data.user)
            setUser(next)
            return next
          }

          // Zostawiamy zgodność z klubami utworzonymi wcześniej lokalnie
          // na tym samym urządzeniu.
          try {
            const local = loginAccount(payload)
            setUser(local)
            return local
          } catch {
            throw new Error(error?.message || 'Nieprawidłowy e-mail lub hasło.')
          }
        }

        const next = loginAccount(payload)
        setUser(next)
        return next
      },
      logout: async () => {
        if (user?.authProvider === 'supabase' && supabase) {
          try {
            await supabase.auth.signOut()
          } catch {
            // Wylogowanie lokalne wykonujemy niezależnie od błędu sieci.
          }
        }
        logoutAccount()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
