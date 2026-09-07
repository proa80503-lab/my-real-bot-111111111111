import React, { useState } from 'react'

function Login({ onLogin }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })
      const data = await res.json()

      if (data.success) {
        onLogin(data.token)
      } else {
        setError(data.error || 'Invalid key')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="logo" style={{justifyContent: 'center', marginBottom: 20}}>
          <div className="logo-ico">🤖</div>
        </div>
        <h2>لوحة تحكم البوت</h2>
        
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-box">
            <input 
              type="password" 
              placeholder="Enter Dashboard Key" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn" style={{width: '100%', marginTop: 10}} disabled={loading}>
            {loading ? '...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
