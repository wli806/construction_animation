import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'

const TYPE_LABELS = {
  excavation: '挖掘', foundation: '基础', structure: '结构',
  walls: '墙体', roof: '屋顶', finishing: '装修', other: '其他',
}

export default function Dashboard() {
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', location: '', start_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const data = await api.projects.list()
      setProjects(data || [])
    } catch { /* handled by client */ }
    setLoading(false)
  }

  async function createProject(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const proj = await api.projects.create({
        ...form,
        start_date: form.start_date || null,
      })
      setShowModal(false)
      setForm({ name: '', description: '', location: '', start_date: '' })
      nav(`/projects/${proj.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id) {
    await api.projects.delete(id)
    setProjects(projects.filter(p => p.id !== id))
    setDeleteId(null)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    nav('/login')
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Topbar */}
      <div className="topbar">
        <span style={{ fontSize: 20 }}>🏗</span>
        <span className="topbar-title">4D BIM 建筑动画</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>👤 {user.username}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>退出</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>我的项目</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{projects.length} 个</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 新建项目</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>加载中...</div>
        ) : projects.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>还没有项目</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>创建你的第一个施工项目，开始 4D BIM 动画</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>新建项目</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map(p => (
              <div key={p.id} style={styles.card} onClick={() => nav(`/projects/${p.id}`)}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardIcon}>🏢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.cardName}>{p.name}</div>
                    {p.location && (
                      <div style={styles.cardSub}>📍 {p.location}</div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--red)', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); setDeleteId(p.id) }}
                  >✕</button>
                </div>
                {p.description && (
                  <div style={styles.cardDesc}>{p.description}</div>
                )}
                <div style={styles.cardMeta}>
                  <span className="badge badge-blue">{p.task_count || 0} 个任务</span>
                  {p.start_date && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>开工: {p.start_date}</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create project modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">新建施工项目</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="form-label">项目名称 *</label>
                <input className="form-control" placeholder="例：某小区 1 号楼" value={form.name} onChange={set('name')} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">项目地点</label>
                <input className="form-control" placeholder="例：上海市浦东新区" value={form.location} onChange={set('location')} />
              </div>
              <div className="form-group">
                <label className="form-label">计划开工日期</label>
                <input className="form-control" type="date" value={form.start_date} onChange={set('start_date')} />
              </div>
              <div className="form-group">
                <label className="form-label">项目说明</label>
                <textarea className="form-control" placeholder="可选..." value={form.description} onChange={set('description')} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '创建中...' : '创建项目'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ width: 360 }}>
            <div className="modal-title">确认删除</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>删除项目将同时删除所有施工任务，此操作不可恢复。</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => deleteProject(deleteId)}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  empty: {
    textAlign: 'center', padding: '80px 0',
    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
    borderRadius: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.1s',
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 24, lineHeight: 1 },
  cardName: { fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardSub: { fontSize: 12, color: 'var(--text-secondary)' },
  cardDesc: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
}
