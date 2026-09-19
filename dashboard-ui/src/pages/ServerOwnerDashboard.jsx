import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { Sidebar, StatCard, ToggleRow, ToastContainer, useToast, ChannelSelect } from '../components/ui'

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ info }) {
  if (!info) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">جاري تحميل...</div>
    </div>
  )
  const { guild, settings, botStatus } = info
  return (
    <div className="animate-fade-up">
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="👥" value={(guild.memberCount || 0).toLocaleString()} label="الأعضاء" color="green" />
        <StatCard icon="🚀" value={`Tier ${guild.boostLevel || 0}`} label="Boost Level" color="gold" />
        <StatCard icon="💎" value={guild.boostCount || 0} label="Boosts" color="cyan" />
        <StatCard icon="🛡️" value={botStatus.isAdmin ? 'Admin ✅' : 'لا صلاحية ⚠️'} label="صلاحيات البوت" color={botStatus.isAdmin ? 'green' : 'red'} />
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <div>
              <div className="card-title">معلومات السيرفر</div>
              <div className="card-subtitle">بيانات السيرفر الحالي</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            {guild.icon
              ? <img src={guild.icon} alt="" style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--accent)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }} />
              : <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: '3px solid var(--accent)' }}>🌐</div>
            }
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{guild.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>ID: {guild.id}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '📅', label: 'تاريخ الإنشاء', value: new Date(guild.createdAt).toLocaleDateString('ar-SA') },
              { icon: '👑', label: 'نوع المستخدم', value: 'Server Owner' },
              { icon: '✅', label: 'صلاحيات البوت', value: botStatus.isAdmin ? 'Administrator' : 'محدودة' },
              { icon: '🔑', label: 'Intents', value: 'Members ✅' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{icon} {label}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">الإعدادات النشطة</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'قناة الألوان', value: settings.colorChannelName ? `#${settings.colorChannelName}` : 'غير محددة', active: !!settings.colorChannelName, icon: '🎨' },
              { label: 'قناة السجلات', value: settings.logChannelName ? `#${settings.logChannelName}` : 'غير محددة', active: !!settings.logChannelName, icon: '📋' },
              { label: 'البادئة', value: settings.prefix || '!', active: true, icon: '💬' },
              { label: 'الترحيب', value: settings.welcomeEnabled ? 'مفعّل ✅' : 'معطّل', active: settings.welcomeEnabled, icon: '👋' },
            ].map(({ label, value, active, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card2)', borderRadius: 8, border: '1px solid var(--border2)' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--text)' : 'var(--muted)' }}>{value}</div>
                </div>
                <span className={`badge ${active ? 'badge-green' : 'badge-red'}`}>{active ? 'نشط' : 'معطّل'}</span>
              </div>
            ))}
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
    const res = await apiFetch(`/server/${guildId}/color-channel`, { method: 'POST', body: JSON.stringify({ channelId: selectedChannel }) })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تم تعيين قناة الألوان ✅', 'success'); onRefresh() }
    else toast(res?.error || 'خطأ', 'error')
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🎨</span>
            <div>
              <div className="card-title">نظام ألوان البروفايل</div>
              <div className="card-subtitle">تخصيص لون اسم كل عضو</div>
            </div>
          </div>
          {info?.settings?.colorChannelName && (
            <div className="badge badge-green" style={{ marginBottom: 14, fontSize: 13 }}>✅ القناة الحالية: #{info.settings.colorChannelName}</div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.8 }}>
            اختر قناة نصية يُرسل فيها البوت قائمة اختيار الألوان تلقائياً. الأعضاء يختارون لونهم بنقرة واحدة.
          </p>
          <ChannelSelect channels={channels} value={selectedChannel} onChange={setSelectedChannel} label="القناة المخصصة للألوان" hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links, Manage Messages" />
          <button className="btn btn-primary" onClick={save} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ جاري الإرسال...' : '🎨 حفظ وإرسال نظام الألوان'}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌈</span>
            <div className="card-title">الألوان المتاحة للأعضاء</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 10 }}>
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
              <div key={c.hex} style={{ background: 'var(--card2)', border: `2px solid ${c.hex}33`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', borderTop: `3px solid ${c.hex}` }}>
                <div style={{ fontSize: 22 }}>{c.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, color: 'var(--text2)' }}>{c.name}</div>
              </div>
            ))}
          </div>
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
    const res = await apiFetch(`/server/${guildId}/log-channel`, { method: 'POST', body: JSON.stringify({ channelId: selectedChannel }) })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تم تعيين قناة السجلات ✅', 'success'); onRefresh() }
    else toast(res?.error || 'خطأ', 'error')
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <div className="card-title">قناة السجلات</div>
          </div>
          {info?.settings?.logChannelName && (
            <div className="badge badge-green" style={{ marginBottom: 14 }}>✅ الحالية: #{info.settings.logChannelName}</div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.8 }}>
            جميع الأحداث في السيرفر تُسجَّل تلقائياً مع تفاصيل دقيقة ومعرفة المنفذ.
          </p>
          <ChannelSelect channels={channels} value={selectedChannel} onChange={setSelectedChannel} label="القناة المخصصة للسجلات" hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links" />
          <button className="btn btn-primary" onClick={save} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ جاري الحفظ...' : '💾 حفظ قناة السجلات'}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">📝</span>
            <div className="card-title">ما يُسجَّل تلقائياً</div>
          </div>
          {[
            { icon: '🚪', label: 'انضمام / مغادرة الأعضاء' },
            { icon: '🔨', label: 'الطرد والحظر والمحاولات' },
            { icon: '⚠️', label: 'التحذيرات والعقوبات' },
            { icon: '🗑️', label: 'حذف الرسائل' },
            { icon: '✏️', label: 'تعديل الرسائل' },
            { icon: '🏷️', label: 'تغييرات الأدوار' },
            { icon: '📁', label: 'تغييرات القنوات' },
            { icon: '🔇', label: 'الكتم والسجن والرفع' },
          ].map(lt => (
            <div key={lt.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
              <span style={{ fontSize: 18 }}>{lt.icon}</span>
              <span style={{ flex: 1, color: 'var(--text2)' }}>{lt.label}</span>
              <span className="badge badge-green" style={{ fontSize: 10 }}>مفعّل</span>
            </div>
          ))}
        </div>
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

  const toggle = (key, field, value) => setProtection(p => ({ ...p, [key]: { ...p[key], [field]: value } }))

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
    { key: 'antiCaps', icon: '🔠', name: 'Anti-Caps', desc: 'منع الكتابة بالكبير بالكامل' },
    { key: 'antiMentionSpam', icon: '📣', name: 'Anti-Mention Spam', desc: 'حماية من منشن سبام' },
    { key: 'antiAccountAge', icon: '👶', name: 'Anti-New Account', desc: 'حظر الحسابات الجديدة جداً' },
    { key: 'antiNuke', icon: '💣', name: 'Anti-Nuke', desc: 'حماية من تدمير السيرفر' },
    { key: 'antiBotJoin', icon: '🤖', name: 'Anti-Bot Join', desc: 'منع دخول البوتات تلقائياً' },
    { key: 'antiEveryone', icon: '📢', name: 'Anti-Everyone', desc: 'منع منشن @everyone من العامة' },
  ]

  const enabledCount = protectionCards.filter(pc => protection[pc.key]?.enabled).length

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-green">{enabledCount} نظام مفعّل</span>
          <span className="badge">{protectionCards.length - enabledCount} معطّل</span>
        </div>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving ? '⏳ حفظ...' : '💾 حفظ جميع الإعدادات'}
        </button>
      </div>

      <div className="protection-grid">
        {protectionCards.map(pc => {
          const p = protection[pc.key] || {}
          const enabled = p.enabled || false
          return (
            <div key={pc.key} className={`protection-card ${enabled ? 'enabled' : 'disabled'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
                  <select className="form-select" style={{ fontSize: 12 }} value={p.action || 'delete'} onChange={e => toggle(pc.key, 'action', e.target.value)}>
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

// ─── Welcome Section لمالك السيرفر (مُضافة حديثاً) ──────────────────────────
function WelcomeSection({ guildId, channels, toast }) {
  const [ws, setWs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    apiFetch(`/server/${guildId}/welcome-settings`).then(d => {
      if (d?.success) {
        setWs({
          welcomeEnabled: d.welcomeEnabled,
          welcomeChannel: d.welcomeChannel || '',
          welcomeImage: d.welcomeImage || '',
          welcomeAvatarX: d.welcomeAvatarX || 960,
          welcomeAvatarY: d.welcomeAvatarY || 540,
          welcomeAvatarSize: d.welcomeAvatarSize || 256,
          welcomeAvatarRadius: d.welcomeAvatarRadius || 50,
          welcomeChannelName: d.welcomeChannelName,
          welcomeChannelValid: d.welcomeChannelValid,
        })
      }
      setLoading(false)
    })
  }, [guildId])

  const save = async () => {
    if (!ws.welcomeChannel) return toast('يرجى اختيار قناة الترحيب أولاً', 'error')
    setSaving(true)
    const res = await apiFetch(`/server/${guildId}/welcome-settings`, {
      method: 'POST',
      body: JSON.stringify({
        welcomeEnabled: ws.welcomeEnabled,
        welcomeChannel: ws.welcomeChannel,
        welcomeImage: ws.welcomeImage,
        welcomeAvatarX: ws.welcomeAvatarX,
        welcomeAvatarY: ws.welcomeAvatarY,
        welcomeAvatarSize: ws.welcomeAvatarSize,
        welcomeAvatarRadius: ws.welcomeAvatarRadius,
      })
    })
    setSaving(false)
    if (res?.success) toast('تم حفظ إعدادات الترحيب ✅', 'success')
    else toast(res?.error || 'خطأ في الحفظ', 'error')
  }

  const testWelcome = async () => {
    if (!ws.welcomeChannel) return toast('اختر قناة الترحيب وحفظ الإعدادات أولاً', 'error')
    setTesting(true)
    // حفظ أولاً
    await apiFetch(`/server/${guildId}/welcome-settings`, {
      method: 'POST',
      body: JSON.stringify({
        welcomeEnabled: ws.welcomeEnabled,
        welcomeChannel: ws.welcomeChannel,
        welcomeImage: ws.welcomeImage,
        welcomeAvatarX: ws.welcomeAvatarX,
        welcomeAvatarY: ws.welcomeAvatarY,
        welcomeAvatarSize: ws.welcomeAvatarSize,
        welcomeAvatarRadius: ws.welcomeAvatarRadius,
      })
    })
    const res = await apiFetch(`/server/${guildId}/test-welcome`, { method: 'POST' })
    setTesting(false)
    if (res?.success) toast(res.message || '✅ تم إرسال رسالة ترحيب تجريبية!', 'success')
    else toast(res?.error || 'حدث خطأ', 'error')
  }

  if (loading || !ws) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>إعدادات الترحيب الخاصة بسيرفرك</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={testWelcome} disabled={testing || saving}>
            {testing ? '⏳...' : '🧪 تجربة'}
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? '⏳ حفظ...' : '💾 حفظ وتطبيق'}
          </button>
        </div>
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">إعدادات الترحيب</div>
          </div>

          <ToggleRow
            label="👋 تفعيل رسائل الترحيب"
            description="إرسال رسالة عند انضمام عضو جديد"
            checked={ws.welcomeEnabled}
            onChange={v => setWs({ ...ws, welcomeEnabled: v })}
          />

          <div className="form-group">
            <label className="form-label">💬 قناة الترحيب</label>
            <select
              className="form-select"
              value={ws.welcomeChannel || ''}
              onChange={e => setWs({ ...ws, welcomeChannel: e.target.value })}
            >
              <option value="">— اختر قناة —</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}{!ch.canSend ? ' ⚠️' : ''}</option>
              ))}
            </select>
            {ws.welcomeChannelValid && (
              <div className="form-hint" style={{ color: 'var(--green)' }}>✅ القناة الحالية: #{ws.welcomeChannelName}</div>
            )}
            {ws.welcomeChannel && !ws.welcomeChannelValid && (
              <div className="form-hint" style={{ color: 'var(--yellow)' }}>⚠️ تحقق من صلاحيات البوت في هذه القناة</div>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>🖼️ صورة الخلفية (URL)</label>
              <a href="https://imgbb.com/" target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>☁️ رفع</a>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="https://i.ibb.co/.../image.png"
              value={ws.welcomeImage || ''}
              onChange={e => setWs({ ...ws, welcomeImage: e.target.value })}
            />
          </div>

          {[
            { key: 'welcomeAvatarX', label: 'موضع الصورة أفقياً (X)', min: 0, max: 1920 },
            { key: 'welcomeAvatarY', label: 'موضع الصورة عمودياً (Y)', min: 0, max: 1080 },
            { key: 'welcomeAvatarSize', label: 'حجم صورة الأفاتار', min: 50, max: 500 },
            { key: 'welcomeAvatarRadius', label: 'تدوير الزوايا %', min: 0, max: 50 },
          ].map(({ key, label, min, max }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}: <strong style={{ color: 'var(--accent2)' }}>{ws[key]}{key === 'welcomeAvatarRadius' ? '%' : 'px'}</strong></label>
              <input type="range" min={min} max={max} value={ws[key] || min} onChange={e => setWs({ ...ws, [key]: parseInt(e.target.value) })} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">👁️</span>
            <div className="card-title">معاينة الترحيب</div>
          </div>

          {/* Preview */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '16/9',
            backgroundColor: '#0d1117',
            backgroundImage: ws.welcomeImage ? `url("${ws.welcomeImage.trim()}")` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border)',
          }}>
            {ws.welcomeImage ? (
              <div style={{
                position: 'absolute',
                left: `${(ws.welcomeAvatarX / 1920) * 100}%`,
                top: `${(ws.welcomeAvatarY / 1080) * 100}%`,
                width: `${(ws.welcomeAvatarSize / 1920) * 100}%`,
                height: `${(ws.welcomeAvatarSize / 1080) * 100}%`,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: `${ws.welcomeAvatarRadius}%`,
                border: '2px solid var(--accent)',
                transform: 'translate(-50%, -50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5vw', fontWeight: 'bold',
              }}>👤</div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span>ضع رابط صورة للمعاينة</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            * المواقع تُحسب بناءً على 1920×1080
          </div>

          <div className="info-box" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 معلومات:</div>
            <div>• رسالة الترحيب تُرسل عند انضمام أي عضو جديد</div>
            <div>• الصورة تظهر مع اسم العضو وعدد الأعضاء</div>
            <div>• اضغط "تجربة" للاختبار قبل التطبيق</div>
          </div>
        </div>
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
    <div className="animate-fade-up table-wrap">
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
              <td><span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{r.memberCount}</span></td>
              <td><code>{r.color}</code></td>
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
    <div className="animate-fade-up table-wrap">
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
              <td>
                <span style={{ fontWeight: 900, fontSize: 16, color: i === 0 ? 'var(--gold)' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : 'var(--muted)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={m.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.displayName}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>@{m.username}</div>
                  </div>
                </div>
              </td>
              <td><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{(m.balance || 0).toLocaleString()} 💰</span></td>
              <td><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{(m.bank || 0).toLocaleString()}</span></td>
              <td><span className="badge badge-purple">Lv.{m.level || 0}</span></td>
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

  const titles = {
    overview:   '📊 نظرة عامة',
    colors:     '🎨 نظام الألوان',
    logs:       '📋 قناة السجلات',
    welcome:    '👋 إعدادات الترحيب',
    protection: '🛡️ الحماية',
    roles:      '🏷️ الأدوار',
    leaderboard:'🏆 المتصدرون',
  }

  const sections = {
    overview:    <Overview info={info} />,
    colors:      <ColorsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    logs:        <LogsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    welcome:     <WelcomeSection guildId={guildId} channels={channels} toast={toast} />,
    protection:  <ProtectionSection guildId={guildId} toast={toast} />,
    roles:       <RolesSection guildId={guildId} />,
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
              {selectedGuild?.icon && <img src={selectedGuild.icon} alt="" style={{ width: 16, height: 16, borderRadius: '50%', marginLeft: 6, verticalAlign: 'middle' }} />}
              🌐 {selectedGuild?.name || guildId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
