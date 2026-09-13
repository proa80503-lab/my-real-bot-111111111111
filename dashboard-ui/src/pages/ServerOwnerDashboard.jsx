import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { Sidebar, StatCard, ToggleRow, ToastContainer, useToast, ChannelSelect } from '../components/ui'

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ info }) {
  if (!info) return <div className="loading-screen"><div className="spinner" /><div className="loading-text">جاري تحميل...</div></div>
  const { guild, settings, botStatus } = info
  return (
    <div>
      <div className="cards-grid" style={{ marginBottom: 28 }}>
        <StatCard icon="👥" value={(guild.memberCount || 0).toLocaleString()} label="الأعضاء" color="green" />
        <StatCard icon="🚀" value={`Tier ${guild.boostLevel}`} label="Boost Level" color="gold" />
        <StatCard icon="💎" value={guild.boostCount || 0} label="Boosts" color="cyan" />
        <StatCard icon="🛡️" value={botStatus.isAdmin ? 'Admin ✅' : 'No Admin ⚠️'} label="صلاحيات البوت" color={botStatus.isAdmin ? 'green' : 'red'} />
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <div className="card-title">معلومات السيرفر</div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            {guild.icon
              ? <img src={guild.icon} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--accent)' }} />
              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '3px solid var(--accent)' }}>🌐</div>
            }
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{guild.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>ID: {guild.id}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--text2)' }}>
            <div>📅 منذ: {new Date(guild.createdAt).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">الإعدادات الحالية</div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2.2 }}>
            <div>🎨 قناة الألوان: <strong style={{ color: settings.colorChannelName ? 'var(--green)' : 'var(--muted)' }}>#{settings.colorChannelName || 'غير محددة'}</strong></div>
            <div>📋 قناة السجلات: <strong style={{ color: settings.logChannelName ? 'var(--green)' : 'var(--muted)' }}>#{settings.logChannelName || 'غير محددة'}</strong></div>
            <div>💬 البادئة: <code style={{ background: 'var(--card2)', padding: '2px 8px', borderRadius: 4 }}>{settings.prefix || '!'}</code></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Colors ───────────────────────────────────────────────────────────────────
function ColorsSection({ guildId, info, channels, toast, onRefresh }) {
  const [selectedChannel, setSelectedChannel] = useState(info?.settings?.colorChannelId || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!selectedChannel) return toast('اختر قناة أولاً', 'error')
    setLoading(true)
    const res = await apiFetch(`/server/${guildId}/color-channel`, {
      method: 'POST',
      body: JSON.stringify({ channelId: selectedChannel }),
    })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تم تعيين قناة الألوان ✅', 'success'); onRefresh() }
    else toast(res?.error || 'خطأ', 'error')
  }

  const currentChannel = info?.settings?.colorChannelName

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">🎨</span><div className="card-title">نظام ألوان البروفايل</div></div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.7 }}>
          اختر قناة نصية يُرسل فيها البوت نظام اختيار الألوان تلقائياً.
          الأعضاء يضغطون على القائمة ويختارون لونهم مباشرة.
        </p>
        {currentChannel && (
          <div className="badge badge-green" style={{ marginBottom: 16, fontSize: 13 }}>
            ✅ الحالية: #{currentChannel}
          </div>
        )}
        <ChannelSelect
          channels={channels}
          value={selectedChannel}
          onChange={setSelectedChannel}
          label="القناة المخصصة للألوان"
          hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links, Manage Messages"
        />
        <button className="btn btn-primary" onClick={save} disabled={loading}>
          {loading ? '⏳ جاري الإرسال...' : '🎨 حفظ وإرسال نظام الألوان'}
        </button>

        <div style={{ marginTop: 20, padding: 14, background: 'rgba(88,101,242,0.08)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>كيف يعمل النظام:</div>
          <div>• البوت يُرسل Embed + قائمة ألوان في القناة المختارة</div>
          <div>• الأعضاء يختارون لونهم من القائمة</div>
          <div>• اللون يُحفظ ويظهر في بروفايلهم</div>
          <div>• عند Restart: البوت لا يُعيد الإرسال إذا كانت الرسالة موجودة</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-icon">🌈</span><div className="card-title">الألوان المتاحة</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 10 }}>
          {[
            { hex: '#ef4444', name: 'أحمر', emoji: '🔴' },
            { hex: '#3b82f6', name: 'أزرق', emoji: '🔵' },
            { hex: '#22c55e', name: 'أخضر', emoji: '🟢' },
            { hex: '#f59e0b', name: 'ذهبي', emoji: '🟡' },
            { hex: '#a855f7', name: 'بنفسجي', emoji: '🟣' },
            { hex: '#ec4899', name: 'وردي', emoji: '🩷' },
            { hex: '#06b6d4', name: 'سماوي', emoji: '🩵' },
            { hex: '#f97316', name: 'برتقالي', emoji: '🟠' },
            { hex: '#111111', name: 'أسود', emoji: '⚫' },
            { hex: '#ffffff', name: 'أبيض', emoji: '⚪' },
          ].map(c => (
            <div key={c.hex} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', textAlign: 'center', borderTop: `3px solid ${c.hex}` }}>
              <div style={{ fontSize: 20 }}>{c.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{c.name}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{c.hex}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
function LogsSection({ guildId, info, channels, toast, onRefresh }) {
  const [selectedChannel, setSelectedChannel] = useState(info?.settings?.logChannelId || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!selectedChannel) return toast('اختر قناة أولاً', 'error')
    setLoading(true)
    const res = await apiFetch(`/server/${guildId}/log-channel`, {
      method: 'POST',
      body: JSON.stringify({ channelId: selectedChannel }),
    })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تم تعيين قناة السجلات ✅', 'success'); onRefresh() }
    else toast(res?.error || 'خطأ', 'error')
  }

  const logTypes = [
    { icon: '🚪', label: 'انضمام / مغادرة الأعضاء' },
    { icon: '🔨', label: 'الطرد والحظر' },
    { icon: '⚠️', label: 'التحذيرات' },
    { icon: '🗑️', label: 'حذف الرسائل' },
    { icon: '✏️', label: 'تعديل الرسائل' },
    { icon: '🏷️', label: 'تغييرات الأدوار' },
    { icon: '📁', label: 'تغييرات القنوات' },
    { icon: '🔇', label: 'الكتم والسجن' },
  ]

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">📋</span><div className="card-title">قناة السجلات</div></div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.7 }}>
          كل الأحداث في السيرفر تُسجَّل في هذه القناة بشكل تفصيلي مع معرفة المنفذ.
        </p>
        {info?.settings?.logChannelName && (
          <div className="badge badge-green" style={{ marginBottom: 16, fontSize: 13 }}>
            ✅ الحالية: #{info.settings.logChannelName}
          </div>
        )}
        <ChannelSelect
          channels={channels}
          value={selectedChannel}
          onChange={setSelectedChannel}
          label="القناة المخصصة للسجلات"
          hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links"
        />
        <button className="btn btn-primary" onClick={save} disabled={loading}>
          {loading ? '⏳ جاري الحفظ...' : '💾 حفظ قناة السجلات'}
        </button>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-icon">📝</span><div className="card-title">ما يُسجَّل</div></div>
        {logTypes.map(lt => (
          <div key={lt.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>{lt.icon}</span>
            <span>{lt.label}</span>
            <span className="badge badge-green" style={{ marginRight: 'auto' }}>مفعّل</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Protection ───────────────────────────────────────────────────────────────
function ProtectionSection({ guildId, toast }) {
  const [protection, setProtection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch(`/server/${guildId}/protection`).then(d => { if (d?.success) setProtection(d.protection); setLoading(false) })
  }, [guildId])

  const toggle = (key, field, value) => {
    setProtection(p => ({ ...p, [key]: { ...p[key], [field]: value } }))
  }

  const save = async () => {
    setSaving(true)
    const res = await apiFetch(`/server/${guildId}/protection`, { method: 'POST', body: JSON.stringify({ protection }) })
    setSaving(false)
    if (res?.success) toast('تم حفظ إعدادات الحماية ✅', 'success')
    else toast(res?.error || 'خطأ', 'error')
  }

  if (loading || !protection) return <div className="loading-screen"><div className="spinner" /></div>

  const protectionCards = [
    { key: 'antiSpam', icon: '🚫', name: 'Anti-Spam', desc: 'حماية من الفلد والسبام' },
    { key: 'antiRaid', icon: '⚔️', name: 'Anti-Raid', desc: 'حماية من هجمات الريد' },
    { key: 'antiBadWords', icon: '🤬', name: 'Anti-Bad Words', desc: 'فلترة الكلمات المسيئة' },
    { key: 'antiLink', icon: '🔗', name: 'Anti-Link', desc: 'منع الروابط غير المرخصة' },
    { key: 'antiCaps', icon: '🔠', name: 'Anti-Caps', desc: 'منع الكتابة بأحرف كبيرة' },
    { key: 'antiMentionSpam', icon: '📣', name: 'Anti-Mention Spam', desc: 'حماية من منشن سبام' },
    { key: 'antiAccountAge', icon: '👶', name: 'Anti-New Account', desc: 'حظر الحسابات الجديدة' },
    { key: 'antiNuke', icon: '💣', name: 'Anti-Nuke', desc: 'حماية من حذف السيرفر' },
    { key: 'antiBotJoin', icon: '🤖', name: 'Anti-Bot Join', desc: 'منع دخول البوتات' },
    { key: 'antiEveryone', icon: '📢', name: 'Anti-Everyone', desc: 'منع منشن @everyone' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>كل إعداد يُطبَّق على هذا السيرفر فقط</div>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving ? '⏳ حفظ...' : '💾 حفظ كل الإعدادات'}
        </button>
      </div>

      <div className="protection-grid">
        {protectionCards.map(pc => {
          const p = protection[pc.key] || {}
          const enabled = p.enabled || false
          return (
            <div key={pc.key} className={`protection-card ${enabled ? 'enabled' : 'disabled'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{pc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{pc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pc.desc}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={enabled} onChange={e => toggle(pc.key, 'enabled', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {enabled && p.action && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select className="form-select" style={{ fontSize: 12 }} value={p.action || ''} onChange={e => toggle(pc.key, 'action', e.target.value)}>
                    <option value="delete">حذف الرسالة</option>
                    <option value="warn">تحذير</option>
                    <option value="timeout">توقف مؤقت</option>
                    <option value="kick">طرد</option>
                    <option value="ban">حظر</option>
                    <option value="jail">سجن</option>
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Roles ────────────────────────────────────────────────────────────────────
function RolesSection({ guildId }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/server/${guildId}/roles`).then(d => { if (d?.success) setRoles(d.roles); setLoading(false) })
  }, [guildId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الدور</th>
            <th>الأعضاء</th>
            <th>اللون</th>
            <th>قابل للإشارة</th>
            <th>مُدار</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(r => (
            <tr key={r.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color === '#000000' ? '#333' : r.color, border: '1px solid var(--border)' }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                </div>
              </td>
              <td>{r.memberCount}</td>
              <td><code style={{ fontSize: 11, color: 'var(--muted)' }}>{r.color}</code></td>
              <td>{r.mentionable ? <span className="badge badge-green">نعم</span> : <span className="badge badge-red">لا</span>}</td>
              <td>{r.managed ? <span className="badge badge-yellow">بوت</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardSection({ guildId }) {
  const [lb, setLb] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/server/${guildId}/members/leaderboard`).then(d => { if (d?.success) setLb(d.leaderboard); setLoading(false) })
  }, [guildId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>العضو</th>
            <th>المحفظة</th>
            <th>البنك</th>
            <th>المستوى</th>
          </tr>
        </thead>
        <tbody>
          {lb.map((m, i) => (
            <tr key={m.id}>
              <td><span style={{ fontWeight: 900, color: i === 0 ? 'var(--gold)' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : 'var(--muted)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={m.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{m.displayName}</span>
                </div>
              </td>
              <td><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{m.balance.toLocaleString()} 💰</span></td>
              <td>{m.bank.toLocaleString()}</td>
              <td><span className="badge badge-blue">Lv.{m.level}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Server Owner Dashboard ──────────────────────────────────────────────
export default function ServerOwnerDashboard() {
  const { guildId } = useParams()
  const { user, guilds, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [info, setInfo] = useState(null)
  const [channels, setChannels] = useState([])
  const { toasts, toast } = useToast()

  const selectedGuild = guilds.find(g => g.id === guildId)

  const loadInfo = useCallback(async () => {
    const [iRes, cRes] = await Promise.all([
      apiFetch(`/server/${guildId}/info`),
      apiFetch(`/server/${guildId}/channels`),
    ])
    if (iRes?.success) setInfo(iRes)
    if (cRes?.success) setChannels(cRes.channels)
  }, [guildId])

  useEffect(() => { loadInfo() }, [loadInfo])

  const titles = { overview: '📊 نظرة عامة', colors: '🎨 نظام الألوان', logs: '📋 قناة السجلات', protection: '🛡️ الحماية', roles: '🏷️ الأدوار', leaderboard: '🏆 المتصدرون' }

  const sections = {
    overview: <Overview info={info} />,
    colors: <ColorsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    logs: <LogsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    protection: <ProtectionSection guildId={guildId} toast={toast} />,
    roles: <RolesSection guildId={guildId} />,
    leaderboard: <LeaderboardSection guildId={guildId} />,
  }

  return (
    <div className="page-layout">
      <Sidebar activeSection={section} onSection={setSection} role="server_owner" user={user} onLogout={logout} selectedGuild={selectedGuild} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{titles[section] || 'السيرفر'}</h1>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              🌐 {selectedGuild?.name || guildId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="page-badge cyan">🔑 Server Owner</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/guilds')}>← العودة</button>
          </div>
        </div>
        {sections[section] || null}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
