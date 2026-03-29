import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, refreshToken, logout as apiLogout } from '../api/auth'
import { setAuthFailureHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' | 'ready'
  const [status, setStatus] = useState('loading')
  const navigate = useNavigate()

  const normalizeRole = (role) => role?.toLowerCase?.() ?? ''

  const clearAuth = useCallback(() => {
    localStorage.removeItem('accessToken')
    setUser(null)
  }, [])

  // Attempt to load the current user on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setStatus('ready')
      return
    }

    getMe()
      .then((me) => {
        setUser({ ...me, role: normalizeRole(me.role) })
        setStatus('ready')
      })
      .catch(async (err) => {
        if (err?.response?.status === 401) {
          // Try refresh once
          try {
            const data = await refreshToken()
            if (data?.accessToken) {
              localStorage.setItem('accessToken', data.accessToken)
              const me = await getMe()
              setUser({ ...me, role: normalizeRole(me.role) })
              setStatus('ready')
              return
            }
          } catch {
            // refresh failed — fall through
          }
        }
        clearAuth()
        setStatus('ready')
      })
  }, [clearAuth])

  const login = useCallback((token, rawRole) => {
    localStorage.setItem('accessToken', token)
    return getMe().then((me) => {
      const normalized = { ...me, role: normalizeRole(me.role) }
      setUser(normalized)
      return normalized
    })
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    clearAuth()
    navigate('/', { replace: true })
  }, [clearAuth, navigate])

  // Register the 401 failure handler with the axios client.
  // Fires when a mid-session refresh attempt fails — silently logs the user out.
  useEffect(() => {
    setAuthFailureHandler(() => {
      clearAuth()
      navigate('/', {
        replace: true,
        state: { errorMessage: 'Your session has expired. Please sign in again.' },
      })
    })
  }, [clearAuth, navigate])

  return (
    <AuthContext.Provider value={{ user, status, login, logout, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
