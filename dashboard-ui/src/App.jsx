import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import LoginPage from './pages/LoginPage'
import BotOwnerDashboard from './pages/BotOwnerDashboard'
import ServerOwnerDashboard from './pages/ServerOwnerDashboard'
import GuildSelector from './pages/GuildSelector'
import StorePage from './pages/StorePage'
import './index.css'

// ─── Route Guards ─────────────────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">جاري التحقق...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  if (role && user.role !== role && user.role !== 'bot_owner') {
    return <Navigate to="/" replace />
  }

  return children
}

function RequireBotOwner({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user || user.role !== 'bot_owner') return <Navigate to="/" replace />
  return children
}

// ─── Smart Home — يُعيد التوجيه حسب الـ Role ──────────────────────────────────
function SmartHome() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="loading-text">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={(token, role) => {
      localStorage.setItem('token', token)
      if (role) localStorage.setItem('role', role)
      window.location.reload()
    }} />
  }

  // Bot Owner → داشبورد البوت
  if (user.role === 'bot_owner') {
    return <Navigate to="/bot-owner" replace />
  }

  // Server Owner → اختيار السيرفر
  if (user.role === 'server_owner') {
    return <Navigate to="/guilds" replace />
  }

  // دور غير معروف — أظهر صفحة الخطأ بدلاً من إعادة التوجيه لتجنب الحلقة اللانهائية
  return (
    <div className="loading-screen">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>خطأ في صلاحيات الحساب</div>
        <div style={{ color: 'var(--muted)', marginBottom: 20 }}>دور: {user.role}</div>
        <button className="btn btn-outline" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>
          🚪 تسجيل خروج وإعادة المحاولة
        </button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* صفحة دخول ذكية */}
      <Route path="/" element={<SmartHome />} />

      {/* Bot Owner Dashboard */}
      <Route
        path="/bot-owner"
        element={
          <RequireBotOwner>
            <BotOwnerDashboard />
          </RequireBotOwner>
        }
      />

      {/* Server Owner — اختيار السيرفر */}
      <Route
        path="/guilds"
        element={
          <RequireAuth>
            <GuildSelector />
          </RequireAuth>
        }
      />

      {/* Server Owner Dashboard — لكل سيرفر بشكل منفصل */}
      <Route
        path="/server/:guildId"
        element={
          <RequireAuth>
            <ServerOwnerDashboard />
          </RequireAuth>
        }
      />

      {/* صفحات عامة */}
      <Route path="/store" element={<StorePage />} />
      <Route path="/auction" element={<StorePage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
