import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'

export default function RegisterPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (form.password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      nav('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>
          <span style={{ fontSize: 28 }}>🏗</span>
          <span style={styles.logoText}>4D BIM 建筑动画</span>
        </div>
        <h2 style={styles.title}>创建账户</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input className="form-control" placeholder="字母、数字、下划线" value={form.username} onChange={set('username')} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input className="form-control" type="email" placeholder="example@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input className="form-control" type="password" placeholder="至少 6 位" value={form.password} onChange={set('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input className="form-control" type="password" placeholder="再次输入密码" value={form.confirm} onChange={set('confirm')} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>
        <p style={styles.footer}>
          已有账户？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 16 },
  box: { width: 400, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 28px' },
  logoText: { fontSize: 18, fontWeight: 700, color: 'var(--accent)' },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 20, textAlign: 'center' },
  footer: { marginTop: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 },
}
