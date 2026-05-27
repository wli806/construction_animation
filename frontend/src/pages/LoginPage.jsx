import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'

export default function LoginPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.login(form)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      nav('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏗</span>
          <span style={styles.logoText}>4D BIM 建筑动画</span>
        </div>
        <h2 style={styles.title}>登录账户</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              className="form-control"
              placeholder="请输入用户名"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="form-control"
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <p style={styles.footer}>
          还没有账户？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-base)', padding: 16,
  },
  box: {
    width: 380, background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '32px 28px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, justifyContent: 'center' },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 18, fontWeight: 700, color: 'var(--accent)' },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 20, textAlign: 'center', color: 'var(--text-primary)' },
  footer: { marginTop: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 },
}
