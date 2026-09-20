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
  
  try {
    return await res.json()
  } catch (err) {
    console.error('API Fetch Parse Error:', err)
    return { success: false, error: `Server returned error ${res.status}: ${res.statusText}` }
  }
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
      console.log('[Auth] Calling /api/auth/me...')
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('[Auth] /me status:', res.status)
      if (res.status === 401 || res.status === 403) {
        console.warn('[Auth] Token invalid/expired, removing...')
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        setLoading(false)
        return
      }
      const data = await res.json()
      console.log('[Auth] /me data:', data)
      if (data?.success) {
        setUser(data.user)
        setGuilds(data.guilds || [])
      } else {
        console.warn('[Auth] /me returned success:false, removing token')
        localStorage.removeItem('token')
      }
    } catch (e) {
      console.error('[Auth] loadUser error:', e.message)
      // لا نحذف التوكن في حالة خطأ الشبكة لتجنب تسجيل الخروج
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Read OAuth credentials from the fragment so they are not sent in HTTP requests.
    const params = new URLSearchParams(window.location.hash.slice(1))
    const urlToken = params.get('token')
    const urlRole = params.get('role')
    const urlError = params.get('error')

    if (urlToken) {
      console.log('[Auth] Got token from URL, saving to localStorage...')
      localStorage.setItem('token', urlToken)
      if (urlRole) localStorage.setItem('role', urlRole)
      // حذف التوكن من الرابط قبل تحميل المستخدم
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (urlError) {
      console.error('[Auth] OAuth error from URL:', urlError)
      localStorage.setItem('authError', urlError)
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
