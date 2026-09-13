import React, { useEffect, useState } from 'react'
import { apiFetch } from '../auth'

const CATEGORIES = {
  all: '📦 الكل',
  electronics: '📱 الإلكترونيات',
  vehicles: '🚗 المركبات',
  realestate: '🏠 العقارات',
  tools: '🛡️ الأدوات',
  upgrades: '⬆️ التطويرات',
  other: '📦 أخرى',
}

export default function StorePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    apiFetch('/public/store').then(d => { if (d?.success) setItems(d.items); setLoading(false) })
  }, [])

  const handleBuy = async (item) => {
    if (!window.confirm(`هل أنت متأكد أنك تريد شراء ${item.name} مقابل ${item.price.toLocaleString()}؟`)) return;
    
    setBuying(item.id)
    try {
      const res = await apiFetch('/public/store/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id })
      });
      if (res && res.success) {
        alert(res.message + '\nرصيدك المتبقي: ' + res.newBalance.toLocaleString());
      } else {
        alert(res?.error || '❌ حدث خطأ أثناء الشراء');
      }
    } catch (err) {
      alert('❌ فشل الاتصال بالسيرفر');
    }
    setBuying(null)
  }

  const filtered = items.filter(item => {
    const matchCat = category === 'all' || item.category === category
    const matchSearch = !search || item.name.includes(search) || (item.description || '').includes(search)
    return matchCat && matchSearch
  })

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8 }}>متجر البوت</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>اشترِ أيتمات تُعزّز تجربتك في السيرفر</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <a href="/" className="btn btn-outline btn-sm">← الرئيسية</a>
          <a href="/auction" className="btn btn-gold btn-sm">🏛️ المزاد</a>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ maxWidth: 260, flex: 1 }}
          placeholder="🔍 ابحث عن أيتم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${category === key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <div>لا توجد أيتمات تطابق البحث</div>
        </div>
      ) : (
        <div className="store-grid">
          {filtered.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-body">
                <div className="item-emoji">{item.emoji}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-desc">{item.description || 'أيتم مميز'}</div>
                {item.duration && (
                  <div className="badge badge-blue" style={{ marginBottom: 10 }}>⏱️ {item.duration === 999 ? '♾️ دائم' : item.duration + ' أيام'}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 16 }}>
                  <div className="item-price">{(item.price || 0).toLocaleString()} <span>💰</span></div>
                  <div className="badge badge-blue" style={{ fontSize: 10 }}>
                    {CATEGORIES[item.category] || '📦'}
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => handleBuy(item)}
                  disabled={buying === item.id}
                >
                  {buying === item.id ? 'جاري الشراء...' : '🛒 شراء الآن'}
                </button>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
