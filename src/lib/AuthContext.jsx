import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginAccount, logoutAccount, registerAccount } from './demoStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(getSession())
    setLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      register: async (payload) => {
        const next = registerAccount(payload)
        setUser(next)
        return next
      },
      login: async (payload) => {
        const next = loginAccount(payload)
        setUser(next)
        return next
      },
      logout: () => {
        logoutAccount()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
