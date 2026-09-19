import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { ToastContainer, useToast } from '../components/ui'

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function Countdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endsAt - Date.now()))

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(Math.max(0, endsAt - Date.now())), 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  if (timeLeft <= 0) return <span style={{ color: 'var(--muted)' }}>انتهى</span>

  const hours = Math.floor(timeLeft / 3600000)
  const minutes = Math.floor((timeLeft % 3600000) / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)

  const color = timeLeft < 60000 ? 'var(--red)' : timeLeft < 600000 ? 'var(--yellow)' : 'var(--green)'

  return (
    <span style={{ color, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>
      {hours > 0 && `${hours}:${String(minutes).padStart(2, '0')}:`}
      {hours === 0 && `${minutes}:`}
      {String(seconds).padStart(2, '0')}
    </span>
  )
}

// ─── Store Page ───────────────────────────────────────────────────────────────
function StorePage({ toast, userBalance, onBalanceUpdate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [category, setCategory] = useState('all')

  useEffect(() => {
    apiFetch('/public/store').then(d => {
      if (d?.success) setItems(d.items)
      setLoading(false)
    })
  }, [])

  const buy = async (itemId) => {
    if (buying) return
    setBuying(itemId)
    const res = await apiFetch('/public/store/buy', { method: 'POST', body: JSON.stringify({ itemId }) })
    setBuying(null)
    if (res?.success) {
      toast(res.message || '✅ تم الشراء بنجاح!', 'success')
      if (res.newBalance !== undefined) onBalanceUpdate(res.newBalance)
    } else {
      toast(res?.error || 'خطأ في الشراء', 'error')
    }
  }

  const categories = [
    { id: 'all', label: '🌟 الكل' },
    { id: 'tools', label: '🛡️ أدوات' },
    { id: 'upgrades', label: '⬆️ ترقيات' },
    { id: 'electronics', label: '📱 إلكترونيات' },
    { id: 'vehicles', label: '🚗 مركبات' },
    { id: 'realestate', label: '🏠 عقارات' },
    { id: 'other', label: '📦 أخرى' },
  ]

  const filtered = category === 'all' ? items : items.filter(i => i.category === category)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {categories.map(c => (
          <button key={c.id} className={`btn btn-sm ${category === c.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
        <span style={{ marginRight: 'auto', fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          {filtered.length} منتج
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">لا توجد منتجات في هذه الفئة</div>
        </div>
      ) : (
        <div className="store-grid">
          {filtered.map(item => {
            const canAfford = userBalance >= item.price
            const isBuying = buying === item.id
            const isPermanent = item.duration >= 999
            return (
              <div key={item.id} className="store-item">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="store-item-img" onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <div className="store-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                    {item.emoji}
                  </div>
                )}
                <div className="store-item-body">
                  <div className="store-item-name">{item.emoji} {item.name}</div>
                  <div className="store-item-desc">{item.description || 'غرض مميز من المتجر'}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {isPermanent
                      ? <span className="badge badge-green">دائم ✅</span>
                      : <span className="badge badge-blue">⏱️ {item.duration} يوم</span>
                    }
                  </div>
                  <div className="store-item-price">{(item.price || 0).toLocaleString()} 💰</div>
                  <button
                    className={`btn ${canAfford ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => canAfford && buy(item.id)}
                    disabled={isBuying || !canAfford}
                    style={{ width: '100%' }}
                  >
                    {isBuying ? '⏳ جاري الشراء...' : !canAfford ? '❌ رصيد غير كافٍ' : `🛒 شراء`}
                  </button>
                  {!canAfford && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, textAlign: 'center' }}>
                      تحتاج {((item.price || 0) - userBalance).toLocaleString()} 💰 إضافية
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Auction Page ─────────────────────────────────────────────────────────────
function AuctionPage({ toast, userBalance, onBalanceUpdate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [selectedAuction, setSelectedAuction] = useState(null)
  const [bidding, setBidding] = useState(false)
  // Create auction
  const [showCreate, setShowCreate] = useState(false)
  const [newItemId, setNewItemId] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDuration, setNewDuration] = useState('60')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const res = await apiFetch('/public/auction')
    if (res?.success) {
      setData(res)
      if (res.userBalance !== undefined) onBalanceUpdate(res.userBalance)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // تحديث كل 15 ثانية
    return () => clearInterval(interval)
  }, [load])

  const bid = async () => {
    if (!selectedAuction || !bidAmount) return
    setBidding(true)
    const res = await apiFetch('/public/auction/bid', {
      method: 'POST',
      body: JSON.stringify({ auctionId: selectedAuction.id, amount: Number(bidAmount) })
    })
    setBidding(false)
    if (res?.success) {
      toast(res.message || '✅ تمت المزايدة!', 'success')
      setBidAmount('')
      if (res.newBalance !== undefined) onBalanceUpdate(res.newBalance)
      load()
    } else {
      toast(res?.error || 'خطأ', 'error')
    }
  }

  const cancelAuction = async (auctionId) => {
    const res = await apiFetch(`/public/auction/${auctionId}`, { method: 'DELETE' })
    if (res?.success) { toast(res.message || '✅ تم إلغاء المزاد', 'success'); load() }
    else toast(res?.error || 'خطأ', 'error')
  }

  const createAuction = async (e) => {
    e.preventDefault()
    if (!newItemId || !newPrice) return toast('يرجى ملء جميع الحقول', 'error')
    setCreating(true)
    const res = await apiFetch('/public/auction/create', {
      method: 'POST',
      body: JSON.stringify({ itemId: newItemId, startingPrice: Number(newPrice), durationMinutes: Number(newDuration) })
    })
    setCreating(false)
    if (res?.success) {
      toast(res.message || '✅ تم إنشاء المزاد!', 'success')
      setShowCreate(false); setNewItemId(''); setNewPrice(''); setNewDuration('60')
      load()
    } else {
      toast(res?.error || 'خطأ', 'error')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="spinner" />
    </div>
  )

  const myInventory = data?.userInventory || []

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-purple">{data?.totalActive || 0} مزاد نشط</span>
          <button className="btn btn-sm btn-ghost" onClick={load}>🔄 تحديث</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ إلغاء' : '➕ إنشاء مزاد جديد'}
        </button>
      </div>

      {/* Create Auction Form */}
      {showCreate && (
        <div className="card animate-fade-up" style={{ marginBottom: 24, border: '1px solid rgba(168,85,247,0.3)' }}>
          <div className="card-header">
            <span className="card-icon">🏛️</span>
            <div className="card-title">إنشاء مزاد جديد</div>
          </div>
          <form onSubmit={createAuction}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">🎒 الغرض (من حقيبتك)</label>
                <select className="form-select" value={newItemId} onChange={e => setNewItemId(e.target.value)} required>
                  <option value="">— اختر غرضاً —</option>
                  {myInventory.map(item => (
                    <option key={item.itemId || item.id} value={item.itemId || item.id}>
                      {item.itemId || item.id}
                    </option>
                  ))}
                </select>
                {myInventory.length === 0 && (
                  <div className="form-hint" style={{ color: 'var(--red)' }}>⚠️ حقيبتك فارغة! اشترِ من المتجر أولاً</div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">💰 السعر الابتدائي</label>
                <input className="form-input" type="number" min="100" placeholder="1000" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">⏱️ المدة (دقيقة)</label>
                <select className="form-select" value={newDuration} onChange={e => setNewDuration(e.target.value)}>
                  <option value="5">5 دقائق</option>
                  <option value="15">15 دقيقة</option>
                  <option value="30">30 دقيقة</option>
                  <option value="60">ساعة واحدة</option>
                  <option value="120">ساعتان</option>
                  <option value="360">6 ساعات</option>
                  <option value="720">12 ساعة</option>
                  <option value="1440">24 ساعة</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creating || myInventory.length === 0} style={{ marginTop: 14 }}>
              {creating ? '⏳...' : '🏛️ إنشاء المزاد'}
            </button>
          </form>
        </div>
      )}

      {/* Auctions Grid + Bid Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedAuction ? '1fr 360px' : '1fr', gap: 20 }}>
        {/* Auctions List */}
        <div>
          {(!data?.auctions || data.auctions.length === 0) ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <div className="empty-state-title">لا توجد مزادات نشطة حالياً</div>
                <div className="empty-state-desc">أنشئ مزاداً أو انتظر مزادات الأعضاء الآخرين</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {data.auctions.map(a => (
                <div
                  key={a.id}
                  className="auction-card"
                  style={{ cursor: !a.isMyAuction ? 'pointer' : 'default', border: selectedAuction?.id === a.id ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                  onClick={() => { if (!a.isMyAuction) { setSelectedAuction(a); setBidAmount(String(a.currentPrice + 1)) } }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    {a.itemImage ? (
                      <img src={a.itemImage} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 8, background: 'var(--purple2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid var(--border)' }}>
                        {a.itemEmoji}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800 }}>{a.itemEmoji} {a.itemName}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>بائع: {a.sellerName}</div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <Countdown endsAt={a.endsAt} />
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>متبقي</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>السعر الحالي</div>
                          <div className="auction-price">{(a.currentPrice || 0).toLocaleString()} 💰</div>
                        </div>
                        {a.highestBidderName && (
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>أعلى مزايد</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: a.isLeading ? 'var(--green)' : 'var(--text2)' }}>
                              {a.isLeading ? '🏆 أنت!' : `👤 ${a.highestBidderName}`}
                            </div>
                          </div>
                        )}
                        <div style={{ marginRight: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {a.isMyAuction && <span className="badge badge-yellow">مزادك 👑</span>}
                          {a.isLeading && <span className="badge badge-green">أنت الأعلى 🏆</span>}
                          {!a.isMyAuction && !a.isLeading && <span className="badge badge-blue">انقر للمزايدة</span>}
                        </div>
                      </div>
                      {a.isMyAuction && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ marginTop: 10 }}
                          onClick={(e) => { e.stopPropagation(); cancelAuction(a.id) }}
                        >
                          🗑️ إلغاء المزاد
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bid Panel */}
        {selectedAuction && (
          <div className="card animate-fade-up" style={{ position: 'sticky', top: 20, height: 'fit-content', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="card-header">
              <span className="card-icon">⚡</span>
              <div>
                <div className="card-title">المزايدة</div>
                <div className="card-subtitle">{selectedAuction.itemEmoji} {selectedAuction.itemName}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>السعر الحالي</div>
              <div className="auction-price">{(selectedAuction.currentPrice || 0).toLocaleString()} 💰</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>رصيدك</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: userBalance >= selectedAuction.currentPrice ? 'var(--green)' : 'var(--red)' }}>
                {(userBalance || 0).toLocaleString()} 💰
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>الوقت المتبقي</div>
              <Countdown endsAt={selectedAuction.endsAt} />
            </div>

            <div className="form-group">
              <label className="form-label">💰 مبلغ مزايدتك</label>
              <input
                type="number"
                className="form-input"
                min={selectedAuction.currentPrice + 1}
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder={String(selectedAuction.currentPrice + 100)}
              />
              <div className="form-hint">الحد الأدنى: {(selectedAuction.currentPrice + 1).toLocaleString()} 💰</div>
            </div>

            {/* Quick bid buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
              {[100, 500, 1000].map(bump => (
                <button key={bump} className="btn btn-ghost btn-sm" onClick={() => setBidAmount(String(selectedAuction.currentPrice + bump))}>
                  +{bump.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={bid}
              disabled={bidding || Number(bidAmount) <= selectedAuction.currentPrice || userBalance < Number(bidAmount)}
            >
              {bidding ? '⏳ جاري المزايدة...' : '⚡ تقديم المزايدة'}
            </button>

            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => { setSelectedAuction(null); setBidAmount('') }}>
              ✕ إلغاء
            </button>

            {/* Bid History */}
            {selectedAuction.bids && selectedAuction.bids.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>سجل المزايدات</div>
                {selectedAuction.bids.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border2)', color: 'var(--text2)' }}>
                    <span>👤 {b.username}</span>
                    <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{(b.amount || 0).toLocaleString()} 💰</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Store/Auction Page ──────────────────────────────────────────────────
export default function StoreAuctionPage() {
  const location = useLocation()
  const { user } = useAuth()
  const { toasts, toast } = useToast()
  const [tab, setTab] = useState(location.pathname.includes('auction') ? 'auction' : 'store')
  const [userBalance, setUserBalance] = useState(0)

  // جلب رصيد المستخدم
  useEffect(() => {
    if (user) {
      apiFetch('/public/auction').then(d => {
        if (d?.success && d.userBalance !== undefined) setUserBalance(d.userBalance)
      })
    }
  }, [user])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h1 className="page-title">{tab === 'store' ? '🛒 متجر البوت' : '🏛️ ساحة المزادات'}</h1>
          {user && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 16px', fontSize: 14, fontWeight: 700 }}>
                💰 {userBalance.toLocaleString()}
              </div>
              {user.avatar && <img src={user.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--accent)' }} />}
            </div>
          )}
        </div>

        {/* Tab Switch */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
          <button className={`btn ${tab === 'store' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('store')}>🛒 المتجر</button>
          <button className={`btn ${tab === 'auction' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('auction')}>🏛️ المزادات</button>
          {!user && (
            <div className="info-box warning" style={{ marginRight: 'auto', padding: '6px 14px' }}>
              ⚠️ يجب تسجيل الدخول لإجراء عمليات الشراء
            </div>
          )}
        </div>
      </div>

      {!user ? (
        <div className="card" style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>يجب تسجيل الدخول</div>
          <div style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
            لمشاهدة الأسعار والشراء من المتجر وإجراء المزايدات تحتاج إلى تسجيل الدخول.
          </div>
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>تسجيل الدخول</a>
        </div>
      ) : tab === 'store' ? (
        <StorePage toast={toast} userBalance={userBalance} onBalanceUpdate={setUserBalance} />
      ) : (
        <AuctionPage toast={toast} userBalance={userBalance} onBalanceUpdate={setUserBalance} />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
