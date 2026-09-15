import React, { useState, useEffect } from 'react'
import { useAuth, apiFetch } from '../auth'
import { Sidebar, StatCard, ToggleRow, ToastContainer, useToast } from '../components/ui'

// ─── Sections ─────────────────────────────────────────────────────────────────
function Overview({ stats }) {
  if (!stats) return <div className="loading-screen"><div className="spinner" /><div className="loading-text">جاري تحميل البيانات...</div></div>
  const up = stats.uptime || 0
  const upH = Math.floor(up / 3600), upM = Math.floor((up % 3600) / 60)

  return (
    <div>
      <div className="cards-grid" style={{ marginBottom: 28 }}>
        <StatCard icon="🌐" value={stats.discordGuilds} label="السيرفرات" color="green" />
        <StatCard icon="👥" value={(stats.discordUsers || 0).toLocaleString()} label="المستخدمون" />
        <StatCard icon="⚡" value={`${stats.ping || 0}ms`} label="Ping" color="cyan" />
        <StatCard icon="⏱️" value={`${upH}س ${upM}د`} label="Uptime" color="gold" />
        <StatCard icon="💾" value={`${stats.heapMB || 0} MB`} label="RAM" />
        <StatCard icon="⚙️" value={stats.totalCmds || 0} label="الأوامر" />
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🤖</span>
            <div>
              <div className="card-title">معلومات البوت</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            {stats.botAvatar && <img src={stats.botAvatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--accent)' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{stats.botTag || 'Bot#0000'}</div>
              <div className="badge badge-green" style={{ marginTop: 4 }}><span className="status-dot online" />Online</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
            <div>🖥️ Node.js: {stats.nodeVersion}</div>
            <div>💽 Platform: {stats.platform}</div>
            <div>📦 RAM: {stats.heapMB} MB / {stats.rssMB} MB RSS</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <div className="card-title">السيرفرات الأخيرة</div>
          </div>
          {(stats.guilds || []).slice(0, 5).map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border2)' }}>
              {g.icon
                ? <img src={g.icon} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌐</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>👥 {g.memberCount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ControlSection({ stats, toast }) {
  const settings = stats?.botSettings || {}
  const [s, setS] = useState({
    autoMessagesEnabled: true,
    aiRandomReplyEnabled: true,
    ghostPingEnabled: false,
    dailyReminderEnabled: true,
    dailySummaryEnabled: true,
    antiRaidAccountAgeEnabled: true,
    ...settings,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) setS(prev => ({ ...prev, ...settings }))
  }, [stats])

  const save = async () => {
    setSaving(true)
    const res = await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify(s) })
    setSaving(false)
    if (res?.success) toast('تم حفظ الإعدادات ✅', 'success')
    else toast('خطأ في الحفظ', 'error')
  }

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">🤖</span><div className="card-title">الإعدادات العامة</div></div>
        <ToggleRow label="الرسائل التلقائية" description="رسائل المزاج، التحديات، الأحداث العشوائية" checked={s.autoMessagesEnabled} onChange={v => setS(p => ({ ...p, autoMessagesEnabled: v }))} />
        <ToggleRow label="الذكاء الاصطناعي" description="رد AI تلقائي عشوائي" checked={s.aiRandomReplyEnabled} onChange={v => setS(p => ({ ...p, aiRandomReplyEnabled: v }))} />
        <ToggleRow label="التذكير اليومي" description="رسالة صباحية الساعة 9" checked={s.dailyReminderEnabled} onChange={v => setS(p => ({ ...p, dailyReminderEnabled: v }))} />
        <ToggleRow label="الملخص اليومي" description="ملخص نشاط السيرفر مساءً" checked={s.dailySummaryEnabled} onChange={v => setS(p => ({ ...p, dailySummaryEnabled: v }))} />
        <ToggleRow label="Ghost Ping" description="منشن وهمي (معطّل افتراضياً)" checked={s.ghostPingEnabled} onChange={v => setS(p => ({ ...p, ghostPingEnabled: v }))} />
        <ToggleRow label="حماية الحسابات الجديدة" description="رفض حسابات عمرها أقل من 7 أيام" checked={s.antiRaidAccountAgeEnabled} onChange={v => setS(p => ({ ...p, antiRaidAccountAgeEnabled: v }))} />
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? '⏳ حفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}

function ServersSection({ stats }) {
  const guilds = stats?.guilds || []
  return (
    <div>
      <div className="page-header">
        <div className="page-title">🌐 السيرفرات</div>
        <div className="badge">{guilds.length} سيرفر</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>السيرفر</th>
              <th>الأعضاء</th>
              <th>القنوات</th>
              <th>الأدوار</th>
              <th>المالك</th>
            </tr>
          </thead>
          <tbody>
            {guilds.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {g.icon
                      ? <img src={g.icon} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                      : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌐</div>
                    }
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.id}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontWeight: 700 }}>{(g.memberCount || 0).toLocaleString()}</span></td>
                <td>{g.channels}</td>
                <td>{g.roles}</td>
                <td><code style={{ fontSize: 11, color: 'var(--muted)' }}>{g.ownerId}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EconomySection({ toast }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState('add')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch('/bot-owner/economy', { method: 'POST', body: JSON.stringify({ userId, amount: Number(amount), action }) })
    setLoading(false)
    if (res?.success) toast(`تمت العملية على ${userId} ✅`, 'success')
    else toast(res?.error || 'خطأ', 'error')
  }

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">💰</span><div className="card-title">إدارة رصيد المستخدم</div></div>
        <form onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Discord User ID</label>
            <input className="form-input" placeholder="123456789..." value={userId} onChange={e => setUserId(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">المبلغ</label>
            <input className="form-input" type="number" min="0" placeholder="1000" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">العملية</label>
            <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
              <option value="add">إضافة</option>
              <option value="remove">خصم</option>
              <option value="set">تحديد</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳...' : '✅ تنفيذ'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AnnounceSection({ stats, toast }) {
  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch('/bot-owner/announce', { method: 'POST', body: JSON.stringify({ channelId, message }) })
    setLoading(false)
    if (res?.success) { toast('تم الإرسال ✅', 'success'); setMessage('') }
    else toast(res?.error || 'خطأ', 'error')
  }

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">📢</span><div className="card-title">إرسال إعلان</div></div>
        <form onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Channel ID</label>
            <input className="form-input" placeholder="123456789..." value={channelId} onChange={e => setChannelId(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">الرسالة</label>
            <textarea className="form-textarea" rows={4} placeholder="اكتب الرسالة هنا..." value={message} onChange={e => setMessage(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳...' : '📤 إرسال'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LogsSection({ stats }) {
  const logs = stats?.logs || []
  return (
    <div className="card">
      <div className="card-header"><span className="card-icon">📋</span><div className="card-title">سجلات البوت (آخر 200 سطر)</div></div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, fontFamily: 'var(--mono)', fontSize: 11, maxHeight: 500, overflowY: 'auto', lineHeight: 1.8, direction: 'ltr', textAlign: 'left' }}>
        {logs.length === 0 ? <div style={{ color: 'var(--muted)' }}>لا توجد سجلات</div> : logs.map((line, i) => (
          <div key={i} style={{ color: line.includes('❌') || line.includes('ERROR') ? 'var(--red)' : line.includes('✅') || line.includes('ready') ? 'var(--green)' : 'var(--text2)' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResponsesSection({ toast }) {
  const [responses, setResponses] = useState([])
  const [trigger, setTrigger] = useState('')
  const [response, setResponse] = useState('')
  const [exact, setExact] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/bot-owner/responses').then(d => { if (d?.success) setResponses(d.responses); setLoading(false) })
  }, [])

  const add = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/bot-owner/response', { method: 'POST', body: JSON.stringify({ trigger, response, exactMatch: exact }) })
    if (res?.success) { toast('تمت الإضافة ✅', 'success'); setTrigger(''); setResponse(''); apiFetch('/bot-owner/responses').then(d => d?.success && setResponses(d.responses)) }
    else toast(res?.error || 'خطأ', 'error')
  }

  const del = async (id) => {
    await apiFetch(`/bot-owner/response/${id}`, { method: 'DELETE' })
    setResponses(r => r.filter(x => x.id !== id))
    toast('تم الحذف', 'info')
  }

  return (
    <div className="cards-grid-2">
      <div className="card">
        <div className="card-header"><span className="card-icon">🤖</span><div className="card-title">إضافة رد تلقائي</div></div>
        <form onSubmit={add}>
          <div className="form-group">
            <label className="form-label">الـ Trigger (الكلمة أو العبارة)</label>
            <input className="form-input" placeholder="مثال: مرحبا" value={trigger} onChange={e => setTrigger(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">الرد</label>
            <textarea className="form-textarea" placeholder="مثال: أهلاً وسهلاً! 👋" value={response} onChange={e => setResponse(e.target.value)} required />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={exact} onChange={e => setExact(e.target.checked)} />
            تطابق تام فقط
          </label>
          <button className="btn btn-primary" type="submit">➕ إضافة</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-icon">📋</span><div className="card-title">الردود الحالية ({responses.length})</div></div>
        {loading ? <div className="spinner" style={{ margin: '20px auto' }} /> : responses.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>لا توجد ردود تلقائية</div> : responses.map(r => (
          <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>"{r.trigger}"</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.response.substring(0, 60)}...</div>
              {r.exactMatch && <span className="badge badge-blue" style={{ marginTop: 4 }}>تطابق تام</span>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Welcome Settings ─────────────────────────────────────────────────────────
function WelcomeSection({ stats, toast }) {
  const settings = stats?.botSettings || {}
  const [s, setS] = useState({
    welcomeImage: '',
    welcomeAvatarX: 0,
    welcomeAvatarY: 0,
    welcomeAvatarWidth: 256,
    welcomeAvatarHeight: 256,
    welcomeAvatarRadius: 50,
    ...settings,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) setS(prev => ({ ...prev, ...settings }))
  }, [stats])

  const save = async () => {
    setSaving(true)
    const res = await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify(s) })
    setSaving(false)
    if (res?.success) toast('تم حفظ إعدادات الترحيب ✅', 'success')
    else toast('خطأ في الحفظ', 'error')
  }

  const testWelcome = async () => {
    setSaving(true)
    const res = await apiFetch('/bot-owner/test-welcome', { method: 'POST' })
    setSaving(false)
    if (res?.success) toast('تم إرسال رسالة تجريبية بنجاح! تفقد الديسكورد 🚀', 'success')
    else toast(res?.error || 'حدث خطأ أثناء إرسال التجربة', 'error')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>تخصيص صورة الترحيب العامة لجميع السيرفرات</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={testWelcome} disabled={saving}>
            🧪 تجربة الترحيب
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? '⏳ حفظ...' : '💾 حفظ الترحيب'}
          </button>
        </div>
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header"><span className="card-icon">⚙️</span><div className="card-title">الإعدادات</div></div>
          
          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>رابط صورة الترحيب (Background URL)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="https://example.com/image.png" 
              value={s.welcomeImage || ''} 
              onChange={e => setS({ ...s, welcomeImage: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>موقع العضو أفقياً (X): {s.welcomeAvatarX}</label>
            <input 
              type="range" min="0" max="1920" 
              value={s.welcomeAvatarX || 0} 
              onChange={e => setS({ ...s, welcomeAvatarX: parseInt(e.target.value) })} 
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>موقع العضو عمودياً (Y): {s.welcomeAvatarY}</label>
            <input 
              type="range" min="0" max="1080" 
              value={s.welcomeAvatarY || 0} 
              onChange={e => setS({ ...s, welcomeAvatarY: parseInt(e.target.value) })} 
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>عرض الصورة (Width): {s.welcomeAvatarWidth}</label>
            <input 
              type="range" min="50" max="1920" 
              value={s.welcomeAvatarWidth || 256} 
              onChange={e => setS({ ...s, welcomeAvatarWidth: parseInt(e.target.value) })} 
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>طول الصورة (Height): {s.welcomeAvatarHeight}</label>
            <input 
              type="range" min="50" max="1080" 
              value={s.welcomeAvatarHeight || 256} 
              onChange={e => setS({ ...s, welcomeAvatarHeight: parseInt(e.target.value) })} 
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>دوران زوايا الصورة (Radius %): {s.welcomeAvatarRadius}%</label>
            <input 
              type="range" min="0" max="50" 
              value={s.welcomeAvatarRadius || 50} 
              onChange={e => setS({ ...s, welcomeAvatarRadius: parseInt(e.target.value) })} 
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-icon">👁️</span><div className="card-title">معاينة مباشرة (شاشة 1920x1080)</div></div>
          
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#111',
            backgroundImage: s.welcomeImage ? `url(${s.welcomeImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 8,
            overflow: 'hidden',
            border: '2px dashed var(--border)'
          }}>
            {s.welcomeImage ? (
              <div 
                style={{
                  position: 'absolute',
                  left: `${(s.welcomeAvatarX / 1920) * 100}%`,
                  top: `${(s.welcomeAvatarY / 1080) * 100}%`,
                  width: `${(s.welcomeAvatarWidth / 1920) * 100}%`,
                  height: `${(s.welcomeAvatarHeight / 1080) * 100}%`,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: `${s.welcomeAvatarRadius}%`,
                  border: '3px solid #00FF00',
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1vw',
                  fontWeight: 'bold',
                  color: '#333'
                }}
              >
                Avatar
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                يرجى وضع رابط الصورة لمعاينة التصميم
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            * يتم حساب المواقع بناءً على دقة شاشة 1920x1080.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Bot Owner Dashboard ─────────────────────────────────────────────────
export default function BotOwnerDashboard() {
  const { user, logout } = useAuth()
  const [section, setSection] = useState('overview')
  const [stats, setStats] = useState(null)
  const { toasts, toast } = useToast()

  useEffect(() => {
    apiFetch('/bot-owner/stats').then(d => { if (d?.success) setStats(d.stats) })
  }, [])

  const sections = { overview: <Overview stats={stats} />, control: <ControlSection stats={stats} toast={toast} />, servers: <ServersSection stats={stats} />, economy: <EconomySection toast={toast} />, announce: <AnnounceSection stats={stats} toast={toast} />, logs: <LogsSection stats={stats} />, responses: <ResponsesSection toast={toast} />, welcome: <WelcomeSection stats={stats} toast={toast} /> }

  return (
    <div className="page-layout">
      <Sidebar activeSection={section} onSection={setSection} role="bot_owner" user={user} onLogout={logout} />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">
            {section === 'overview' && '📊 نظرة عامة'}
            {section === 'control' && '⚙️ إعدادات البوت'}
            {section === 'servers' && '🌐 السيرفرات'}
            {section === 'economy' && '💰 الاقتصاد'}
            {section === 'announce' && '📢 الإعلانات'}
            {section === 'logs' && '📋 السجلات'}
            {section === 'responses' && '🤖 الردود التلقائية'}
            {section === 'welcome' && '🖼️ صورة الترحيب'}
          </h1>
          <span className="page-badge gold">👑 Bot Owner</span>
        </div>
        {sections[section] || null}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
