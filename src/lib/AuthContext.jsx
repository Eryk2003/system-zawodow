import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginAccount, logoutAccount, registerAccount } from './demoStore'
import { cloudSyncConfigured, refreshCloudSyncForSession, supabase } from './cloudSync'

const AuthContext = createContext(null)

async function resolveSupabaseUser(authUser) {
  if (!authUser || !supabase) return null

  let role = 'club'
  let fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.fullName || authUser.email || 'Klub'

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name,role,active')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!error && profile) {
      if (profile.active === false) {
        const disabled = new Error('ACCOUNT_DISABLED')
        disabled.code = 'ACCOUNT_DISABLED'
        throw disabled
      }
      role = profile.role === 'organizer' ? 'organizer' : 'club'
      fullName = profile.full_name || fullName
    }
  } catch (error) {
    if (error?.code === 'ACCOUNT_DISABLED') throw error
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
        try {
          const { data } = await supabase.auth.getSession()
          const cloudUser = await resolveSupabaseUser(data?.session?.user)
          if (mounted) setUser(cloudUser)
        } catch (error) {
          if (error?.code === 'ACCOUNT_DISABLED') { try { await supabase.auth.signOut() } catch {} }
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
        if (cloudSyncConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: payload.email.trim(),
            password: payload.password,
          })

          if (error || !data?.user) {
            throw new Error(error?.message || 'Nieprawidłowy e-mail lub hasło.')
          }

          logoutAccount()
          let next
          try {
            next = await resolveSupabaseUser(data.user)
          } catch (resolveError) {
            if (resolveError?.code === 'ACCOUNT_DISABLED') {
              try { await supabase.auth.signOut() } catch {}
              const disabled = new Error('To konto klubu zostało usunięte lub zablokowane przez organizatora.')
              disabled.code = 'ACCOUNT_DISABLED'
              throw disabled
            }
            throw resolveError
          }
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
