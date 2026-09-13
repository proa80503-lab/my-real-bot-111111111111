import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API = '/api'

// ─── API Helper ───────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    window.location.href = '/'
    return null
  }
  return res.json()
}

// ─── Auth Provider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [guilds, setGuilds] = useState([])
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const data = await apiFetch('/auth/me')
      if (data?.success) {
        setUser(data.user)
        setGuilds(data.guilds || [])
      } else {
        localStorage.removeItem('token')
      }
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Handle OAuth callback token in URL
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    const urlRole = params.get('role')
    const urlError = params.get('error')

    if (urlToken) {
      localStorage.setItem('token', urlToken)
      if (urlRole) localStorage.setItem('role', urlRole)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (urlError) {
      console.error('OAuth error:', urlError)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadUser()
  }, [loadUser])

  const login = (token, role) => {
    localStorage.setItem('token', token)
    if (role) localStorage.setItem('role', role)
    loadUser()
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setUser(null)
    setGuilds([])
  }

  return (
    <AuthContext.Provider value={{ user, guilds, loading, login, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
