import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'

// ─── Toast Notification System ────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  return { toasts, toast: add }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="notify">
      {toasts.map(t => (
        <div key={t.id} className={`notify-item ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Sidebar Component ─────────────────────────────────────────────────────────
export function Sidebar({ activeSection, onSection, role, user, onLogout, selectedGuild }) {
  const isBotOwner = role === 'bot_owner'

  const botOwnerMenu = [
    { id: 'overview', icon: '📊', label: 'نظرة عامة' },
    { id: 'control', icon: '⚙️', label: 'إعدادات البوت' },
    { id: 'servers', icon: '🌐', label: 'السيرفرات' },
    { id: 'economy', icon: '💰', label: 'الاقتصاد' },
    { id: 'moderation', icon: '🔨', label: 'الإشراف' },
    { id: 'announce', icon: '📢', label: 'الإعلانات' },
    { id: 'logs', icon: '📋', label: 'السجلات' },
    { id: 'responses', icon: '🤖', label: 'الردود التلقائية' },
    { id: 'welcome', icon: '🖼️', label: 'صورة الترحيب' },
  ]

  const serverOwnerMenu = [
    { id: 'overview', icon: '📊', label: 'نظرة عامة' },
    { id: 'colors', icon: '🎨', label: 'نظام الألوان' },
    { id: 'logs', icon: '📋', label: 'قناة السجلات' },
    { id: 'welcome', icon: '👋', label: 'إعدادات الترحيب' },
    { id: 'protection', icon: '🛡️', label: 'الحماية' },
    { id: 'roles', icon: '🏷️', label: 'الأدوار' },
    { id: 'leaderboard', icon: '🏆', label: 'المتصدرون' },
  ]

  const menu = isBotOwner ? botOwnerMenu : serverOwnerMenu

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🤖</div>
        <div>
          <div className="sidebar-title">لوحة التحكم</div>
          <div className="sidebar-subtitle">{isBotOwner ? 'Bot Owner' : selectedGuild?.name || 'Server Owner'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">{isBotOwner ? 'إدارة البوت' : 'إدارة السيرفر'}</div>
          {menu.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => onSection(item.id)}
            >
              <span className="si-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">روابط</div>
          <a href="/store" className="sidebar-item">
            <span className="si-icon">🛒</span>
            المتجر
          </a>
          <a href="/auction" className="sidebar-item">
            <span className="si-icon">🏛️</span>
            المزاد
          </a>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          {user?.avatar
            ? <img className="user-avatar" src={user.avatar} alt="" />
            : <div className="user-avatar-placeholder">👤</div>
          }
          <div className="user-info">
            <div className="user-name">{user?.username || 'مستخدم'}</div>
            <div className={`user-role ${isBotOwner ? 'bot-owner' : 'server-owner'}`}>
              {isBotOwner ? '👑 Bot Owner' : '🔑 Server Owner'}
            </div>
          </div>
          <button onClick={onLogout} title="تسجيل خروج" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted)' }}>
            🚪
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, value, label, color = '' }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ─── Toggle Row ────────────────────────────────────────────────────────────────
export function ToggleRow({ label, checked, onChange, description }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border2)', paddingBottom: '14px', marginBottom: '14px' }}>
      <div className="toggle-wrap">
        <div>
          <div className="toggle-label">{label}</div>
          {description && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{description}</div>}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  )
}

// ─── Channel Dropdown ──────────────────────────────────────────────────────────
export function ChannelSelect({ channels, value, onChange, label, hint }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— اختر قناة —</option>
        {(channels || []).map(c => (
          <option key={c.id} value={c.id}>
            #{c.name}{!c.canSend ? ' ⚠️' : ''}
          </option>
        ))}
      </select>
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}
