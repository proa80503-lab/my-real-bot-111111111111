import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './index.css'

function App() {
  const [token, setToken] = useState(localStorage.getItem('dashboardToken'))

  useEffect(() => {
    // If token passed in URL (auto-login from Discord)
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('key');
    if (key) {
      // Auto login
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('dashboardToken', data.token);
          setToken(data.token);
          // Remove key from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })
      .catch(console.error);
    }
  }, []);

  const handleLogin = (newToken) => {
    localStorage.setItem('dashboardToken', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('dashboardToken')
    setToken(null)
  }

  return (
    <>
      {token ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
