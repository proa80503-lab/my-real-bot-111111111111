import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { ToastContainer, useToast } from '../components/ui'

// ─── Guild Selector — يظهر للـ Server Owner ───────────────────────────────────
export default function GuildSelector() {
  const { user, guilds, logout } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()
  const [botStatus, setBotStatus] = useState(null)

  useEffect(() => {
    apiFetch('/public/status').then(d => setBotStatus(d))
  }, [])

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 800 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--cyan)' }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
              }
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>مرحباً، {user?.username || 'مستخدم'}</div>
                <div className="badge badge-blue" style={{ marginTop: 4 }}>🔑 Server Owner</div>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={logout}>🚪 خروج</button>
        </div>

        {/* Bot Status */}
        {botStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24, fontSize: 13 }}>
            <span className={`status-dot ${botStatus.online ? 'online' : 'offline'}`} />
            <span>البوت: <strong style={{ color: botStatus.online ? 'var(--green)' : 'var(--red)' }}>{botStatus.online ? 'متصل' : 'غير متصل'}</strong></span>
            {botStatus.online && <span style={{ color: 'var(--muted)', marginRight: 12 }}>Ping: {botStatus.ping}ms</span>}
          </div>
        )}

        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🌐 اختر سيرفرك</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          السيرفرات التي تملكها والبوت موجود فيها
        </p>

        {guilds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>لا يوجد سيرفرات</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              أنت لا تملك أي سيرفر يعمل فيه البوت.
            </div>
            <a
              href="https://discord.com/oauth2/authorize"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              ➕ دعوة البوت لسيرفرك
            </a>
          </div>
        ) : (
          <div className="guild-grid">
            {guilds.map(g => (
              <div
                key={g.id}
                className="guild-card"
                onClick={() => navigate(`/server/${g.id}`)}
              >
                {g.icon
                  ? <img className="guild-icon" src={g.icon} alt={g.name} />
                  : <div className="guild-icon-placeholder">🌐</div>
                }
                <div className="guild-name">{g.name}</div>
                <div className="guild-members">👥 {(g.memberCount || 0).toLocaleString()} عضو</div>
                {g.isOwner && <div className="badge badge-gold" style={{ marginTop: 8 }}>👑 مالك</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
