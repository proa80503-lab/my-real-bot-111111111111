import React, { useEffect, useState } from 'react'

function Dashboard({ token, onLogout }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setError(null)
      } else {
        setError(data.error)
        if (res.status === 401) onLogout() // Token expired
      }
    } catch (err) {
      setError('Connection error')
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [token])

  const submitControl = async (endpoint, payload, successMsg) => {
    try {
      const res = await fetch(`/api/control/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        alert(successMsg)
      } else {
        alert('❌ خطأ: ' + (data.error || 'حدث خطأ'))
      }
    } catch (err) {
      alert('❌ خطأ في الاتصال بالخادم')
    }
  }

  if (error) return <div className="content wrap"><div className="error-msg">{error}</div></div>
  if (!stats) return <div className="content wrap">Loading...</div>

  return (
    <div>
      {/* HEADER */}
      <div className="hdr">
        <div className="wrap">
          <div className="hdr-in">
            <div className="logo">
              <div className="logo-ico">🤖</div>
              <div className="logo-txt">
                <h1>لوحة تحكم البوت</h1>
                <p>{stats.botTag} • {stats.platform}</p>
              </div>
            </div>
            <div className="hdr-right">
              <div className="status-pill"><div className="status-dot"></div>Online</div>
              <button className="btn sm danger" onClick={onLogout}>تسجيل خروج</button>
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="nav">
        <div className="wrap">
          <div className="nav-in">
            <button className={`ntab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 نظرة عامة</button>
            <button className={`ntab ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>🛠️ التحكم الكامل</button>
            <button className={`ntab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>⚙️ النظام</button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="content wrap">
        {activeTab === 'overview' && (
          <div>
            <div className="stats-g">
              <div className="sc blue"><div className="sc-ico">⚡</div><div className="sc-val">{stats.totalCmds}</div><div className="sc-lbl">إجمالي الأوامر</div></div>
              <div className="sc green"><div className="sc-ico">👥</div><div className="sc-val">{stats.totalUsers}</div><div className="sc-lbl">مستخدمو قاعدة البيانات</div></div>
              <div className="sc cyan"><div className="sc-ico">🌐</div><div className="sc-val">{stats.discordGuilds}</div><div className="sc-lbl">السيرفرات النشطة</div></div>
              <div className="sc yellow"><div className="sc-ico">💰</div><div className="sc-val">{Math.round(stats.totalMoney).toLocaleString()}</div><div className="sc-lbl">إجمالي الأموال</div></div>
              <div className="sc blue" style={{'--accent':'#00bcd4'}}><div className="sc-ico">📡</div><div className="sc-val" style={{color: stats.ping < 100 ? '#57f287' : '#fee75c'}}>{stats.ping}ms</div><div className="sc-lbl">WebSocket Ping</div></div>
            </div>
            
            <h2 className="stitle">🏆 أغنى المستخدمين</h2>
            <div className="tw" style={{background: 'var(--card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'right'}}>
                <thead>
                  <tr style={{background: 'var(--card2)'}}>
                    <th style={{padding: 12, color: 'var(--muted)'}}>#</th>
                    <th style={{padding: 12, color: 'var(--muted)'}}>المعرف</th>
                    <th style={{padding: 12, color: 'var(--muted)'}}>الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u, i) => (
                    <tr key={u.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                      <td style={{padding: 12}}>{i + 1}</td>
                      <td style={{padding: 12}}><code>{u.id}</code></td>
                      <td style={{padding: 12, color: 'var(--yellow)', fontWeight: 'bold'}}>{u.balance.toLocaleString()} 💰</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'control' && (
          <div>
            <h2 className="stitle">🛠️ التحكم الشامل في البوت</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
              
              {/* Settings */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>⚙️ إعدادات البوت الحية</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  submitControl('settings', {
                    autoMessagesEnabled: e.target.am.value === 'true',
                    ghostPingEnabled: e.target.gp.value === 'true',
                    randomEventInterval: e.target.rnd.value,
                    challengeInterval: e.target.chal.value,
                    moodMessageInterval: e.target.mood.value,
                    aiRandomReplyFrequency: e.target.ai.value
                  }, 'تم حفظ الإعدادات')
                }}>
                  <div className="input-box"><label>الرسائل التلقائية</label><select name="am"><option value="true">مفعل</option><option value="false">معطل</option></select></div>
                  <div className="input-box"><label>المنشن الوهمي</label><select name="gp"><option value="true">مفعل</option><option value="false">معطل</option></select></div>
                  <div className="input-box"><label>فاصل الأحداث العشوائية</label><input type="number" name="rnd" placeholder="20" /></div>
                  <div className="input-box"><label>فاصل التحديات</label><input type="number" name="chal" placeholder="45" /></div>
                  <div className="input-box"><label>فاصل المزاج</label><input type="number" name="mood" placeholder="180" /></div>
                  <div className="input-box"><label>تكرار الرد التلقائي AI</label><input type="number" name="ai" placeholder="10" /></div>
                  <button type="submit" className="btn success" style={{width:'100%'}}>💾 حفظ الإعدادات</button>
                </form>
              </div>

              {/* Economy Manage */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>💰 إدارة الاقتصاد</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  submitControl('economy_manage', {
                    userId: e.target.userId.value,
                    amount: e.target.amount.value,
                    action: e.target.action.value
                  }, 'تم تنفيذ العملية المالية')
                  e.target.reset()
                }}>
                  <div className="input-box"><label>ID المستخدم</label><input name="userId" required /></div>
                  <div className="input-box"><label>المبلغ</label><input type="number" name="amount" required /></div>
                  <div className="input-box"><label>العملية</label>
                    <select name="action">
                      <option value="add">➕ إضافة رصيد</option>
                      <option value="remove">➖ خصم رصيد</option>
                      <option value="set">✏️ تعيين الرصيد</option>
                    </select>
                  </div>
                  <button type="submit" className="btn" style={{background:'var(--yellow)', color:'#000', width:'100%'}}>💾 تنفيذ العملية</button>
                </form>
              </div>

              {/* Command Management */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>⛔ إدارة الأوامر</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  submitControl('command', {
                    command: e.target.command.value,
                    action: e.target.action.value
                  }, 'تم تحديث حالة الأمر')
                  e.target.reset()
                }}>
                  <div className="input-box">
                    <label>اختر الأمر</label>
                    <select name="command" required>
                      <option value="" disabled selected>-- اختر أمراً --</option>
                      {Object.values(stats.cmdStats).flat().map(c => {
                        const cmdName = c.replace('.js', '')
                        return <option key={cmdName} value={cmdName}>{cmdName}</option>
                      })}
                    </select>
                  </div>
                  <div className="input-box">
                    <label>العملية</label>
                    <select name="action" required>
                      <option value="disable">❌ تعطيل الأمر</option>
                      <option value="enable">✅ تفعيل الأمر</option>
                    </select>
                  </div>
                  <button type="submit" className="btn danger" style={{width:'100%'}}>تحديث الأمر</button>
                </form>
              </div>

              {/* Moderation */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>🛡️ الإشراف والعقوبات</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  submitControl('moderation', {
                    guildId: e.target.guildId.value,
                    userId: e.target.userId.value,
                    reason: e.target.reason.value,
                    action: e.target.action.value
                  }, 'تم تنفيذ إجراء الإشراف')
                  e.target.reset()
                }}>
                  <div className="input-box"><label>ID السيرفر</label><input name="guildId" required /></div>
                  <div className="input-box"><label>ID المستخدم</label><input name="userId" required /></div>
                  <div className="input-box"><label>السبب</label><input name="reason" /></div>
                  <div className="input-box"><label>الإجراء</label>
                    <select name="action">
                      <option value="warn">⚠️ إنذار</option>
                      <option value="kick">👢 طرد</option>
                      <option value="ban">🔨 حظر</option>
                      <option value="unban">🕊️ فك الحظر</option>
                    </select>
                  </div>
                  <button type="submit" className="btn danger" style={{width:'100%'}}>🚨 تنفيذ العقوبة</button>
                </form>
              </div>

              {/* Announcements */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>📢 إرسال إعلان للديسكورد</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  submitControl('announce', {
                    channelId: e.target.channelId.value,
                    message: e.target.message.value
                  }, 'تم إرسال الإعلان')
                  e.target.reset()
                }}>
                  <div className="input-box"><label>ID الروم</label><input name="channelId" required /></div>
                  <div className="input-box"><label>الرسالة</label><textarea name="message" rows="3" required></textarea></div>
                  <button type="submit" className="btn" style={{background:'var(--orange)', width:'100%'}}>🚀 إرسال الرسالة</button>
                </form>
              </div>

              {/* Bot Restart */}
              <div className="sc" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '15px', color: '#fff' }}>🔄 صيانة البوت</h3>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '15px' }}>يتطلب PM2, Nodemon, أو بيئة سحابية (Render) لإعادة التشغيل تلقائياً.</p>
                <button className="btn danger" style={{width:'100%'}} onClick={() => {
                  if (window.confirm('هل أنت متأكد من إعادة التشغيل؟')) {
                    submitControl('restart', {}, 'جاري إعادة التشغيل...')
                  }
                }}>🔄 إعادة التشغيل (Restart)</button>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div>
            <h2 className="stitle">⚙️ معلومات النظام</h2>
            <div className="stats-g">
              <div className="sc"><div className="sc-ico">💻</div><div className="sc-val" style={{fontSize: 20}}>{stats.nodeVersion}</div><div className="sc-lbl">Node.js</div></div>
              <div className="sc"><div className="sc-ico">🧠</div><div className="sc-val" style={{fontSize: 24}}>{stats.heapMB} MB</div><div className="sc-lbl">Heap Used</div></div>
              <div className="sc"><div className="sc-ico">⏱️</div><div className="sc-val" style={{fontSize: 20}}>{Math.round(stats.uptime / 3600)}h</div><div className="sc-lbl">Uptime</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
